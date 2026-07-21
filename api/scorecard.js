// api/scorecard.js
// Read-only view into the prediction scorecard built by api/cron/snapshot.js.
// Uses the read-only Upstash token -- this endpoint can never write or delete data.
//
// Called by the frontend: GET /api/scorecard?series=cup

export const config = { runtime: "edge" };

import { redisRead, gradeKey, indexKey } from "../lib/redis.js";

const STAGES = ["post_race", "lineups", "post_quali"];

function emptyStageSummary() {
  return { graded: 0, winnerHits: 0, top5Hits: 0, brierSum: 0 };
}

export default async function handler(req) {
  const url = new URL(req.url);
  const seriesKey = url.searchParams.get("series") || "cup";

  try {
    // Most recent 20 race IDs for this series, newest first
    const raceIds = await redisRead.zrange(indexKey(seriesKey), 0, 19, { rev: true });

    const gradesRaw = await Promise.all(
      raceIds.map(id => redisRead.get(gradeKey(seriesKey, id)))
    );

    const races = [];
    const summary = { post_race: emptyStageSummary(), lineups: emptyStageSummary(), post_quali: emptyStageSummary() };

    gradesRaw.forEach(raw => {
      if (!raw) return;
      const grade = typeof raw === "string" ? JSON.parse(raw) : raw;
      races.push(grade);
      STAGES.forEach(stage => {
        const s = grade.stages?.[stage];
        if (!s) return;
        summary[stage].graded++;
        if (s.winnerHit) summary[stage].winnerHits++;
        if (s.top5Hit) summary[stage].top5Hits++;
        summary[stage].brierSum += s.brier || 0;
      });
    });

    const summaryOut = {};
    STAGES.forEach(stage => {
      const s = summary[stage];
      summaryOut[stage] = {
        graded: s.graded,
        winnerHitRate: s.graded ? parseFloat((s.winnerHits / s.graded * 100).toFixed(1)) : null,
        top5HitRate: s.graded ? parseFloat((s.top5Hits / s.graded * 100).toFixed(1)) : null,
        avgBrier: s.graded ? parseFloat((s.brierSum / s.graded).toFixed(3)) : null,
      };
    });

    return new Response(JSON.stringify({
      series: seriesKey,
      races,
      summary: summaryOut,
      asOf: new Date().toISOString(),
    }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=600",
        "Access-Control-Allow-Origin": "*",
      },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, series: seriesKey, races: [], summary: {} }), {
      status: 502,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
}
