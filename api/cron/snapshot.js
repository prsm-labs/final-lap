// api/cron/snapshot.js
// Runs on a schedule (see vercel.json) 3x/week per the "how close were we" scorecard
// design: Monday (post previous race), Wednesday (lineups confirmed), Saturday
// (post-qualifying). Each run:
//   1. Generates a prediction snapshot for the next upcoming race, at whichever
//      stage today represents, using the SAME shared sim engine (lib/sim.js) the
//      browser uses -- fed with live data pulled from this project's own API routes.
//   2. Grades any recently-completed races that have snapshots but no grade yet,
//      against their official results.
//
// Auth: Vercel automatically sends `Authorization: Bearer $CRON_SECRET` on requests
// it triggers via the vercel.json cron schedule, when CRON_SECRET is set as an env
// var. Manual/test invocations must send the same header.

export const config = { runtime: "edge" };

import { runSim, DRIVER_MANUFACTURERS } from "../../lib/sim.js";
import { redisWrite, predKey, gradeKey, indexKey } from "../../lib/redis.js";

const SERIES_LIST = ["cup", "xfin", "truck"];
const STAGES = ["post_race", "lineups", "post_quali"];

function currentStage(now) {
  const day = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short" }).format(now);
  if (day === "Mon") return "post_race";
  if (day === "Wed") return "lineups";
  if (day === "Sat") return "post_quali";
  return null;
}

// Simplified Brier score over the stored top-10 subset: drivers outside the top 10
// are treated as having ~0 predicted probability, which is a reasonable approximation
// since true win probabilities that far down the field are already negligible.
function brierScore(top10, actualWinner) {
  const winnerEntry = top10.find(d => d.name === actualWinner);
  const winnerProb = winnerEntry ? parseFloat(winnerEntry.winPct) / 100 : 0;
  let sum = Math.pow(winnerProb - 1, 2);
  top10.filter(d => d.name !== actualWinner).forEach(d => {
    sum += Math.pow(parseFloat(d.winPct) / 100 - 0, 2);
  });
  return parseFloat(sum.toFixed(4));
}

async function buildDriverPool(origin, series, race, stage) {
  const [standingsRes, recentFormRes, trendsRes] = await Promise.all([
    fetch(`${origin}/api/standings?series=${series}`).then(r => r.ok ? r.json() : null).catch(() => null),
    fetch(`${origin}/api/recentform?series=${series}`).then(r => r.ok ? r.json() : null).catch(() => null),
    fetch(`${origin}/api/tracktrends?series=${series}&date=${race.date}`).then(r => r.ok ? r.json() : null).catch(() => null),
  ]);

  let qualifying = null;
  if (stage === "post_quali") {
    const resultsRes = await fetch(`${origin}/api/results?series=${series}&date=${race.date}`).catch(() => null);
    if (resultsRes?.ok) qualifying = (await resultsRes.json()).qualifying;
  }

  const baseDrivers = standingsRes?.drivers?.length ? standingsRes.drivers : null;
  if (!baseDrivers) return null;

  return baseDrivers.map(d => {
    const scraped = trendsRes?.drivers?.[d.name];
    const form = recentFormRes?.drivers?.[d.name];
    const qualPos = qualifying?.find(q => q.name === d.name)?.pos;
    return {
      ...d,
      manufacturer: DRIVER_MANUFACTURERS[d.name],
      ...(scraped && scraped.starts > 0 ? { _liveHist: scraped } : {}),
      ...(form && form.length ? { last5: form } : {}),
      ...(qualPos ? { qualifyingPos: qualPos } : {}),
    };
  });
}

export default async function handler(req) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(req.url);
  const now = new Date();
  const stage = url.searchParams.get("stage") || currentStage(now); // allow manual override for testing
  const origin = `https://${req.headers.get("host")}`;
  const log = [];

  for (const series of SERIES_LIST) {
    try {
      const schedRes = await fetch(`${origin}/api/schedule?series=${series}`);
      if (!schedRes.ok) throw new Error(`schedule fetch failed: ${schedRes.status}`);
      const schedData = await schedRes.json();
      const nextRace = schedData.schedule.find(r => r.next);

      // -- 1. snapshot the upcoming race at today's stage --
      if (nextRace && stage) {
        const key = predKey(series, nextRace.id, stage);
        const already = await redisWrite.get(key);
        if (already) {
          log.push({ series, raceId: nextRace.id, stage, snapshot: "already exists" });
        } else {
          const drivers = await buildDriverPool(origin, series, nextRace, stage);
          if (drivers?.length) {
            const sim = runSim(nextRace, series, drivers);
            const snapshot = {
              series, raceId: nextRace.id, raceName: nextRace.name, raceDate: nextRace.date, stage,
              generatedAt: now.toISOString(),
              top10: sim.slice(0, 10).map(d => ({ name: d.name, winPct: d.winPct, score: parseFloat(d.score.toFixed(2)) })),
              picks: { standard: sim[0]?.name, darkHorse: sim[2]?.name },
            };
            await redisWrite.set(key, JSON.stringify(snapshot));
            await redisWrite.zadd(indexKey(series), { score: new Date(nextRace.date).getTime(), member: nextRace.id });
            log.push({ series, raceId: nextRace.id, stage, snapshot: "created" });
          } else {
            log.push({ series, raceId: nextRace.id, stage, snapshot: "skipped -- no live driver data" });
          }
        }
      }

      // -- 2. grade recently-completed races that have snapshots but no grade yet --
      const doneRaces = schedData.schedule.filter(r => r.done && !r.exhib).slice(-5);
      for (const race of doneRaces) {
        const gKey = gradeKey(series, race.id);
        if (await redisWrite.get(gKey)) continue;

        const snapsRaw = await Promise.all(STAGES.map(s => redisWrite.get(predKey(series, race.id, s))));
        if (snapsRaw.every(s => !s)) continue; // never predicted this race, nothing to grade

        const resultsRes = await fetch(`${origin}/api/results?series=${series}&date=${race.date}`);
        if (!resultsRes.ok) continue;
        const resultData = await resultsRes.json();
        if (!resultData.complete) continue;

        const actualWinner = resultData.winner;
        const actualTop5 = resultData.results.slice(0, 5).map(r => r.name);

        const grade = { series, raceId: race.id, raceName: race.name, winner: actualWinner, gradedAt: now.toISOString(), stages: {} };
        STAGES.forEach((s, i) => {
          const raw = snapsRaw[i];
          if (!raw) return;
          const snap = typeof raw === "string" ? JSON.parse(raw) : raw;
          grade.stages[s] = {
            pick: snap.picks?.standard || null,
            winnerHit: snap.picks?.standard === actualWinner,
            top5Hit: actualTop5.includes(snap.picks?.standard),
            brier: brierScore(snap.top10, actualWinner),
          };
        });
        await redisWrite.set(gKey, JSON.stringify(grade));
        log.push({ series, raceId: race.id, graded: true, winner: actualWinner });
      }

    } catch (err) {
      log.push({ series, error: err.message });
    }
  }

  return new Response(JSON.stringify({ ranAt: now.toISOString(), stage, log }), {
    headers: { "Content-Type": "application/json" },
  });
}
