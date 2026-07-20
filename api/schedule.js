// api/schedule.js
// Returns the 2026 NASCAR schedule with correct race data and live done/next computation
// winner-aware: a race with a confirmed winner is always "done" regardless of date

export const config = { runtime: "edge" };

const SERIES_MAP = { cup: "cup", xfin: "xfin", truck: "truck" };

// ── CORRECT 2026 SCHEDULES ──────────────────────────────────────────────────
// Verified against actual results through Race 22 (Atlanta, July 12).
// North Wilkesboro (Window World 450) is Race 23, July 19 -- today.
const SCHEDULE_BASE = {
  cup: [
    { id:"clash",        name:"Cook Out Clash (Exhib.)",      date:"2026-02-04", type:"Short Track",   miles:0.25, geo:"Oval",          chaos:.60, winner:"Ryan Preece",           exhib:true },
    { id:"daytona",      name:"Daytona 500",                  date:"2026-02-15", type:"Superspeedway", miles:2.50, geo:"Tri-Oval",      chaos:.91, winner:"Tyler Reddick"          },
    { id:"atlanta",      name:"Autotrader 400",               date:"2026-02-22", type:"Superspeedway", miles:1.54, geo:"D-Shape",       chaos:.88, winner:"Tyler Reddick"          },
    { id:"cota",         name:"DuraMAX Texas Grand Prix",     date:"2026-03-01", type:"Road Course",   miles:3.41, geo:"Road Course",   chaos:.72, winner:"Tyler Reddick"          },
    { id:"phoenix",      name:"Straight Talk Wireless 500",   date:"2026-03-08", type:"Short Track",   miles:1.00, geo:"D-Shape",       chaos:.67, winner:"Ryan Blaney"            },
    { id:"las_vegas",    name:"Pennzoil 400",                 date:"2026-03-15", type:"Intermediate",  miles:1.50, geo:"D-Shape",       chaos:.62, winner:"Denny Hamlin"           },
    { id:"darlington",   name:"Goodyear 400",                 date:"2026-03-22", type:"Intermediate",  miles:1.37, geo:"Stripe",        chaos:.66, winner:"Tyler Reddick"          },
    { id:"martinsville", name:"Cook Out 400",                 date:"2026-03-29", type:"Short Track",   miles:0.53, geo:"Paperclip",     chaos:.75, winner:"Chase Elliott"          },
    { id:"bristol",      name:"Food City 500",                date:"2026-04-12", type:"Short Track",   miles:0.53, geo:"Bowl",          chaos:.79, winner:"Ty Gibbs"               },
    { id:"kansas",       name:"AdventHealth 400",             date:"2026-04-19", type:"Intermediate",  miles:1.50, geo:"D-Shape",       chaos:.60, winner:"Tyler Reddick"          },
    { id:"talladega",    name:"Jack Link's 500",              date:"2026-04-26", type:"Superspeedway", miles:2.66, geo:"Tri-Oval",      chaos:.94, winner:"Carson Hocevar"         },
    { id:"texas",        name:"Wurth 400",                    date:"2026-05-03", type:"Intermediate",  miles:1.50, geo:"D-Shape",       chaos:.61, winner:"Chase Elliott"          },
    { id:"watkins_glen", name:"Go Bowling at The Glen",       date:"2026-05-10", type:"Road Course",   miles:2.45, geo:"Road Course",   chaos:.74, winner:"Shane van Gisbergen"    },
    { id:"allstar",      name:"NASCAR All-Star Race",         date:"2026-05-17", type:"Short Track",   miles:1.00, geo:"Concrete Bowl", chaos:.69, winner:"Denny Hamlin",          exhib:true },
    { id:"charlotte",    name:"Coca-Cola 600",                date:"2026-05-24", type:"Intermediate",  miles:1.50, geo:"D-Shape",       chaos:.58, winner:"Daniel Suárez"          },
    { id:"nashville",    name:"Cracker Barrel 400",           date:"2026-05-31", type:"Intermediate",  miles:1.33, geo:"D-Shape",       chaos:.63, winner:"Denny Hamlin"           },
    { id:"michigan",     name:"FireKeepers Casino 400",       date:"2026-06-07", type:"Superspeedway", miles:2.00, geo:"D-Shape",       chaos:.82, winner:"Denny Hamlin"           },
    { id:"pocono",       name:"Great American Getaway 400",   date:"2026-06-14", type:"Superspeedway", miles:2.50, geo:"Tri-Oval",      chaos:.85, winner:"Denny Hamlin"           },
    { id:"coronado",     name:"Anduril 250",                  date:"2026-06-21", type:"Street Course", miles:2.03, geo:"Road Course",   chaos:.80, winner:"Corey Heim"             },
    { id:"sonoma",       name:"Toyota/Save Mart 350",         date:"2026-06-28", type:"Road Course",   miles:2.52, geo:"Road Course",   chaos:.70, winner:"Shane van Gisbergen"    },
    { id:"chicagoland",  name:"eero 400",                     date:"2026-07-05", type:"Intermediate",  miles:1.50, geo:"D-Shape",       chaos:.66, winner:"Chase Briscoe"          },
    { id:"atlanta2",     name:"Quaker State 400",             date:"2026-07-12", type:"Superspeedway", miles:1.54, geo:"D-Shape",       chaos:.88, winner:"Ryan Blaney"            },
    { id:"nwilkes",      name:"Window World 450",             date:"2026-07-19", type:"Short Track",   miles:0.63, geo:"Oval",          chaos:.73 },
    { id:"indy",         name:"Brickyard 400",                date:"2026-07-26", type:"Superspeedway", miles:2.50, geo:"Oval",          chaos:.80 },
    { id:"iowa",         name:"Iowa Corn 350",                date:"2026-08-09", type:"Short Track",   miles:0.875,geo:"Oval",          chaos:.68 },
    { id:"richmond",     name:"Cook Out 400",                 date:"2026-08-15", type:"Short Track",   miles:0.75, geo:"D-Shape",       chaos:.68 },
    { id:"nh",           name:"Dollar Tree 301",              date:"2026-08-23", type:"Short Track",   miles:1.06, geo:"D-Shape",       chaos:.66 },
    { id:"daytona2",     name:"Coke Zero Sugar 400",          date:"2026-08-29", type:"Superspeedway", miles:2.50, geo:"Tri-Oval",      chaos:.93 },
    { id:"darlington2",  name:"Cook Out Southern 500",        date:"2026-09-06", type:"Intermediate",  miles:1.37, geo:"Stripe",        chaos:.66, chase:true },
    { id:"gateway",      name:"Enjoy Illinois 300",           date:"2026-09-13", type:"Intermediate",  miles:1.25, geo:"D-Shape",       chaos:.63, chase:true },
    { id:"bristol2",     name:"Bass Pro Shops Night Race",    date:"2026-09-19", type:"Short Track",   miles:0.53, geo:"Bowl",          chaos:.80, chase:true },
    { id:"kansas2",      name:"Hollywood Casino 400",         date:"2026-09-27", type:"Intermediate",  miles:1.50, geo:"D-Shape",       chaos:.60, chase:true },
    { id:"las_vegas2",   name:"South Point 400",              date:"2026-10-04", type:"Intermediate",  miles:1.50, geo:"D-Shape",       chaos:.62, chase:true },
    { id:"charlotte2",   name:"Bank of America 400",          date:"2026-10-11", type:"Road Course",   miles:2.28, geo:"Road Course",   chaos:.75, chase:true },
    { id:"phoenix2",     name:"Freeway Insurance 500",        date:"2026-10-18", type:"Short Track",   miles:1.00, geo:"D-Shape",       chaos:.67, chase:true },
    { id:"talladega2",   name:"YellaWood 500",                date:"2026-10-25", type:"Superspeedway", miles:2.66, geo:"Tri-Oval",      chaos:.94, chase:true },
    { id:"martinsville2",name:"Xfinity 500",                  date:"2026-11-01", type:"Short Track",   miles:0.53, geo:"Paperclip",     chaos:.76, chase:true },
    { id:"homestead2",   name:"Straight Talk Wireless 400",   date:"2026-11-08", type:"Intermediate",  miles:1.50, geo:"D-Shape",       chaos:.62, chase:true },
  ],
  xfin: [
    { id:"daytona_x",     name:"United Rentals 300",         date:"2026-02-14", type:"Superspeedway", miles:2.50, geo:"Tri-Oval",     chaos:.90, winner:"Austin Hill" },
    { id:"atlanta_x",     name:"General Tire 200",           date:"2026-02-21", type:"Superspeedway", miles:1.54, geo:"D-Shape",      chaos:.87, winner:"Sheldon Creed" },
    { id:"cota_x",        name:"EchoPark GP Xfinity",        date:"2026-02-28", type:"Road Course",   miles:3.41, geo:"Road Course",  chaos:.71, winner:"Shane van Gisbergen" },
    { id:"phoenix_x",     name:"Nikola Truck Challenge",     date:"2026-03-07", type:"Short Track",   miles:1.00, geo:"D-Shape",      chaos:.66, winner:"Justin Allgaier" },
    { id:"lv_x",          name:"Boyd Gaming 300",            date:"2026-03-14", type:"Intermediate",  miles:1.50, geo:"D-Shape",      chaos:.61, winner:"Kyle Larson" },
    { id:"darlington_x",  name:"Baptist Health 200",         date:"2026-03-21", type:"Intermediate",  miles:1.37, geo:"Stripe",       chaos:.60, winner:"Justin Allgaier" },
    { id:"martin_x",      name:"NFPA 250",                   date:"2026-03-28", type:"Short Track",   miles:0.53, geo:"Paperclip",    chaos:.74, winner:"Justin Allgaier" },
    { id:"rockingham_x",  name:"Mecum 250",                  date:"2026-04-04", type:"Short Track",   miles:1.017,geo:"Oval",         chaos:.67, winner:"William Sawalich" },
    { id:"bristol_x",     name:"Hooters 250",                date:"2026-04-11", type:"Short Track",   miles:0.53, geo:"Bowl",         chaos:.78, winner:"Connor Zilisch" },
    { id:"kansas_x",      name:"Fr8 200",                    date:"2026-04-18", type:"Intermediate",  miles:1.50, geo:"D-Shape",      chaos:.60, winner:"Taylor Gray" },
    { id:"talladega_x",   name:"AG-Pro 300",                 date:"2026-04-25", type:"Superspeedway", miles:2.66, geo:"Tri-Oval",     chaos:.93, winner:"Corey Day" },
    { id:"texas_x",       name:"SpeedyCash.com 300",         date:"2026-05-02", type:"Intermediate",  miles:1.50, geo:"D-Shape",      chaos:.61, winner:"Kyle Larson" },
    { id:"watkins_glen_x",name:"Bully Hill Vineyards 200",   date:"2026-05-09", type:"Road Course",   miles:2.45, geo:"Road Course",  chaos:.74, winner:"Connor Zilisch" },
    { id:"dover_x",       name:"A-1 Solar 200",              date:"2026-05-16", type:"Short Track",   miles:1.00, geo:"Concrete Bowl",chaos:.68, winner:"Corey Day" },
    { id:"charlotte_x",   name:"Alsco Uniforms 300",         date:"2026-05-23", type:"Intermediate",  miles:1.50, geo:"D-Shape",      chaos:.59, winner:"Ross Chastain" },
    { id:"nashville_x",   name:"Tennessee Lottery 250",      date:"2026-05-30", type:"Intermediate",  miles:1.33, geo:"D-Shape",      chaos:.63, winner:"Justin Allgaier" },
    { id:"pocono_x",      name:"Pocono Green 225",           date:"2026-06-13", type:"Superspeedway", miles:2.50, geo:"Tri-Oval",     chaos:.84, winner:"Justin Allgaier" },
    { id:"coronado_x",    name:"Navy 250 Xfinity",           date:"2026-06-20", type:"Street Course", miles:2.03, geo:"Road Course",  chaos:.79, winner:"Austin Hill" },
    { id:"sonoma_x",      name:"W.M. Americas Tire 200",     date:"2026-06-27", type:"Road Course",   miles:2.52, geo:"Road Course",  chaos:.70, winner:"Shane van Gisbergen" },
    { id:"chicagoland_x", name:"eero 200",                   date:"2026-07-04", type:"Intermediate",  miles:1.50, geo:"D-Shape",      chaos:.64, winner:"Brandon Jones" },
    { id:"atlanta_x2",    name:"Kubota 200",                 date:"2026-07-11", type:"Superspeedway", miles:1.54, geo:"D-Shape",      chaos:.87, winner:"Justin Allgaier" },
    { id:"nwilkes_x",     name:"Window World 250",           date:"2026-07-18", type:"Short Track",   miles:0.63, geo:"Oval",         chaos:.72, winner:"Justin Allgaier" },
    { id:"iowa_x",        name:"Iowa 250",                   date:"2026-08-08", type:"Short Track",   miles:0.875,geo:"Oval",         chaos:.67 },
    { id:"daytona_x2",    name:"Wawa 250",                   date:"2026-08-28", type:"Superspeedway", miles:2.50, geo:"Tri-Oval",     chaos:.91 },
  ],
  truck: [
    { id:"daytona_t",     name:"Fresh From Florida 250",       date:"2026-02-13", type:"Superspeedway",   miles:2.50, geo:"Tri-Oval",     chaos:.91, winner:"Chandler Smith" },
    { id:"atlanta_t",     name:"Fr8 208",                      date:"2026-02-21", type:"Superspeedway",   miles:1.54, geo:"D-Shape",      chaos:.88, winner:"Kyle Busch" },
    { id:"stpete_t",      name:"OnlyBulls Green Flag 150",     date:"2026-02-28", type:"Street Course",   miles:1.30, geo:"Road Course",  chaos:.77, winner:"Layne Riggs" },
    { id:"darlington_t",  name:"Buckle Up South Carolina 200", date:"2026-03-20", type:"Intermediate",    miles:1.37, geo:"Stripe",       chaos:.66, winner:"Corey Heim" },
    { id:"rockingham_t",  name:"Black's Tire 200",             date:"2026-04-03", type:"Short Track",     miles:1.017,geo:"Oval",         chaos:.70, winner:"Corey Heim" },
    { id:"bristol_t",     name:"Tennessee Army Nat'l Guard 250",date:"2026-04-10",type:"Dirt Short Track", miles:0.53, geo:"Bowl",        chaos:.85, winner:"Christopher Bell" },
    { id:"texas_t",       name:"SpeedyCash.com 250",           date:"2026-05-01", type:"Intermediate",    miles:1.50, geo:"D-Shape",      chaos:.61, winner:"Carson Hocevar" },
    { id:"watkins_glen_t",name:"Bully Hill Vineyards 176",     date:"2026-05-08", type:"Road Course",     miles:2.45, geo:"Road Course",  chaos:.74, winner:"Kaden Honeycutt" },
    { id:"dover_t",       name:"Ecosave 200",                  date:"2026-05-15", type:"Short Track",     miles:1.00, geo:"Concrete Bowl",chaos:.68, winner:"Kyle Busch" },
    { id:"charlotte_t",   name:"NC Education Lottery 200",     date:"2026-05-24", type:"Intermediate",    miles:1.50, geo:"D-Shape",      chaos:.60, winner:"Layne Riggs" },
    { id:"nashville_t",   name:"Allegiance 200",               date:"2026-05-29", type:"Intermediate",    miles:1.33, geo:"D-Shape",      chaos:.63, winner:"Layne Riggs" },
    { id:"michigan_t",    name:"DQS Solutions & Staffing 250", date:"2026-06-06", type:"Superspeedway",   miles:2.00, geo:"D-Shape",      chaos:.80, winner:"Corey Heim" },
    { id:"coronado_t",    name:"Navy 250",                     date:"2026-06-19", type:"Street Course",   miles:2.03, geo:"Road Course",  chaos:.80, winner:"Layne Riggs" },
    { id:"limerock_t",    name:"LiUNA! 150",                   date:"2026-07-11", type:"Road Course",     miles:1.50, geo:"Road Course",  chaos:.72, winner:"Grant Enfinger" },
    { id:"nwilkes_t",     name:"FaithFest 250",                date:"2026-07-18", type:"Short Track",     miles:0.63, geo:"Oval",         chaos:.72, winner:"Chandler Smith" },
    { id:"iowa_t",        name:"US Cellular 225",              date:"2026-08-07", type:"Short Track",     miles:0.875,geo:"Oval",         chaos:.68 },
    { id:"daytona_t2",    name:"Wawa 250 Trucks",              date:"2026-08-27", type:"Superspeedway",   miles:2.50, geo:"Tri-Oval",     chaos:.91 },
  ],
};

export default async function handler(req) {
  const url = new URL(req.url);
  const seriesKey = url.searchParams.get("series") || "cup";
  const schedule = SCHEDULE_BASE[seriesKey] || SCHEDULE_BASE.cup;

  // winner-aware done/next: confirmed winner = done; future date = not done
  // "next" is the first non-done race in chronological order, so bye weeks of any length
  // (7 days, 3 weeks, whatever) are handled correctly without a separate 7-day-window branch.
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
