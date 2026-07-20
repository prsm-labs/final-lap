// api/tracktrends.js
// Real per-track driver history, computed from NASCAR's official results feed
// (cf.nascar.com/cacher) instead of a hand-typed table or scraped HTML. Resolves
// the target race's track_id, then aggregates every driver's finish across all
// completed races at that track_id from 2023-2026.
//
// This is a structured-data replacement for api/trackhistory.js (racing-reference.info
// scraping) -- left untouched per the original "do not modify" instruction, just no
// longer the frontend's live source.
//
// Called by the frontend: GET /api/tracktrends?series=cup&date=2026-07-19

export const config = { runtime: "edge" };

const SERIES_MAP = { cup: 1, xfin: 2, truck: 3 };
const YEARS = [2023, 2024, 2025, 2026];

async function fetchRaceList(year) {
  const res = await fetch(`https://cf.nascar.com/cacher/${year}/race_list_basic.json`, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; FinalLap/1.0)" },
  });
  if (!res.ok) return null;
  return res.json();
}

export default async function handler(req) {
  const url = new URL(req.url);
  const seriesKey = url.searchParams.get("series") || "cup";
  const date = url.searchParams.get("date");
  const seriesId = SERIES_MAP[seriesKey] || 1;

  if (!date) {
    return new Response(JSON.stringify({ error: "Missing date (YYYY-MM-DD)" }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  try {
    const currentList = await fetchRaceList(2026);
    if (!currentList) throw new Error("could not load 2026 race list");
    const target = (currentList[`series_${seriesId}`] || []).find(r => r.race_date?.startsWith(date));
    if (!target) {
      return new Response(JSON.stringify({ trackId: null, drivers: {}, racesUsed: [], message: "Race not found in NASCAR schedule feed" }), {
        headers: { "Content-Type": "application/json", "Cache-Control": "public, s-maxage=300", "Access-Control-Allow-Origin": "*" },
      });
    }
    const trackId = target.track_id;

    const lists = await Promise.all(YEARS.map(fetchRaceList));
    const historicalRaces = [];
    lists.forEach(list => {
      if (!list) return;
      (list[`series_${seriesId}`] || []).forEach(r => {
        if (r.track_id === trackId && r.winner_driver_id && r.race_id !== target.race_id) {
          historicalRaces.push(r);
        }
      });
    });
    historicalRaces.sort((a, b) => new Date(a.race_date) - new Date(b.race_date));
    const recent = historicalRaces.slice(-8); // bound fetch count

    if (!recent.length) {
      return new Response(JSON.stringify({ trackId, trackName: target.track_name, drivers: {}, racesUsed: [], message: "No completed history at this track yet" }), {
        headers: { "Content-Type": "application/json", "Cache-Control": "public, s-maxage=86400", "Access-Control-Allow-Origin": "*" },
      });
    }

    const feeds = await Promise.all(recent.map(r =>
      fetch(`https://cf.nascar.com/cacher/${r.race_season}/${seriesId}/${r.race_id}/weekend-feed.json`, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; FinalLap/1.0)" },
      }).then(res => res.ok ? res.json() : null).catch(() => null)
    ));

    const perDriver = {};
    feeds.forEach(feed => {
      const results = feed?.weekend_race?.[0]?.results || [];
      results.forEach(r => {
        const name = r.driver_fullname;
        if (!name) return;
        if (!perDriver[name]) perDriver[name] = { starts: 0, wins: 0, top3: 0, top5: 0, top10: 0, top20: 0, sumFinish: 0, recentFinishes: [] };
        const p = perDriver[name];
        const pos = r.finishing_position;
        p.starts++; p.sumFinish += pos;
        if (pos <= 1) p.wins++;
        if (pos <= 3) p.top3++;
        if (pos <= 5) p.top5++;
        if (pos <= 10) p.top10++;
        if (pos <= 20) p.top20++;
        p.recentFinishes.push(pos);
      });
    });

    const drivers = {};
    Object.entries(perDriver).forEach(([name, p]) => {
      const avg = p.starts ? p.sumFinish / p.starts : 25;
      const winRate = p.wins / Math.max(p.starts, 1);
      const top5Rate = p.top5 / Math.max(p.starts, 1);
      const top10Rate = p.top10 / Math.max(p.starts, 1);
      const avgScore = Math.max(0, (35 - avg) / 35);
      const apt = Math.max(1, Math.min(10, Math.round((winRate * 4 + top5Rate * 3 + top10Rate * 2 + avgScore) * 10 + 1)));
      drivers[name] = {
        apt, starts: p.starts, wins: p.wins, top3: p.top3, top5: p.top5, top10: p.top10, top20: p.top20,
        avg: parseFloat(avg.toFixed(1)),
        recentFinishes: p.recentFinishes.slice(-4),
      };
    });

    return new Response(JSON.stringify({
      trackId,
      trackName: target.track_name,
      series: seriesKey,
      racesUsed: recent.map(r => ({ id: r.race_id, name: r.race_name, date: r.race_date, season: r.race_season })),
      drivers,
      asOf: new Date().toISOString(),
    }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600",
        "Access-Control-Allow-Origin": "*",
      },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, trackId: null, drivers: {}, racesUsed: [] }), {
      status: 502,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
}
