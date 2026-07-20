// api/results.js
// Fetches official post-race results from NASCAR's live-timing feed (cf.nascar.com)
// and returns the winner + full finishing order for a given race.
// Called by the frontend: GET /api/results?series=cup&date=2026-07-19
//
// This is the same "cacher" endpoint family used by api/standings.js and
// api/entrylist.js. race_list_basic.json exposes winner_driver_id once a race
// is official; weekend-feed.json then has the full results[] array with
// finishing_position, driver_fullname, car_number, team_name, car_make (manufacturer),
// laps_led, and finishing_status.

export const config = { runtime: "edge" };

const SERIES_MAP = { cup: 1, xfin: 2, truck: 3 };

async function fetchRaceMeta(seriesId, date) {
  const res = await fetch(`https://cf.nascar.com/cacher/2026/race_list_basic.json`, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; FinalLap/1.0)" },
  });
  if (!res.ok) throw new Error(`race list HTTP ${res.status}`);
  const data = await res.json();
  const races = data[`series_${seriesId}`] || [];
  return races.find(r => r.race_date?.startsWith(date)) || null;
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
    const raceMeta = await fetchRaceMeta(seriesId, date);

    if (!raceMeta) {
      return new Response(JSON.stringify({ complete: false, winner: null, results: [], message: "Race not found in NASCAR schedule feed" }), {
        headers: { "Content-Type": "application/json", "Cache-Control": "public, s-maxage=300", "Access-Control-Allow-Origin": "*" },
      });
    }

    if (!raceMeta.winner_driver_id) {
      // Race hasn't run yet, or results aren't official yet
      return new Response(JSON.stringify({ raceId: raceMeta.race_id, complete: false, winner: null, results: [] }), {
        headers: { "Content-Type": "application/json", "Cache-Control": "public, s-maxage=300", "Access-Control-Allow-Origin": "*" },
      });
    }

    const feedRes = await fetch(`https://cf.nascar.com/cacher/2026/${seriesId}/${raceMeta.race_id}/weekend-feed.json`, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; FinalLap/1.0)" },
    });
    if (!feedRes.ok) throw new Error(`weekend-feed HTTP ${feedRes.status}`);
    const feed = await feedRes.json();
    const race = feed.weekend_race?.[0];
    const raw = race?.results || [];

    const results = raw
      .slice()
      .sort((a, b) => a.finishing_position - b.finishing_position)
      .map(r => ({
        pos: r.finishing_position,
        name: r.driver_fullname,
        num: r.car_number,
        team: r.team_name,
        manufacturer: r.car_make,
        startPos: r.starting_position,
        lapsLed: r.laps_led,
        status: r.finishing_status,
        points: r.points_earned,
      }));

    return new Response(JSON.stringify({
      raceId: raceMeta.race_id,
      raceName: race?.race_name || raceMeta.race_name,
      complete: true,
      winner: results[0]?.name || null,
      results,
      recap: race?.race_comments || null,
      asOf: new Date().toISOString(),
    }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=600",
        "Access-Control-Allow-Origin": "*",
      },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, complete: false, winner: null, results: [] }), {
      status: 502,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
}
