// api/trackhistory.js
// Scrapes per-driver, per-track recent stats (2023-2026) from:
//   - racing-reference.info  → finish positions, laps led, DNFs
//   - driveraverages.com     → rolling averages, recent form at track
//
// Called by the frontend: GET /api/trackhistory?track=Pocono+Raceway&series=cup&years=3
// Cached at Vercel edge for 24 hours (data only changes after race weekends)

export const config = { runtime: "edge" };

// ── TRACK SLUG MAP ─────────────────────────────────────────────────────────
// Maps our internal track IDs to Racing-Reference track slugs
const RR_TRACK_SLUGS = {
  // Cup / All series
  "Daytona International Speedway":   "Daytona_International_Speedway",
  "EchoPark Speedway":                "EchoPark_Speedway",
  "Circuit of the Americas":          "Circuit_of_the_Americas",
  "Phoenix Raceway":                  "Phoenix_Raceway",
  "Las Vegas Motor Speedway":         "Las_Vegas_Motor_Speedway",
  "Homestead-Miami Speedway":         "Homestead-Miami_Speedway",
  "Martinsville Speedway":            "Martinsville_Speedway",
  "Richmond Raceway":                 "Richmond_Raceway",
  "Bristol Motor Speedway":           "Bristol_Motor_Speedway",
  "Talladega Superspeedway":          "Talladega_Superspeedway",
  "Dover Motor Speedway":             "Dover_Motor_Speedway",
  "North Wilkesboro Speedway":        "North_Wilkesboro_Speedway",
  "Charlotte Motor Speedway":         "Charlotte_Motor_Speedway",
  "Nashville Superspeedway":          "Nashville_Superspeedway",
  "Michigan International Speedway":  "Michigan_International_Speedway",
  "Pocono Raceway":                   "Pocono_Raceway",
  "Sonoma Raceway":                   "Sonoma_Raceway",
  "Chicago Street Course":            "Chicago_Street_Course",
  "Iowa Speedway":                    "Iowa_Speedway",
  "New Hampshire Motor Speedway":     "New_Hampshire_Motor_Speedway",
  "Indianapolis Motor Speedway":      "Indianapolis_Motor_Speedway",
  "Watkins Glen International":       "Watkins_Glen_International",
  "Darlington Raceway":               "Darlington_Raceway",
  "World Wide Technology Raceway":    "World_Wide_Technology_Raceway",
  "Kansas Speedway":                  "Kansas_Speedway",
  "Charlotte Motor Speedway Road":    "Charlotte_Motor_Speedway",
  "Bowman Gray Stadium":              "Bowman_Gray_Stadium",
};

// DriverAverages uses driver name slugs (first initial + last name)
function daSlug(name) {
  const parts = name.trim().split(" ");
  if (parts.length < 2) return name.toLowerCase().replace(/\s+/g, "_");
  return (parts[0][0] + parts.slice(1).join("")).toLowerCase().replace(/[^a-z]/g, "");
}

// Racing-Reference driver query ID format: last6 + first2 + 01
// e.g. "Tyler Reddick" → "reddicd01" (typo-prone; use name search instead)
// Better: use their driver search URL
function rrDriverUrl(driverName, trackSlug, series = "W") {
  // RR track driver stats page — returns HTML table of all finishes at this track
  const enc = encodeURIComponent(driverName);
  return `https://www.racing-reference.info/driver-stats-at-track/?driver=${enc}&track=${trackSlug}&series=${series}`;
}

function daDriverUrl(driverName, trackSlug) {
  // DriverAverages track-specific page
  const slug = daSlug(driverName);
  return `https://www.driveraverages.com/nascar_NASCARq.php?sked_id=0&trk_id=0&drv_id=${slug}`;
}

const SERIES_CODE = { cup: "W", xfin: "X", truck: "T" };
const CURRENT_YEAR = 2026;
const MIN_YEAR = CURRENT_YEAR - 3; // 2023–2026

// ── PARSERS ────────────────────────────────────────────────────────────────

// Parse Racing-Reference HTML table into structured finish data
function parseRRTable(html, trackSlug) {
  const rows = [];
  // Match table rows containing year, finish position, laps led
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const cellRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;

  let rowMatch;
  while ((rowMatch = rowRe.exec(html)) !== null) {
    const rowHtml = rowMatch[1];
    const cells = [];
    let cellMatch;
    const cellReCopy = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
    while ((cellMatch = cellReCopy.exec(rowHtml)) !== null) {
      cells.push(cellMatch[1].replace(/<[^>]+>/g, "").trim());
    }
    if (cells.length >= 4) {
      const year = parseInt(cells[0]);
      if (!isNaN(year) && year >= MIN_YEAR && year <= CURRENT_YEAR) {
        const finish = parseInt(cells[2]) || parseInt(cells[3]);
        const lapsLed = parseInt(cells.find(c => /^\d+$/.test(c) && parseInt(c) < 500) || "0");
        if (!isNaN(finish) && finish > 0 && finish <= 50) {
          rows.push({ year, finish, lapsLed: isNaN(lapsLed) ? 0 : lapsLed });
        }
      }
    }
  }
  return rows;
}

// Compute stats from an array of finish results
function computeStats(finishes) {
  if (!finishes.length) return null;
  const sorted = finishes.slice().sort((a, b) => a.finish - b.finish);
  const wins   = finishes.filter(f => f.finish === 1).length;
  const top3   = finishes.filter(f => f.finish <= 3).length;
  const top5   = finishes.filter(f => f.finish <= 5).length;
  const top10  = finishes.filter(f => f.finish <= 10).length;
  const top20  = finishes.filter(f => f.finish <= 20).length;
  const dnfs   = finishes.filter(f => f.finish >= 35).length;
  const avgFin = (finishes.reduce((s, f) => s + f.finish, 0) / finishes.length).toFixed(1);
  const totalLapsLed = finishes.reduce((s, f) => s + (f.lapsLed || 0), 0);

  // Aptitude score 1-10 based on recent performance
  const winRate  = wins  / finishes.length;
  const top5Rate = top5  / finishes.length;
  const top10Rate= top10 / finishes.length;
  const avgScore = Math.max(0, (35 - parseFloat(avgFin)) / 35);
  const apt = Math.min(10, Math.round(
    (winRate * 4 + top5Rate * 3 + top10Rate * 2 + avgScore) * 10 + 1
  ));

  return {
    starts: finishes.length,
    wins, top3, top5, top10, top20, dnfs,
    avg: parseFloat(avgFin),
    totalLapsLed,
    apt: Math.max(1, Math.min(10, apt)),
    recentFinishes: finishes.slice(-4).map(f => f.finish), // last 4 finishes for sparkline
    yearRange: `${MIN_YEAR}–${CURRENT_YEAR}`,
  };
}

// ── MAIN HANDLER ───────────────────────────────────────────────────────────
export default async function handler(req) {
  const url    = new URL(req.url);
  const track  = url.searchParams.get("track") || "Pocono Raceway";
  const series = url.searchParams.get("series") || "cup";
  const drivers= url.searchParams.get("drivers")?.split(",") || [];

  const trackSlug = RR_TRACK_SLUGS[track];
  const seriesCode= SERIES_CODE[series] || "W";

  if (!trackSlug) {
    return new Response(JSON.stringify({
      error: `Track not mapped: "${track}"`,
      availableTracks: Object.keys(RR_TRACK_SLUGS),
    }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  if (!drivers.length) {
    return new Response(JSON.stringify({ error: "No drivers specified" }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  const results = {};
  const errors  = [];

  // Fetch each driver's track history — batch with Promise.allSettled
  const fetches = drivers.map(async (driverName) => {
    try {
      const rrUrl = rrDriverUrl(driverName, trackSlug, seriesCode);

      const res = await fetch(rrUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Referer": "https://www.racing-reference.info/",
        },
        // 5 second timeout per driver
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) {
        errors.push({ driver: driverName, error: `HTTP ${res.status}` });
        return;
      }

      const html = await res.text();
      const finishes = parseRRTable(html, trackSlug);

      if (finishes.length === 0) {
        // No data found — driver has no starts at this track in the window
        results[driverName] = { starts: 0, noData: true };
        return;
      }

      results[driverName] = computeStats(finishes);
    } catch (err) {
      errors.push({ driver: driverName, error: err.message });
    }
  });

  await Promise.allSettled(fetches);

  // Try DriverAverages.com as a secondary source for drivers that came back empty
  const emptyDrivers = drivers.filter(d => !results[d] || results[d]?.noData);
  if (emptyDrivers.length > 0) {
    // DA scrape — their track filter page
    for (const driverName of emptyDrivers.slice(0, 5)) { // cap at 5 to avoid timeout
      try {
        const daUrl = `https://www.driveraverages.com/nascar_NASCARq.php?sked_id=0&trk_id=0&drv_id=${daSlug(driverName)}`;
        const res = await fetch(daUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Referer": "https://www.driveraverages.com/",
          },
          signal: AbortSignal.timeout(4000),
        });
        if (res.ok) {
          // DA returns HTML — parse for track-specific rows
          const html = await res.text();
          // Look for rows containing our track name
          const trackPattern = new RegExp(trackSlug.replace(/_/g, "[_ ]"), "i");
          const finishes = [];
          const rowRe2 = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
          let rm;
          while ((rm = rowRe2.exec(html)) !== null) {
            if (!trackPattern.test(rm[1])) continue;
            const cells = rm[1].match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)
              ?.map(c => c.replace(/<[^>]+>/g, "").trim()) || [];
            const year = parseInt(cells[0]);
            const finish = parseInt(cells.find((c, i) => i > 1 && /^\d{1,2}$/.test(c)));
            if (!isNaN(year) && year >= MIN_YEAR && !isNaN(finish)) {
              finishes.push({ year, finish, lapsLed: 0 });
            }
          }
          if (finishes.length > 0) {
            results[driverName] = { ...computeStats(finishes), source: "driveraverages" };
          }
        }
      } catch { /* silent */ }
    }
  }

  return new Response(JSON.stringify({
    track,
    trackSlug,
    series,
    yearRange: `${MIN_YEAR}–${CURRENT_YEAR}`,
    drivers: results,
    errors: errors.length > 0 ? errors : undefined,
    asOf: new Date().toISOString(),
    sources: ["racing-reference.info", "driveraverages.com"],
  }), {
    headers: {
      "Content-Type": "application/json",
      // Cache 24h at edge — only refreshes after race weekends anyway
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
