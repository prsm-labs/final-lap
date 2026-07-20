// api/recentform.js
// Builds real recent-form data (last 5 finishes per driver) from NASCAR's official
// results feed -- replaces hand-maintained last5 arrays. Used by runSim()'s
// recentFormMultiplier() so "hot streak" momentum is sourced from actual results,
// not fiction.
//
// Called by the frontend: GET /api/recentform?series=cup

export const config = { runtime: "edge" };

const SERIES_MAP = { cup: 1, xfin: 2, truck: 3 };

export default async function handler(req) {
  const url = new URL(req.url);
  const seriesKey = url.searchParams.get("series") || "cup";
  const seriesId = SERIES_MAP[seriesKey] || 1;

  try {
    const listRes = await fetch(`https://cf.nascar.com/cacher/2026/race_list_basic.json`, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; FinalLap/1.0)" },
    });
    if (!listRes.ok) throw new Error(`race list HTTP ${listRes.status}`);
    const listData = await listRes.json();

    // Last 5 completed races (winner_driver_id set), most recent first
    const races = (listData[`series_${seriesId}`] || [])
      .filter(r => r.winner_driver_id)
      .sort((a, b) => new Date(b.race_date) - new Date(a.race_date))
      .slice(0, 5);

    if (!races.length) {
      return new Response(JSON.stringify({ series: seriesKey, drivers: {}, racesUsed: [] }), {
        headers: { "Content-Type": "application/json", "Cache-Control": "public, s-maxage=1800", "Access-Control-Allow-Origin": "*" },
      });
    }

    const feeds = await Promise.all(races.map(r =>
      fetch(`https://cf.nascar.com/cacher/2026/${seriesId}/${r.race_id}/weekend-feed.json`, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; FinalLap/1.0)" },
      }).then(res => res.ok ? res.json() : null).catch(() => null)
    ));

    // Oldest -> newest, so recentFormMultiplier's index-based weighting (most recent = 2x) is correct
    const orderedFeeds = feeds.slice().reverse();
    const perDriver = {};
    orderedFeeds.forEach(feed => {
      const results = feed?.weekend_race?.[0]?.results || [];
      results.forEach(r => {
        if (!r.driver_fullname) return;
        if (!perDriver[r.driver_fullname]) perDriver[r.driver_fullname] = [];
        perDriver[r.driver_fullname].push(r.finishing_position);
      });
    });
    Object.keys(perDriver).forEach(name => { perDriver[name] = perDriver[name].slice(-5); });

    return new Response(JSON.stringify({
      series: seriesKey,
      racesUsed: races.slice().reverse().map(r => ({ id: r.race_id, name: r.race_name, date: r.race_date })),
      drivers: perDriver,
      asOf: new Date().toISOString(),
    }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=3600",
        "Access-Control-Allow-Origin": "*",
      },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, series: seriesKey, drivers: {}, racesUsed: [] }), {
      status: 502,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
}
