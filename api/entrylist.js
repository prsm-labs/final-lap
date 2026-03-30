// api/entrylist.js
// Fetches the entry list for the next/upcoming race from NASCAR's CF API
// Returns car number, driver, team for each entered car
// Cache: 12 hours (entry lists don't change much mid-week, but update Thu/Fri)

export const config = { runtime: "edge" };

const SERIES_MAP = { cup: 1, xfin: 2, truck: 3 };

async function fetchNextRaceId(seriesId) {
  const res = await fetch(
    `https://cf.nascar.com/cacher/2026/race_list_basic.json`,
    { headers: { "User-Agent": "Mozilla/5.0 (compatible; FinalLap/1.0)" } }
  );
  if (!res.ok) throw new Error("Could not fetch race list");
  const data = await res.json();
  const today = new Date().toISOString().substring(0, 10);
  const upcoming = data
    .filter(r => r.series_id === seriesId && r.race_date >= today)
    .sort((a, b) => a.race_date.localeCompare(b.race_date));
  return upcoming[0]?.race_id || null;
}

export default async function handler(req) {
  const url = new URL(req.url);
  const seriesKey = url.searchParams.get("series") || "cup";
  const seriesId = SERIES_MAP[seriesKey] || 1;

  try {
    const raceId = await fetchNextRaceId(seriesId);
    if (!raceId) {
      return new Response(JSON.stringify({ entries: [], message: "No upcoming race found" }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const entryRes = await fetch(
      `https://cf.nascar.com/cacher/2026/${raceId}/entry-list.json`,
      { headers: { "User-Agent": "Mozilla/5.0 (compatible; FinalLap/1.0)" } }
    );

    if (!entryRes.ok) throw new Error(`Entry list API returned ${entryRes.status}`);
    const raw = await entryRes.json();

    const entries = (raw.response || raw || []).map(e => ({
      num: e.CarNumber || e.car_number || "—",
      name: `${e.FirstName || ""} ${e.LastName || ""}`.trim() || e.driver_name || "TBD",
      team: e.TeamName || e.team_name || "Independent",
      make: e.Manufacturer || e.make || "",
    }));

    return new Response(JSON.stringify({
      raceId,
      series: seriesKey,
      entries,
      count: entries.length,
      asOf: new Date().toISOString(),
    }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=43200, stale-while-revalidate=3600",
        "Access-Control-Allow-Origin": "*",
      },
    });

  } catch (err) {
    return new Response(JSON.stringify({
      entries: [],
      error: err.message,
      fallback: true,
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
