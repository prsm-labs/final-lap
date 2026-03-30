// api/standings.js
// Fetches live 2026 standings from NASCAR's official stats API
// Vercel caches the response for 6 hours (s-maxage=21600)
// Falls back to last known data if fetch fails

export const config = { runtime: "edge" };

const SERIES_IDS = {
  cup:   "nascar-cup-series",
  xfin:  "nascar-oreilly-auto-parts-series",
  truck: "nascar-craftsman-truck-series",
};

// NASCAR Stats API - publicly accessible, no auth required
const NASCAR_STANDINGS_URL = (seriesId) =>
  `https://cf.nascar.com/cacher/2026/1/standings/${seriesId}/driver-standings.json`;

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
  const seriesId = SERIES_IDS[seriesKey] || SERIES_IDS.cup;

  try {
    const res = await fetch(NASCAR_STANDINGS_URL(seriesId), {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; FinalLap/1.0)" },
      cf: { cacheTtl: 21600 }, // Cloudflare edge cache: 6 hours
    });

    if (!res.ok) throw new Error(`NASCAR API returned ${res.status}`);
    const raw = await res.json();

    // NASCAR CF endpoint returns { response: [ ...drivers ] }
    const driverList = raw.response || raw;

    const drivers = driverList.slice(0, 36).map((d, i) => {
      const name = `${d.FirstName} ${d.LastName}`.trim();
      const ratings = STATIC_RATINGS[name] || { skill:70, spd:162.0, aero:6, chaosAvoid:6 };
      const pos = d.PointsPosition || i + 1;
      const pts = d.Points || 0;
      const wins = d.Wins || 0;
      return {
        pos,
        name,
        num: d.CarNumber || "00",
        team: d.TeamName || "Independent",
        pts,
        wins,
        mom: calcMomentum(pts, wins, pos, driverList.length),
        ...ratings,
        rookie: d.IsRookie || false,
      };
    });

    return new Response(JSON.stringify({
      series: seriesKey,
      drivers,
      asOf: new Date().toISOString(),
      source: "nascar.com/cf",
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
