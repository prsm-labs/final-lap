// api/standings.js
// Computes live 2026 standings by summing points_earned across every completed race's
// weekend-feed.json (same reliable cf.nascar.com data source used by results.js,
// recentform.js, and tracktrends.js). Previously this hit a dedicated "standings" URL
// that turned out to be genuinely broken (S3 AccessDenied, not rate-limiting) --
// silently masked for a long time because the frontend gracefully falls back to
// cached data on any failure, so nobody noticed until the cron job (which has no
// such fallback) surfaced it immediately on its first real run.
// Vercel caches the response for 6 hours (s-maxage=21600)
// Falls back to last known data if fetch fails

export const config = { runtime: "edge" };

const SERIES_NUM = { cup: 1, xfin: 2, truck: 3 };

async function computeStandings(seriesKey) {
  const seriesId = SERIES_NUM[seriesKey] || 1;
  const listRes = await fetch(`https://cf.nascar.com/cacher/2026/race_list_basic.json`, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; FinalLap/1.0)" },
  });
  if (!listRes.ok) throw new Error(`race list HTTP ${listRes.status}`);
  const listData = await listRes.json();
  const races = (listData[`series_${seriesId}`] || []).filter(r => r.winner_driver_id);
  if (!races.length) return [];

  const feeds = await Promise.all(races.map(r =>
    fetch(`https://cf.nascar.com/cacher/2026/${seriesId}/${r.race_id}/weekend-feed.json`, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; FinalLap/1.0)" },
    }).then(res => res.ok ? res.json() : null).catch(() => null)
  ));

  const totals = {}; // driver name -> { pts, wins, num, team, lastDate }
  races.forEach((race, i) => {
    const results = feeds[i]?.weekend_race?.[0]?.results || [];
    results.forEach(r => {
      const name = r.driver_fullname;
      if (!name) return;
      if (!totals[name]) totals[name] = { pts: 0, wins: 0, num: r.car_number, team: r.team_name, rookie: false, lastDate: race.race_date };
      totals[name].pts += r.points_earned || 0;
      if (r.finishing_position === 1) totals[name].wins++;
      if (race.race_date >= totals[name].lastDate) {
        totals[name].num = r.car_number;
        totals[name].team = r.team_name;
        totals[name].lastDate = race.race_date;
      }
    });
  });

  return Object.entries(totals)
    .map(([name, t]) => ({ name, pts: t.pts, wins: t.wins, num: t.num, team: t.team }))
    .sort((a, b) => b.pts - a.pts);
}

// Skill/chaos ratings stay static — these are scout judgments, not live data
const STATIC_RATINGS = {
  "Tyler Reddick":      { skill:94, spd:169.2, aero:9, chaosAvoid:8 },
  "Ryan Blaney":        { skill:87, spd:166.8, aero:8, chaosAvoid:9 },
  "Bubba Wallace":      { skill:80, spd:165.1, aero:7, chaosAvoid:6 },
  "Denny Hamlin":       { skill:89, spd:166.5, aero:8, chaosAvoid:8 },
  "Chase Elliott":      { skill:91, spd:166.2, aero:8, chaosAvoid:9 },
  "William Byron":      { skill:88, spd:165.9, aero:8, chaosAvoid:8 },
  "Chris Buescher":     { skill:79, spd:165.0, aero:7, chaosAvoid:7 },
  "Brad Keselowski":    { skill:83, spd:165.4, aero:7, chaosAvoid:7 },
  "Christopher Bell":   { skill:86, spd:165.7, aero:7, chaosAvoid:8 },
  "Kyle Larson":        { skill:93, spd:167.1, aero:9, chaosAvoid:7 },
  "Ty Gibbs":           { skill:81, spd:164.8, aero:7, chaosAvoid:7 },
  "Ryan Preece":        { skill:75, spd:163.5, aero:6, chaosAvoid:6 },
  "Carson Hocevar":     { skill:74, spd:163.2, aero:6, chaosAvoid:5 },
  "Daniel Suárez":      { skill:76, spd:163.4, aero:6, chaosAvoid:6 },
  "Ross Chastain":      { skill:82, spd:164.5, aero:7, chaosAvoid:4 },
  "Joey Logano":        { skill:82, spd:164.3, aero:7, chaosAvoid:7 },
  "Michael McDowell":   { skill:73, spd:162.1, aero:5, chaosAvoid:6 },
  "Austin Cindric":     { skill:77, spd:163.8, aero:7, chaosAvoid:7 },
  "Connor Zilisch":     { skill:79, spd:163.6, aero:7, chaosAvoid:6 },
  "Kyle Busch":         { skill:84, spd:164.0, aero:7, chaosAvoid:6 },
  "Austin Dillon":      { skill:72, spd:162.0, aero:5, chaosAvoid:5 },
  "Noah Gragson":       { skill:71, spd:161.8, aero:5, chaosAvoid:5 },
  "Justin Allgaier":    { skill:90, spd:163.5, aero:8, chaosAvoid:9 },
  "Sam Mayer":          { skill:84, spd:162.1, aero:7, chaosAvoid:8 },
  "Brandon Jones":      { skill:83, spd:161.8, aero:7, chaosAvoid:8 },
  "Taylor Gray":        { skill:81, spd:161.5, aero:7, chaosAvoid:7 },
  "William Sawalich":   { skill:79, spd:161.0, aero:7, chaosAvoid:7 },
  "Riley Herbst":       { skill:77, spd:160.5, aero:6, chaosAvoid:6 },
  "Rajah Caruth":       { skill:76, spd:160.2, aero:6, chaosAvoid:7 },
  "Harrison Burton":    { skill:78, spd:160.0, aero:6, chaosAvoid:7 },
  "Chandler Smith":     { skill:89, spd:158.2, aero:8, chaosAvoid:8 },
  "Kaden Honeycutt":    { skill:85, spd:170.5, aero:8, chaosAvoid:7 },
  "Layne Riggs":        { skill:82, spd:157.5, aero:7, chaosAvoid:7 },
  "Gio Ruggiero":       { skill:80, spd:157.0, aero:7, chaosAvoid:7 },
  "Ty Majeski":         { skill:82, spd:157.3, aero:7, chaosAvoid:8 },
  "Christian Eckes":    { skill:80, spd:156.8, aero:7, chaosAvoid:7 },
  "Ben Rhodes":         { skill:80, spd:156.5, aero:7, chaosAvoid:8 },
  "Corey Heim":         { skill:91, spd:159.1, aero:9, chaosAvoid:9 },
  "Todd Gilliland":     { skill:74, spd:163.0, aero:6, chaosAvoid:6 },
  "Corey Day":          { skill:85, spd:162.0, aero:7, chaosAvoid:7 },
  "Grant Enfinger":     { skill:79, spd:157.0, aero:7, chaosAvoid:7 },
  "Carson Kvapil":      { skill:80, spd:161.5, aero:7, chaosAvoid:7 },
};

function calcMomentum(pts, wins, pos, totalDrivers) {
  // Momentum = weighted combo of points position + win rate
  // Top of standings + wins = high momentum
  const posScore = ((totalDrivers - pos + 1) / totalDrivers) * 60;
  const winBonus = Math.min(wins * 12, 35);
  return Math.round(Math.min(posScore + winBonus + 2, 99));
}

export default async function handler(req) {
  const url = new URL(req.url);
  const seriesKey = url.searchParams.get("series") || "cup";

  try {
    const ranked = await computeStandings(seriesKey);
    if (!ranked.length) throw new Error("no completed races found for this series");

    const drivers = ranked.map((d, i) => {
      const pos = i + 1;
      const ratings = STATIC_RATINGS[d.name] || { skill:70, spd:162.0, aero:6, chaosAvoid:6 };
      return {
        pos,
        name: d.name,
        num: d.num || "00",
        team: d.team || "Independent",
        pts: d.pts,
        wins: d.wins,
        mom: calcMomentum(d.pts, d.wins, pos, ranked.length),
        ...ratings,
        rookie: false,
      };
    });

    return new Response(JSON.stringify({
      series: seriesKey,
      drivers,
      asOf: new Date().toISOString(),
      source: "cf.nascar.com (computed from race results)",
    }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=3600",
        "Access-Control-Allow-Origin": "*",
      },
    });

  } catch (err) {
    return new Response(JSON.stringify({
      error: err.message,
      fallback: true,
      message: "Live standings unavailable — app will use cached data",
    }), {
      status: 502,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=300",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}
