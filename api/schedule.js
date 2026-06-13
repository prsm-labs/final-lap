// api/schedule.js
// Returns the 2026 NASCAR schedule with correct race data and live done/next computation
// winner-aware: a race with a confirmed winner is always "done" regardless of date

export const config = { runtime: "edge" };

const SERIES_MAP = { cup: "cup", xfin: "xfin", truck: "truck" };

// ── CORRECT 2026 SCHEDULES ──────────────────────────────────────────────────
// Updated through Race 15 (Michigan, June 7). Pocono is Race 16, June 14.
const SCHEDULE_BASE = {
  cup: [
    { id:"daytona",       name:"Daytona 500",                  date:"2026-02-15", type:"Superspeedway",  miles:2.50, geo:"Tri-Oval",      chaos:.91, winner:"Tyler Reddick" },
    { id:"atlanta",       name:"Autotrader 400",               date:"2026-02-22", type:"Superspeedway",  miles:1.54, geo:"D-Shape",       chaos:.88, winner:"Tyler Reddick" },
    { id:"cota",          name:"DuraMax Grand Prix",           date:"2026-03-01", type:"Road Course",    miles:3.41, geo:"Road Course",   chaos:.72, winner:"Tyler Reddick" },
    { id:"phoenix",       name:"Shriners Children's 500",      date:"2026-03-08", type:"Short Track",    miles:1.00, geo:"D-Shape",       chaos:.67, winner:"Ryan Blaney" },
    { id:"las_vegas",     name:"Pennzoil 400",                 date:"2026-03-15", type:"Intermediate",   miles:1.50, geo:"D-Shape",       chaos:.62, winner:"Denny Hamlin" },
    { id:"homestead",     name:"Dixie Vodka 400",              date:"2026-03-22", type:"Intermediate",   miles:1.50, geo:"D-Shape",       chaos:.60, winner:"Tyler Reddick" },
    { id:"martinsville",  name:"Cook Out 400",                 date:"2026-03-30", type:"Short Track",    miles:0.53, geo:"Paperclip",     chaos:.75, winner:"Denny Hamlin" },
    { id:"richmond",      name:"Toyota Owners 400",            date:"2026-04-05", type:"Short Track",    miles:0.75, geo:"D-Shape",       chaos:.68, winner:"Ty Gibbs" },
    { id:"bristol",       name:"Food City 500",                date:"2026-04-12", type:"Short Track",    miles:0.53, geo:"Bowl",          chaos:.79, winner:"Carson Hocevar" },
    { id:"talladega",     name:"GEICO 500",                    date:"2026-04-26", type:"Superspeedway",  miles:2.66, geo:"Tri-Oval",      chaos:.94, winner:"Shane van Gisbergen" },
    { id:"dover",         name:"Wurth 400 / All-Star",         date:"2026-05-04", type:"Short Track",    miles:1.00, geo:"Concrete Bowl", chaos:.69, winner:"Kyle Larson" },
    { id:"nwilkes",       name:"North Wilkesboro 300",         date:"2026-05-10", type:"Short Track",    miles:0.63, geo:"Oval",          chaos:.73, winner:"Chase Elliott" },
    { id:"charlotte",     name:"Coca-Cola 600",                date:"2026-05-24", type:"Intermediate",   miles:1.50, geo:"D-Shape",       chaos:.58, winner:"Tyler Reddick" },
    { id:"nashville",     name:"Cracker Barrel 400",           date:"2026-06-01", type:"Intermediate",   miles:1.33, geo:"D-Shape",       chaos:.63, winner:"Denny Hamlin" },
    { id:"michigan",      name:"FireKeepers Casino 400",       date:"2026-06-07", type:"Superspeedway",  miles:2.00, geo:"D-Shape",       chaos:.82, winner:"Denny Hamlin" },
    { id:"pocono",        name:"Great American Getaway 400",   date:"2026-06-14", type:"Superspeedway",  miles:2.50, geo:"Tri-Oval",      chaos:.85 },
    { id:"sonoma",        name:"Toyota/Save Mart 350",         date:"2026-06-28", type:"Road Course",    miles:2.52, geo:"Road Course",   chaos:.70 },
    { id:"chicago",       name:"Grant Park 165",               date:"2026-07-05", type:"Street Course",  miles:2.20, geo:"Road Course",   chaos:.78 },
    { id:"nwilkes2",      name:"North Wilkesboro 300 II",      date:"2026-07-12", type:"Short Track",    miles:0.63, geo:"Oval",          chaos:.73 },
    { id:"indy",          name:"Brickyard 400",                date:"2026-07-26", type:"Superspeedway",  miles:2.50, geo:"Oval",          chaos:.80 },
    { id:"iowa",          name:"Iowa Corn 350",                date:"2026-08-09", type:"Short Track",    miles:0.875,geo:"Oval",          chaos:.68 },
    { id:"richmond2",     name:"Cook Out 400 II",              date:"2026-08-15", type:"Short Track",    miles:0.75, geo:"D-Shape",       chaos:.68 },
    { id:"nh",            name:"Dollar Tree 301",              date:"2026-08-23", type:"Short Track",    miles:1.06, geo:"D-Shape",       chaos:.66 },
    { id:"daytona2",      name:"Coke Zero Sugar 400",          date:"2026-08-29", type:"Superspeedway",  miles:2.50, geo:"Tri-Oval",      chaos:.93 },
    { id:"darlington",    name:"Cook Out Southern 500",        date:"2026-09-06", type:"Intermediate",   miles:1.37, geo:"Stripe",        chaos:.66, chase:true },
    { id:"gateway",       name:"Enjoy Illinois 300",           date:"2026-09-13", type:"Intermediate",   miles:1.25, geo:"D-Shape",       chaos:.63, chase:true },
    { id:"bristol2",      name:"Bass Pro Night Race",          date:"2026-09-19", type:"Short Track",    miles:0.53, geo:"Bowl",          chaos:.80, chase:true },
    { id:"san_diego",     name:"NASCAR San Diego",             date:"2026-09-27", type:"Street Course",  miles:1.80, geo:"Road Course",   chaos:.76, chase:true },
    { id:"talladega2",    name:"YellaWood 500",                date:"2026-10-04", type:"Superspeedway",  miles:2.66, geo:"Tri-Oval",      chaos:.94, chase:true },
    { id:"charlotte2",    name:"Bank of America ROVAL 400",    date:"2026-10-11", type:"Road Course",    miles:2.28, geo:"Road Course",   chaos:.75, chase:true },
    { id:"phoenix2",      name:"United Rentals 500",           date:"2026-10-18", type:"Short Track",    miles:1.00, geo:"D-Shape",       chaos:.67, chase:true },
    { id:"martinsville2", name:"Xfinity 500",                  date:"2026-10-25", type:"Short Track",    miles:0.53, geo:"Paperclip",     chaos:.76, chase:true },
    { id:"chicagoland",   name:"Chicagoland 400",              date:"2026-11-01", type:"Intermediate",   miles:1.50, geo:"D-Shape",       chaos:.64, chase:true },
    { id:"homestead2",    name:"NASCAR Cup Championship",      date:"2026-11-08", type:"Intermediate",   miles:1.50, geo:"D-Shape",       chaos:.62, chase:true },
  ],
  xfin: [
    { id:"daytona_x",     name:"United Rentals 300",           date:"2026-02-14", type:"Superspeedway",  miles:2.50, geo:"Tri-Oval",      chaos:.90, winner:"Sam Mayer" },
    { id:"atlanta_x",     name:"General Tire 200",             date:"2026-02-21", type:"Superspeedway",  miles:1.54, geo:"D-Shape",       chaos:.87, winner:"Justin Allgaier" },
    { id:"cota_x",        name:"EchoPark GP Xfinity",          date:"2026-03-01", type:"Road Course",    miles:3.41, geo:"Road Course",   chaos:.71, winner:"Justin Allgaier" },
    { id:"phoenix_x",     name:"Nikola Truck Challenge",       date:"2026-03-07", type:"Short Track",    miles:1.00, geo:"D-Shape",       chaos:.66, winner:"Justin Allgaier" },
    { id:"lv_x",          name:"Boyd Gaming 300",              date:"2026-03-14", type:"Intermediate",   miles:1.50, geo:"D-Shape",       chaos:.61, winner:"Taylor Gray" },
    { id:"homestead_x",   name:"Baptist Health 200",           date:"2026-03-21", type:"Intermediate",   miles:1.50, geo:"D-Shape",       chaos:.60, winner:"Brandon Jones" },
    { id:"martin_x",      name:"NFPA 250",                     date:"2026-03-29", type:"Short Track",    miles:0.53, geo:"Paperclip",     chaos:.74, winner:"Justin Allgaier" },
    { id:"richmond_x",    name:"Mecum 250",                    date:"2026-04-04", type:"Short Track",    miles:0.75, geo:"D-Shape",       chaos:.67, winner:"Sam Mayer" },
    { id:"bristol_x",     name:"Hooters 250",                  date:"2026-04-11", type:"Short Track",    miles:0.53, geo:"Bowl",          chaos:.78, winner:"Brandon Jones" },
    { id:"talladega_x",   name:"AG-Pro 300",                   date:"2026-04-25", type:"Superspeedway",  miles:2.66, geo:"Tri-Oval",      chaos:.93, winner:"Parker Kligerman" },
    { id:"dover_x",       name:"A-1 Solar 200",                date:"2026-05-02", type:"Short Track",    miles:1.00, geo:"Concrete Bowl", chaos:.68, winner:"Justin Allgaier" },
    { id:"charlotte_x",   name:"Alsco Uniforms 300",           date:"2026-05-23", type:"Intermediate",   miles:1.50, geo:"D-Shape",       chaos:.59, winner:"Taylor Gray" },
    { id:"nashville_x",   name:"Tennessee Lottery 250",        date:"2026-05-31", type:"Intermediate",   miles:1.33, geo:"D-Shape",       chaos:.63, winner:"Sam Mayer" },
    { id:"pocono_x",      name:"Pocono Green 225",             date:"2026-06-13", type:"Superspeedway",  miles:2.50, geo:"Tri-Oval",      chaos:.84 },
    { id:"sonoma_x",      name:"W.M. Americas Tire 200",       date:"2026-06-27", type:"Road Course",    miles:2.52, geo:"Road Course",   chaos:.70 },
    { id:"iowa_x",        name:"Iowa 250",                     date:"2026-08-08", type:"Short Track",    miles:0.875,geo:"Oval",          chaos:.67 },
    { id:"daytona_x2",    name:"Wawa 250",                     date:"2026-08-28", type:"Superspeedway",  miles:2.50, geo:"Tri-Oval",      chaos:.91 },
  ],
  truck: [
    { id:"daytona_t",     name:"NextEra 250",                  date:"2026-02-13", type:"Superspeedway",  miles:2.50, geo:"Tri-Oval",      chaos:.91, winner:"Layne Riggs" },
    { id:"atlanta_t",     name:"Fr8 208",                      date:"2026-02-20", type:"Superspeedway",  miles:1.54, geo:"D-Shape",       chaos:.88, winner:"Gio Ruggiero" },
    { id:"phoenix_t",     name:"Victorias Voice 200",          date:"2026-03-06", type:"Short Track",    miles:1.00, geo:"D-Shape",       chaos:.65, winner:"Chandler Smith" },
    { id:"homestead_t",   name:"Fr8Auctions.com 200",          date:"2026-03-20", type:"Intermediate",   miles:1.50, geo:"D-Shape",       chaos:.60, winner:"Kaden Honeycutt" },
    { id:"martinsville_t",name:"TTC Race 1 Martinsville",      date:"2026-03-28", type:"Short Track",    miles:0.53, geo:"Paperclip",     chaos:.75, winner:"Ty Majeski" },
    { id:"richmond_t",    name:"Craftsman 250",                date:"2026-04-04", type:"Short Track",    miles:0.75, geo:"D-Shape",       chaos:.66, winner:"Chandler Smith" },
    { id:"bristol_t",     name:"TTC Race 2 Bristol Dirt",      date:"2026-04-11", type:"Short Track",    miles:0.53, geo:"Bowl",          chaos:.85, winner:"Layne Riggs" },
    { id:"talladega_t",   name:"Chevy Silverado 250",          date:"2026-04-25", type:"Superspeedway",  miles:2.66, geo:"Tri-Oval",      chaos:.93, winner:"Gio Ruggiero" },
    { id:"dover_t",       name:"Town Fair Tire 200",           date:"2026-05-02", type:"Short Track",    miles:1.00, geo:"Concrete Bowl", chaos:.68, winner:"Corey Heim" },
    { id:"nwilkes_t",     name:"TTC Race 3 North Wilkes",      date:"2026-05-09", type:"Short Track",    miles:0.63, geo:"Oval",          chaos:.72, winner:"Ben Rhodes" },
    { id:"charlotte_t",   name:"NC Education Lottery 200",     date:"2026-05-22", type:"Intermediate",   miles:1.50, geo:"D-Shape",       chaos:.60, winner:"Kaden Honeycutt" },
    { id:"nashville_t",   name:"Rackley W.A.R. 200",           date:"2026-05-30", type:"Intermediate",   miles:1.33, geo:"D-Shape",       chaos:.63, winner:"Chandler Smith" },
    { id:"michigan_t",    name:"CTS Michigan Race",            date:"2026-06-06", type:"Superspeedway",  miles:2.00, geo:"D-Shape",       chaos:.80, winner:"Ty Majeski" },
    { id:"pocono_t",      name:"Pocono Organics 150",          date:"2026-06-12", type:"Superspeedway",  miles:2.50, geo:"Tri-Oval",      chaos:.83, winner:"Chandler Smith" },
    { id:"iowa_t",        name:"US Cellular 225",              date:"2026-08-07", type:"Short Track",    miles:0.875,geo:"Oval",          chaos:.68 },
    { id:"daytona_t2",    name:"Wawa 250 Trucks",              date:"2026-08-27", type:"Superspeedway",  miles:2.50, geo:"Tri-Oval",      chaos:.91 },
  ],
};

export default async function handler(req) {
  const url = new URL(req.url);
  const seriesKey = url.searchParams.get("series") || "cup";
  const schedule = SCHEDULE_BASE[seriesKey] || SCHEDULE_BASE.cup;

  // winner-aware done/next: confirmed winner = done; future date = not done
  const now = new Date();
  const yesterday = new Date(now - 86400000).toISOString().substring(0, 10);
  let nextSet = false;

  const enriched = schedule.map(race => {
    const isPast = !!race.winner || race.date <= yesterday;
    const isNext = !isPast && !nextSet && !race.exhib;
    if (isNext) nextSet = true;
    return {
      ...race,
      done: isPast,
      next: isNext,
      daysUntil: isPast ? null : Math.ceil((new Date(race.date + "T12:00:00") - now) / 86400000),
    };
  });

  return new Response(JSON.stringify({
    series: seriesKey,
    schedule: enriched,
    asOf: now.toISOString(),
  }), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
