// api/schedule.js
// Fetches the 2026 NASCAR schedule and auto-marks done/next based on today's date
// No scraping needed — NASCAR's CF cache API has schedule data

export const config = { runtime: "edge" };

const NASCAR_SCHEDULE_URL = (seriesId) =>
  `https://cf.nascar.com/cacher/2026/race_list_basic.json`;

// Full 2026 schedule with static track metadata
// "done" and "next" are computed dynamically from today's date at runtime
const SCHEDULE_BASE = {
  cup: [
    { id:"daytona",      name:"Daytona 500",                date:"2026-02-15", type:"Superspeedway", miles:2.50, geo:"Tri-Oval",      chaos:.91 },
    { id:"atlanta",      name:"Ambetter Health 400",        date:"2026-02-22", type:"Superspeedway", miles:1.54, geo:"D-Shape",       chaos:.88 },
    { id:"cota",         name:"EchoPark Automotive GP",     date:"2026-03-02", type:"Road Course",   miles:3.41, geo:"Road Course",   chaos:.72 },
    { id:"phoenix",      name:"Straight Talk 500",          date:"2026-03-08", type:"Short Track",   miles:1.00, geo:"D-Shape",       chaos:.67 },
    { id:"las_vegas",    name:"Pennzoil 400",               date:"2026-03-15", type:"Intermediate",  miles:1.50, geo:"D-Shape",       chaos:.62 },
    { id:"darlington",   name:"Goodyear 400",               date:"2026-03-22", type:"Intermediate",  miles:1.37, geo:"Stripe",        chaos:.65 },
    { id:"martinsville", name:"Cook Out 400",               date:"2026-03-30", type:"Short Track",   miles:0.53, geo:"Paperclip",     chaos:.75 },
    { id:"bristol",      name:"Food City 500",              date:"2026-04-05", type:"Short Track",   miles:0.53, geo:"Bowl",          chaos:.79 },
    { id:"richmond",     name:"Toyota Owners 400",          date:"2026-04-12", type:"Short Track",   miles:0.75, geo:"D-Shape",       chaos:.68 },
    { id:"talladega",    name:"GEICO 500",                  date:"2026-04-26", type:"Superspeedway", miles:2.66, geo:"Tri-Oval",      chaos:.94 },
    { id:"dover",        name:"Würth 400",                  date:"2026-05-03", type:"Short Track",   miles:1.00, geo:"Concrete Bowl", chaos:.69 },
    { id:"darlington2",  name:"Darlington II",              date:"2026-05-10", type:"Intermediate",  miles:1.37, geo:"Stripe",        chaos:.65 },
    { id:"charlotte",    name:"Coca-Cola 600",              date:"2026-05-24", type:"Intermediate",  miles:1.50, geo:"D-Shape",       chaos:.58 },
    { id:"gateway",      name:"Enjoy Illinois 300",         date:"2026-06-07", type:"Intermediate",  miles:1.25, geo:"D-Shape",       chaos:.62 },
    { id:"sonoma",       name:"Toyota/Save Mart 350",       date:"2026-06-14", type:"Road Course",   miles:2.52, geo:"Road Course",   chaos:.70 },
    { id:"nh",           name:"Ambetter Health 301",        date:"2026-06-22", type:"Short Track",   miles:1.06, geo:"D-Shape",       chaos:.66 },
    { id:"chicago",      name:"Grant Park 165",             date:"2026-07-06", type:"Street Course", miles:2.20, geo:"Road Course",   chaos:.78 },
    { id:"pocono",       name:"HighPoint.com 400",          date:"2026-07-12", type:"Superspeedway", miles:2.50, geo:"Tri-Oval",      chaos:.85 },
    { id:"indy",         name:"Brickyard 400",              date:"2026-07-26", type:"Superspeedway", miles:2.50, geo:"Oval",          chaos:.80 },
    { id:"michigan",     name:"FireKeepers Casino 400",     date:"2026-08-02", type:"Superspeedway", miles:2.00, geo:"D-Shape",       chaos:.82 },
    { id:"richmond2",    name:"Cook Out 400 II",            date:"2026-08-09", type:"Short Track",   miles:0.75, geo:"D-Shape",       chaos:.68 },
    { id:"watkins_glen", name:"Go Bowling at The Glen",     date:"2026-08-16", type:"Road Course",   miles:2.45, geo:"Road Course",   chaos:.71 },
    { id:"daytona2",     name:"Coke Zero Sugar 400",        date:"2026-08-23", type:"Superspeedway", miles:2.50, geo:"Tri-Oval",      chaos:.92 },
    { id:"darlington3",  name:"Goodyear 400 II",            date:"2026-09-07", type:"Intermediate",  miles:1.37, geo:"Stripe",        chaos:.66 },
    { id:"kansas",       name:"Hollywood Casino 400",       date:"2026-09-27", type:"Intermediate",  miles:1.50, geo:"D-Shape",       chaos:.63 },
    { id:"bristol2",     name:"Bass Pro Shops Night Race",  date:"2026-09-19", type:"Short Track",   miles:0.53, geo:"Bowl",          chaos:.80 },
    { id:"talladega2",   name:"YellaWood 500",              date:"2026-10-04", type:"Superspeedway", miles:2.66, geo:"Tri-Oval",      chaos:.94 },
    { id:"charlotte2",   name:"Bank of America ROVAL 400",  date:"2026-10-11", type:"Road Course",   miles:2.28, geo:"Road Course",   chaos:.75 },
    { id:"las_vegas2",   name:"South Point 400",            date:"2026-10-18", type:"Intermediate",  miles:1.50, geo:"D-Shape",       chaos:.62 },
    { id:"martinsville2",name:"Xfinity 500",                date:"2026-10-25", type:"Short Track",   miles:0.53, geo:"Paperclip",     chaos:.76 },
    { id:"phoenix2",     name:"United Rentals 500",         date:"2026-11-01", type:"Short Track",   miles:1.00, geo:"D-Shape",       chaos:.67 },
    { id:"homestead",    name:"Ford 400",                   date:"2026-11-08", type:"Intermediate",  miles:1.50, geo:"D-Shape",       chaos:.61 },
  ],
  xfin: [
    { id:"daytona_x",    name:"United Rentals 300",         date:"2026-02-14", type:"Superspeedway", miles:2.50, geo:"Tri-Oval",      chaos:.90 },
    { id:"atlanta_x",    name:"General Tire 200",           date:"2026-02-21", type:"Superspeedway", miles:1.54, geo:"D-Shape",       chaos:.87 },
    { id:"cota_x",       name:"EchoPark GP Xfinity",        date:"2026-03-01", type:"Road Course",   miles:3.41, geo:"Road Course",   chaos:.71 },
    { id:"phoenix_x",    name:"Nikola Truck Challenge",     date:"2026-03-07", type:"Short Track",   miles:1.00, geo:"D-Shape",       chaos:.66 },
    { id:"lv_x",         name:"Boyd Gaming 300",            date:"2026-03-14", type:"Intermediate",  miles:1.50, geo:"D-Shape",       chaos:.61 },
    { id:"darlington_x", name:"Sport Clips VFW 200",        date:"2026-03-21", type:"Intermediate",  miles:1.37, geo:"Stripe",        chaos:.64 },
    { id:"martin_x",     name:"NFPA 250",                   date:"2026-03-28", type:"Short Track",   miles:0.53, geo:"Paperclip",     chaos:.74 },
    { id:"bristol_x",    name:"Hooters 250",                date:"2026-04-04", type:"Short Track",   miles:0.53, geo:"Bowl",          chaos:.78 },
    { id:"talladega_x",  name:"AG-Pro 300",                 date:"2026-04-25", type:"Superspeedway", miles:2.66, geo:"Tri-Oval",      chaos:.93 },
    { id:"dover_x",      name:"A-1 Solar 200",              date:"2026-05-02", type:"Short Track",   miles:1.00, geo:"Concrete Bowl", chaos:.68 },
    { id:"darlington_x2",name:"Steakhouse Elite 200",       date:"2026-05-09", type:"Intermediate",  miles:1.37, geo:"Stripe",        chaos:.64 },
    { id:"charlotte_x",  name:"Alsco Uniforms 300",         date:"2026-05-23", type:"Intermediate",  miles:1.50, geo:"D-Shape",       chaos:.59 },
  ],
  truck: [
    { id:"daytona_t",    name:"NextEra 250",                date:"2026-02-13", type:"Superspeedway", miles:2.50, geo:"Tri-Oval",      chaos:.91 },
    { id:"atlanta_t",    name:"Fr8 208",                    date:"2026-02-20", type:"Superspeedway", miles:1.54, geo:"D-Shape",       chaos:.88 },
    { id:"phoenix_t",    name:"Victoria's Voice 200",       date:"2026-03-06", type:"Short Track",   miles:1.00, geo:"D-Shape",       chaos:.65 },
    { id:"darlington_t", name:"Buckle Up SC 200",           date:"2026-03-20", type:"Intermediate",  miles:1.37, geo:"Stripe",        chaos:.65 },
    { id:"rock_t",       name:"Rockingham 200",             date:"2026-04-03", type:"Short Track",   miles:1.02, geo:"Oval",          chaos:.70 },
    { id:"talladega_t",  name:"Chevy Silverado 250",        date:"2026-04-24", type:"Superspeedway", miles:2.66, geo:"Tri-Oval",      chaos:.93 },
    { id:"dover_t",      name:"Town Fair Tire 200",         date:"2026-05-01", type:"Short Track",   miles:1.00, geo:"Concrete Bowl", chaos:.68 },
    { id:"nc500_t",      name:"North Wilkesboro 200",       date:"2026-05-16", type:"Short Track",   miles:0.63, geo:"Oval",          chaos:.72 },
    { id:"iowa_t",       name:"US Cellular 225",            date:"2026-06-06", type:"Short Track",   miles:0.875,geo:"Oval",          chaos:.68 },
    { id:"gateway_t",    name:"Toyota Craftsman 200",       date:"2026-06-06", type:"Intermediate",  miles:1.25, geo:"D-Shape",       chaos:.62 },
  ],
};

// Try to fetch winners from NASCAR CF race results API
async function fetchWinners(seriesSlug) {
  try {
    const res = await fetch(
      `https://cf.nascar.com/cacher/2026/race_list_basic.json`,
      { headers: { "User-Agent": "Mozilla/5.0 (compatible; FinalLap/1.0)" } }
    );
    if (!res.ok) return {};
    const data = await res.json();
    // Build a map of race_date -> winner name
    const winners = {};
    const seriesMap = { cup: 1, xfin: 2, truck: 3 };
    const seriesId = seriesMap[seriesSlug] || 1;
    (data || []).filter(r => r.series_id === seriesId && r.Winner).forEach(r => {
      winners[r.race_date?.substring(0, 10)] = r.Winner;
    });
    return winners;
  } catch {
    return {};
  }
}

export default async function handler(req) {
  const url = new URL(req.url);
  const seriesKey = url.searchParams.get("series") || "cup";
  const today = new Date().toISOString().substring(0, 10);

  const schedule = SCHEDULE_BASE[seriesKey] || SCHEDULE_BASE.cup;
  const winners = await fetchWinners(seriesKey);

  // Auto-compute done/next from today's date
  let nextSet = false;
  const enriched = schedule.map(race => {
    const isPast = race.date < today;
    const isToday = race.date === today;
    const winner = winners[race.date] || null;
    const isNext = !isPast && !isToday && !nextSet;
    if (isNext) nextSet = true;
    return {
      ...race,
      done: isPast,
      winner: winner || (isPast ? "Results pending" : null),
      next: isNext,
      daysUntil: isPast ? null : Math.ceil((new Date(race.date) - new Date()) / 86400000),
    };
  });

  return new Response(JSON.stringify({
    series: seriesKey,
    schedule: enriched,
    asOf: new Date().toISOString(),
  }), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
