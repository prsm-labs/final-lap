import { useState, useRef, useEffect, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts";
import { runSim, genChart } from "../lib/sim.js";

// ===============================================================================
// STATIC BASELINE DATA  -  overridden by live API on load
// Skill/chaos/aero are scout judgments that don't change race-to-race
// pts/wins/mom are fetched live from /api/standings
// ===============================================================================

const STATIC_DRIVER_RATINGS = {
  "Tyler Reddick":       { skill:94, spd:169.2, aero:9,  chaosAvoid:8 },
  "Ryan Blaney":         { skill:87, spd:166.8, aero:8,  chaosAvoid:9 },
  "Bubba Wallace":       { skill:80, spd:165.1, aero:7,  chaosAvoid:6 },
  "Denny Hamlin":        { skill:89, spd:166.5, aero:8,  chaosAvoid:8 },
  "Chase Elliott":       { skill:91, spd:166.2, aero:8,  chaosAvoid:9 },
  "William Byron":       { skill:88, spd:165.9, aero:8,  chaosAvoid:8 },
  "Chris Buescher":      { skill:79, spd:165.0, aero:7,  chaosAvoid:7 },
  "Brad Keselowski":     { skill:83, spd:165.4, aero:7,  chaosAvoid:7 },
  "Christopher Bell":    { skill:86, spd:165.7, aero:7,  chaosAvoid:8 },
  "Kyle Larson":         { skill:93, spd:167.1, aero:9,  chaosAvoid:7 },
  "Ty Gibbs":            { skill:81, spd:164.8, aero:7,  chaosAvoid:7 },
  "Ryan Preece":         { skill:75, spd:163.5, aero:6,  chaosAvoid:6 },
  "Carson Hocevar":      { skill:74, spd:163.2, aero:6,  chaosAvoid:5 },
  "Daniel Suárez":       { skill:76, spd:163.4, aero:6,  chaosAvoid:6 },
  "Ross Chastain":       { skill:82, spd:164.5, aero:7,  chaosAvoid:4 },
  "Joey Logano":         { skill:82, spd:164.3, aero:7,  chaosAvoid:7 },
  "Michael McDowell":    { skill:73, spd:162.1, aero:5,  chaosAvoid:6 },
  "Austin Cindric":      { skill:77, spd:163.8, aero:7,  chaosAvoid:7 },
  "Connor Zilisch":      { skill:79, spd:163.6, aero:7,  chaosAvoid:6 },
  "Kyle Busch":          { skill:84, spd:164.0, aero:7,  chaosAvoid:6 },
  "Austin Dillon":       { skill:72, spd:162.0, aero:5,  chaosAvoid:5 },
  "Noah Gragson":        { skill:71, spd:161.8, aero:5,  chaosAvoid:5 },
  "Justin Allgaier":     { skill:90, spd:163.5, aero:8,  chaosAvoid:9 },
  "Sam Mayer":           { skill:84, spd:162.1, aero:7,  chaosAvoid:8 },
  "Brandon Jones":       { skill:83, spd:161.8, aero:7,  chaosAvoid:8 },
  "Taylor Gray":         { skill:81, spd:161.5, aero:7,  chaosAvoid:7 },
  "William Sawalich":    { skill:79, spd:161.0, aero:7,  chaosAvoid:7 },
  "Riley Herbst":        { skill:77, spd:160.5, aero:6,  chaosAvoid:6 },
  "Rajah Caruth":        { skill:76, spd:160.2, aero:6,  chaosAvoid:7 },
  "Harrison Burton":     { skill:78, spd:160.0, aero:6,  chaosAvoid:7 },
  "Parker Kligerman":    { skill:72, spd:159.5, aero:5,  chaosAvoid:6 },
  "Ryan Sieg":           { skill:70, spd:158.8, aero:5,  chaosAvoid:6 },
  "Austin Hill":         { skill:74, spd:159.8, aero:6,  chaosAvoid:7 },
  "Sheldon Creed":       { skill:73, spd:159.2, aero:6,  chaosAvoid:6 },
  "Jesse Love":          { skill:71, spd:158.5, aero:5,  chaosAvoid:6 },
  "Brent Crews":         { skill:67, spd:157.8, aero:5,  chaosAvoid:5 },
  "Chandler Smith":      { skill:89, spd:158.2, aero:8,  chaosAvoid:8 },
  "Kaden Honeycutt":     { skill:85, spd:170.5, aero:8,  chaosAvoid:7 },
  "Layne Riggs":         { skill:82, spd:157.5, aero:7,  chaosAvoid:7 },
  "Gio Ruggiero":        { skill:80, spd:157.0, aero:7,  chaosAvoid:7 },
  "Ty Majeski":          { skill:82, spd:157.3, aero:7,  chaosAvoid:8 },
  "Christian Eckes":     { skill:80, spd:156.8, aero:7,  chaosAvoid:7 },
  "Ben Rhodes":          { skill:80, spd:156.5, aero:7,  chaosAvoid:8 },
  "Corey Heim":          { skill:91, spd:159.1, aero:9,  chaosAvoid:9 },
  "Brenden Queen":       { skill:71, spd:154.0, aero:5,  chaosAvoid:6 },
  "Tyler Ankrum":        { skill:70, spd:153.8, aero:5,  chaosAvoid:6 },
  "Stewart Friesen":     { skill:72, spd:154.2, aero:6,  chaosAvoid:7 },
  "Daniel Hemric":       { skill:73, spd:154.5, aero:6,  chaosAvoid:7 },
  "Tanner Gray":         { skill:69, spd:153.5, aero:5,  chaosAvoid:5 },
  // 2026 season additions / movers
  "Shane van Gisbergen": { skill:84, spd:164.8, aero:8,  chaosAvoid:8 },
  "Chase Briscoe":       { skill:80, spd:164.1, aero:7,  chaosAvoid:7 },
  "Erik Jones":          { skill:76, spd:163.0, aero:6,  chaosAvoid:7 },
  "Zane Smith":          { skill:75, spd:162.8, aero:6,  chaosAvoid:7 },
  "AJ Allmendinger":     { skill:78, spd:163.2, aero:7,  chaosAvoid:7 },
  "Ricky Stenhouse Jr.": { skill:74, spd:162.5, aero:6,  chaosAvoid:5 },
  "Todd Gilliland":      { skill:74, spd:163.0, aero:6,  chaosAvoid:6 },
  "Corey Day":           { skill:85, spd:162.0, aero:7,  chaosAvoid:7 },
  "Grant Enfinger":      { skill:79, spd:157.0, aero:7,  chaosAvoid:7 },
  "Carson Kvapil":       { skill:80, spd:161.5, aero:7,  chaosAvoid:7 },
};

// Fallback drivers if API fails  -  updated after Race 22 (Atlanta, Quaker State 400), July 12 2026
// NOTE: Kyle Busch passed away during the 2026 season; NASCAR removed him from standings
const FALLBACK_DRIVERS = {
  cup: [
    { pos:1,  name:"Denny Hamlin",        num:"11", team:"Joe Gibbs Racing",      pts:791, wins:4, mom:98, manufacturer:"Toyota",    last5:[1,7,9,4,3] },
    { pos:2,  name:"Tyler Reddick",       num:"45", team:"23XI Racing",           pts:767, wins:5, mom:96, manufacturer:"Toyota",    last5:[3,11,6,2,5] },
    { pos:3,  name:"Ryan Blaney",         num:"12", team:"Team Penske",           pts:726, wins:2, mom:88, manufacturer:"Ford",      last5:[9,14,8,12,1] },
    { pos:4,  name:"Ty Gibbs",            num:"54", team:"Joe Gibbs Racing",      pts:665, wins:1, mom:79, manufacturer:"Toyota",    last5:[12,6,15,9,7] },
    { pos:5,  name:"Chase Elliott",       num:"9",  team:"Hendrick Motorsports",  pts:610, wins:2, mom:81, manufacturer:"Chevrolet", last5:[4,9,3,11,6] },
    { pos:6,  name:"Kyle Larson",         num:"5",  team:"Hendrick Motorsports",  pts:594, wins:0, mom:74, manufacturer:"Chevrolet", last5:[8,5,13,7,10] },
    { pos:7,  name:"Chris Buescher",      num:"17", team:"RFK Racing",            pts:568, wins:0, mom:70, manufacturer:"Ford",      last5:[14,10,18,12,9] },
    { pos:8,  name:"Carson Hocevar",      num:"77", team:"Spire Motorsports",     pts:563, wins:1, mom:71, manufacturer:"Chevrolet", last5:[11,7,16,5,13] },
    { pos:9,  name:"Christopher Bell",    num:"20", team:"Joe Gibbs Racing",      pts:551, wins:0, mom:68, manufacturer:"Toyota",    last5:[10,13,8,15,11] },
    { pos:10, name:"Chase Briscoe",       num:"19", team:"Joe Gibbs Racing",      pts:542, wins:1, mom:76, manufacturer:"Toyota",    last5:[16,9,7,1,12] },
    { pos:11, name:"Daniel Suárez",       num:"7",  team:"Trackhouse Racing",     pts:529, wins:1, mom:69, manufacturer:"Chevrolet", last5:[13,17,10,14,8] },
    { pos:12, name:"William Byron",       num:"24", team:"Hendrick Motorsports",  pts:520, wins:0, mom:66, manufacturer:"Chevrolet", last5:[7,12,9,16,14] },
    { pos:13, name:"Bubba Wallace",       num:"23", team:"23XI Racing",           pts:493, wins:0, mom:62, manufacturer:"Toyota",    last5:[15,18,12,9,16] },
    { pos:14, name:"Austin Cindric",      num:"2",  team:"Team Penske",           pts:470, wins:0, mom:60, manufacturer:"Ford",      last5:[17,14,19,11,13] },
    { pos:15, name:"Shane van Gisbergen", num:"97", team:"Trackhouse Racing",     pts:469, wins:2, mom:75, manufacturer:"Chevrolet", last5:[18,10,1,15,9] },
    { pos:16, name:"Erik Jones",          num:"43", team:"Legacy Motor Club",     pts:446, wins:0, mom:57, manufacturer:"Toyota",    last5:[19,15,17,12,18] },
    { pos:17, name:"Joey Logano",         num:"22", team:"Team Penske",           pts:438, wins:0, mom:55, manufacturer:"Ford",      last5:[16,19,14,17,15] },
    { pos:18, name:"Ryan Preece",         num:"60", team:"RFK Racing",            pts:420, wins:0, mom:53, manufacturer:"Ford",      last5:[20,16,18,14,19] },
    { pos:19, name:"Brad Keselowski",     num:"6",  team:"RFK Racing",            pts:403, wins:0, mom:51, manufacturer:"Ford",      last5:[17,20,15,18,16] },
    { pos:20, name:"Ross Chastain",       num:"1",  team:"Trackhouse Racing",     pts:401, wins:0, mom:50, manufacturer:"Chevrolet", last5:[14,11,16,19,17] },
    { pos:21, name:"Michael McDowell",    num:"34", team:"Front Row Motorsports", pts:399, wins:0, mom:47, manufacturer:"Ford",      last5:[21,18,20,16,19] },
    { pos:22, name:"AJ Allmendinger",     num:"16", team:"Kaulig Racing",         pts:396, wins:0, mom:46, manufacturer:"Chevrolet", last5:[19,22,17,20,18] },
    { pos:23, name:"Zane Smith",          num:"38", team:"Front Row Motorsports", pts:356, wins:0, mom:44, manufacturer:"Ford",      last5:[22,19,21,18,20] },
    { pos:24, name:"Todd Gilliland",      num:"71", team:"Spire Motorsports",     pts:353, wins:0, mom:42, manufacturer:"Chevrolet", last5:[20,21,19,22,21] },
    { pos:25, name:"Riley Herbst",        num:"35", team:"23XI Racing",          pts:350, wins:0, mom:40, manufacturer:"Toyota",    last5:[23,20,22,19,23] },
  ],
  xfin: [
    { pos:1,  name:"Justin Allgaier",    num:"7",  team:"JR Motorsports",       pts:966, wins:6, mom:99, last5:[1,4,1,3,1] },
    { pos:2,  name:"Jesse Love",         num:"11", team:"RCR Xfinity",          pts:726, wins:0, mom:78, rookie:true, last5:[8,6,9,5,7] },
    { pos:3,  name:"Sheldon Creed",      num:"2",  team:"Haas Factory Team",    pts:693, wins:1, mom:80, last5:[6,9,4,8,3] },
    { pos:4,  name:"Corey Day",          num:"9",  team:"JR Motorsports",       pts:689, wins:2, mom:82, last5:[9,1,7,4,2] },
    { pos:5,  name:"Carson Kvapil",      num:"1",  team:"JR Motorsports",       pts:682, wins:0, mom:76, last5:[10,7,11,6,9] },
    { pos:6,  name:"Connor Zilisch",     num:"88", team:"JR Motorsports",       pts:640, wins:2, mom:79, last5:[7,11,1,9,6] },
    { pos:7,  name:"Austin Hill",        num:"21", team:"RCR Xfinity",          pts:600, wins:2, mom:75, last5:[1,10,8,7,10] },
    { pos:8,  name:"Brandon Jones",      num:"20", team:"Joe Gibbs Racing",     pts:560, wins:1, mom:68, last5:[11,8,10,1,11] },
    { pos:9,  name:"Taylor Gray",        num:"18", team:"Joe Gibbs Racing",     pts:540, wins:1, mom:66, last5:[12,9,12,10,8] },
    { pos:10, name:"William Sawalich",   num:"54", team:"Joe Gibbs Racing",     pts:520, wins:1, mom:64, last5:[13,12,13,11,12] },
    { pos:11, name:"Rajah Caruth",       num:"24", team:"JR Motorsports",       pts:480, wins:0, mom:58, last5:[14,13,14,12,13] },
    { pos:12, name:"Harrison Burton",    num:"8",  team:"Sam Hunt Racing",      pts:460, wins:0, mom:55, last5:[15,14,15,13,14] },
  ],
  truck: [
    { pos:1,  name:"Layne Riggs",         num:"34", team:"Front Row Motorsports", pts:640, wins:4, mom:95, last5:[1,4,1,3,1] },
    { pos:2,  name:"Kaden Honeycutt",     num:"11", team:"KBM",                   pts:581, wins:1, mom:80, last5:[6,8,4,9,5] },
    { pos:3,  name:"Chandler Smith",      num:"38", team:"Front Row Motorsports", pts:514, wins:2, mom:78, last5:[9,3,7,4,1] },
    { pos:4,  name:"Christian Eckes",     num:"91", team:"McAnally-Hilbert",      pts:483, wins:0, mom:66, last5:[7,10,8,6,9] },
    { pos:5,  name:"Gio Ruggiero",        num:"17", team:"ThorSport",             pts:467, wins:0, mom:64, last5:[8,7,10,8,7] },
    { pos:6,  name:"Ty Majeski",          num:"88", team:"ThorSport",             pts:400, wins:0, mom:60, last5:[10,9,11,10,8] },
    { pos:7,  name:"Ben Rhodes",          num:"99", team:"ThorSport",             pts:386, wins:0, mom:58, last5:[11,12,9,11,10] },
    { pos:8,  name:"Daniel Hemric",       num:"19", team:"TRICON Garage",         pts:376, wins:0, mom:56, last5:[12,11,12,9,11] },
    { pos:9,  name:"Grant Enfinger",      num:"9",  team:"CR7 Motorsports",       pts:356, wins:1, mom:62, last5:[13,6,13,7,4] },
    { pos:10, name:"Stewart Friesen",     num:"52", team:"Halmar-Friesen",        pts:336, wins:0, mom:50, last5:[14,13,14,12,13] },
  ],
};

// Date the STATIC_SCHEDULES/FALLBACK_DRIVERS baseline data was last hand-verified against real results.
// Shown in the race banner whenever the app falls back to this static data (live API unreachable).
const STATIC_DATA_LAST_UPDATED = "2026-07-19";

// Merge live standings with static ratings
function mergeDriverData(liveDrivers) {
  return liveDrivers.map(d => ({
    ...d,
    ...(STATIC_DRIVER_RATINGS[d.name] || { skill:70, spd:162.0, aero:6, chaosAvoid:6 }),
  }));
}

// Cross-reference the roster against a confirmed entry list (/api/entrylist):
// - marks each known driver confirmed/not-confirmed for that race
// - dynamically adds substitute drivers who are entered but not in our roster,
//   with estimated ratings since we have no career-stat scouting for them yet
function crossReferenceEntryList(drivers, entries) {
  if (!entries || !entries.length) return drivers;
  const entryNames = new Set(entries.map(e=>e.name));
  const rosterNames = new Set(drivers.map(d=>d.name));
  const merged = drivers.map(d => ({ ...d, confirmed: entryNames.has(d.name) }));
  const subs = entries
    .filter(e => e.name && e.name!=="TBD" && !rosterNames.has(e.name))
    .map(e => ({
      name: e.name, num: e.num||"--", team: e.team||"Independent",
      pts:0, wins:0, mom:50,
      skill:72, spd:161.0, aero:6, chaosAvoid:6,
      confirmed:true, sub:true,
    }));
  return [...merged, ...subs];
}

const SERIES_CONFIG = {
  cup:   { label:"Cup Series",      short:"CUP", chase:"Top 16 after R26", ptWin:55, color:"#FF4E00" },
  xfin:  { label:"O'Reilly Series", short:"XFI", chase:"Top 12 after R24", ptWin:55, color:"#3b82f6" },
  truck: { label:"Truck Series",    short:"TRK", chase:"Top 10 after R18", ptWin:55, color:"#22c55e" },
};

// -- SCHEDULE  -  fetched live from /api/schedule, falls back to computed dates --
// done/next are computed at runtime by the API based on today's date
// This static version is only used if the API is unreachable
function computeSchedule(races) {
  // done = has a confirmed winner, OR date was yesterday or earlier
  // This way: race-day shows as NEXT, not done
  // "next" is simply the first non-done race in chronological order -- this already finds
  // the correct next race across any bye-week gap (7 days, 3 weeks, whatever), so it's a
  // strict superset of "find a race within 7 days, else next chronological race": there's
  // no separate 7-day branch needed because this logic never stops looking past 7 days.
  //
  // IMPORTANT: race dates are US Eastern calendar dates (NASCAR schedule). Using
  // new Date().toISOString() here would compute the boundary in UTC, which rolls to the
  // next calendar day at 8pm ET / 5pm PT -- marking the current day's race "done" with no
  // winner hours before it actually runs. Anchor to America/New_York instead.
  const now = new Date();
  const etDateString = d => new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  const yesterday = etDateString(new Date(now - 86400000));
  let nextSet = false;
  return races.map(r => {
    const isPast = !!r.winner || r.date <= yesterday;
    const isNext = !isPast && !nextSet && !r.exhib;
    if (isNext) nextSet = true;
    return { ...r, done: isPast, next: isNext };
  });
}

const STATIC_SCHEDULES = {
  // CUP  -  full 2026 season, verified against actual results through Race 22 (Atlanta, July 12)
  // Next race: Window World 450 at North Wilkesboro, July 19 (today)
  cup: computeSchedule([
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
    { id:"texas",        name:"Würth 400",                    date:"2026-05-03", type:"Intermediate",  miles:1.50, geo:"D-Shape",       chaos:.61, winner:"Chase Elliott"          },
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
    { id:"nwilkes",      name:"Window World 450",             date:"2026-07-19", type:"Short Track",   miles:0.63, geo:"Oval",          chaos:.73, winner:"Joey Logano"            },
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
  ]),
  xfin: computeSchedule([
    { id:"daytona_x",     name:"United Rentals 300",         date:"2026-02-14", type:"Superspeedway", miles:2.50, geo:"Tri-Oval",     chaos:.90, winner:"Austin Hill"          },
    { id:"atlanta_x",     name:"General Tire 200",           date:"2026-02-21", type:"Superspeedway", miles:1.54, geo:"D-Shape",      chaos:.87, winner:"Sheldon Creed"        },
    { id:"cota_x",        name:"EchoPark GP Xfinity",        date:"2026-02-28", type:"Road Course",   miles:3.41, geo:"Road Course",  chaos:.71, winner:"Shane van Gisbergen"  },
    { id:"phoenix_x",     name:"Nikola Truck Challenge",     date:"2026-03-07", type:"Short Track",   miles:1.00, geo:"D-Shape",      chaos:.66, winner:"Justin Allgaier"      },
    { id:"lv_x",          name:"Boyd Gaming 300",            date:"2026-03-14", type:"Intermediate",  miles:1.50, geo:"D-Shape",      chaos:.61, winner:"Kyle Larson"          },
    { id:"darlington_x",  name:"Baptist Health 200",         date:"2026-03-21", type:"Intermediate",  miles:1.37, geo:"Stripe",       chaos:.60, winner:"Justin Allgaier"      },
    { id:"martin_x",      name:"NFPA 250",                   date:"2026-03-28", type:"Short Track",   miles:0.53, geo:"Paperclip",    chaos:.74, winner:"Justin Allgaier"      },
    { id:"rockingham_x",  name:"Mecum 250",                  date:"2026-04-04", type:"Short Track",   miles:1.017,geo:"Oval",         chaos:.67, winner:"William Sawalich"     },
    { id:"bristol_x",     name:"Hooters 250",                date:"2026-04-11", type:"Short Track",   miles:0.53, geo:"Bowl",         chaos:.78, winner:"Connor Zilisch"       },
    { id:"kansas_x",      name:"Fr8 200",                    date:"2026-04-18", type:"Intermediate",  miles:1.50, geo:"D-Shape",      chaos:.60, winner:"Taylor Gray"          },
    { id:"talladega_x",   name:"AG-Pro 300",                 date:"2026-04-25", type:"Superspeedway", miles:2.66, geo:"Tri-Oval",     chaos:.93, winner:"Corey Day"            },
    { id:"texas_x",       name:"SpeedyCash.com 300",         date:"2026-05-02", type:"Intermediate",  miles:1.50, geo:"D-Shape",      chaos:.61, winner:"Kyle Larson"          },
    { id:"watkins_glen_x",name:"Bully Hill Vineyards 200",   date:"2026-05-09", type:"Road Course",   miles:2.45, geo:"Road Course",  chaos:.74, winner:"Connor Zilisch"       },
    { id:"dover_x",       name:"A-1 Solar 200",              date:"2026-05-16", type:"Short Track",   miles:1.00, geo:"Concrete Bowl",chaos:.68, winner:"Corey Day"            },
    { id:"charlotte_x",   name:"Alsco Uniforms 300",         date:"2026-05-23", type:"Intermediate",  miles:1.50, geo:"D-Shape",      chaos:.59, winner:"Ross Chastain"        },
    { id:"nashville_x",   name:"Tennessee Lottery 250",      date:"2026-05-30", type:"Intermediate",  miles:1.33, geo:"D-Shape",      chaos:.63, winner:"Justin Allgaier"      },
    { id:"pocono_x",      name:"Pocono Green 225",           date:"2026-06-13", type:"Superspeedway", miles:2.50, geo:"Tri-Oval",     chaos:.84, winner:"Justin Allgaier"      },
    { id:"coronado_x",    name:"Navy 250 Xfinity",           date:"2026-06-20", type:"Street Course", miles:2.03, geo:"Road Course",  chaos:.79, winner:"Austin Hill"          },
    { id:"sonoma_x",      name:"W.M. America's Tire 200",    date:"2026-06-27", type:"Road Course",   miles:2.52, geo:"Road Course",  chaos:.70, winner:"Shane van Gisbergen"  },
    { id:"chicagoland_x", name:"eero 200",                   date:"2026-07-04", type:"Intermediate",  miles:1.50, geo:"D-Shape",      chaos:.64, winner:"Brandon Jones"        },
    { id:"atlanta_x2",    name:"Kubota 200",                 date:"2026-07-11", type:"Superspeedway", miles:1.54, geo:"D-Shape",      chaos:.87, winner:"Justin Allgaier"      },
    { id:"nwilkes_x",     name:"Window World 250",           date:"2026-07-18", type:"Short Track",   miles:0.63, geo:"Oval",         chaos:.72, winner:"Justin Allgaier" },
    { id:"iowa_x",        name:"Iowa 250",                   date:"2026-08-08", type:"Short Track",   miles:0.875,geo:"Oval",         chaos:.67 },
    { id:"daytona_x2",    name:"Wawa 250",                   date:"2026-08-28", type:"Superspeedway", miles:2.50, geo:"Tri-Oval",     chaos:.91 },
  ]),
  truck: computeSchedule([
    { id:"daytona_t",     name:"Fresh From Florida 250",     date:"2026-02-13", type:"Superspeedway",   miles:2.50, geo:"Tri-Oval",     chaos:.91, winner:"Chandler Smith" },
    { id:"atlanta_t",     name:"Fr8 208",                    date:"2026-02-21", type:"Superspeedway",   miles:1.54, geo:"D-Shape",      chaos:.88, winner:"Kyle Busch"     },
    { id:"stpete_t",      name:"OnlyBulls Green Flag 150",   date:"2026-02-28", type:"Street Course",    miles:1.30, geo:"Road Course",  chaos:.77, winner:"Layne Riggs"    },
    { id:"darlington_t",  name:"Buckle Up South Carolina 200",date:"2026-03-20", type:"Intermediate",   miles:1.37, geo:"Stripe",       chaos:.66, winner:"Corey Heim"     },
    { id:"rockingham_t",  name:"Black's Tire 200",           date:"2026-04-03", type:"Short Track",      miles:1.017,geo:"Oval",         chaos:.70, winner:"Corey Heim"     },
    { id:"bristol_t",     name:"Tennessee Army Nat'l Guard 250",date:"2026-04-10",type:"Dirt Short Track",miles:0.53, geo:"Bowl",        chaos:.85, winner:"Christopher Bell" },
    { id:"texas_t",       name:"SpeedyCash.com 250",         date:"2026-05-01", type:"Intermediate",     miles:1.50, geo:"D-Shape",      chaos:.61, winner:"Carson Hocevar" },
    { id:"watkins_glen_t",name:"Bully Hill Vineyards 176",   date:"2026-05-08", type:"Road Course",      miles:2.45, geo:"Road Course",  chaos:.74, winner:"Kaden Honeycutt"},
    { id:"dover_t",       name:"Ecosave 200",                date:"2026-05-15", type:"Short Track",      miles:1.00, geo:"Concrete Bowl",chaos:.68, winner:"Kyle Busch"     },
    { id:"charlotte_t",   name:"NC Education Lottery 200",   date:"2026-05-24", type:"Intermediate",     miles:1.50, geo:"D-Shape",      chaos:.60, winner:"Layne Riggs"    },
    { id:"nashville_t",   name:"Allegiance 200",             date:"2026-05-29", type:"Intermediate",     miles:1.33, geo:"D-Shape",      chaos:.63, winner:"Layne Riggs"    },
    { id:"michigan_t",    name:"DQS Solutions & Staffing 250",date:"2026-06-06",type:"Superspeedway",    miles:2.00, geo:"D-Shape",      chaos:.80, winner:"Corey Heim"     },
    { id:"coronado_t",    name:"Navy 250",                   date:"2026-06-19", type:"Street Course",    miles:2.03, geo:"Road Course",  chaos:.80, winner:"Layne Riggs"    },
    { id:"limerock_t",    name:"LiUNA! 150",                 date:"2026-07-11", type:"Road Course",      miles:1.50, geo:"Road Course",  chaos:.72, winner:"Grant Enfinger" },
    { id:"nwilkes_t",     name:"FaithFest 250",              date:"2026-07-18", type:"Short Track",      miles:0.63, geo:"Oval",         chaos:.72, winner:"Chandler Smith" },
    { id:"iowa_t",        name:"US Cellular 225",            date:"2026-08-07", type:"Short Track",      miles:0.875,geo:"Oval",         chaos:.68 },
    { id:"daytona_t2",    name:"Wawa 250 Trucks",            date:"2026-08-27", type:"Superspeedway",    miles:2.50, geo:"Tri-Oval",     chaos:.91 },
  ]),
};

// -- SIMULATION ENGINE -- extracted to lib/sim.js so the cron/scorecard job can share it

// -- HELPERS -------------------------------------------------------------------
const DRIVER_COLORS=["#FF4E00","#FFD700","#22c55e","#3b82f6","#BA80F8","#f97316","#ec4899","#06b6d4"];
const MFG_COLORS={ Toyota:"#EB0A1E", Chevrolet:"#FFD700", Ford:"#3b82f6" };
const fmtDate = s=>new Date(s+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"});
const daysUntil = s=>Math.ceil((new Date(s+"T12:00:00")-new Date())/86400000);
// HOT badge: top-5 finish in 3 of the last 5 races
const isHot = last5 => (last5||[]).filter(f=>f<=5).length >= 3;

// -- COMPONENTS ----------------------------------------------------------------
function PrismLogo(){ return <svg width="30" height="30" viewBox="0 0 36 36" fill="none"><polygon points="18,2 34,30 2,30" stroke="#FF4E00" strokeWidth="2" fill="none"/><polygon points="18,8 30,28 6,28" stroke="#FF8C00" strokeWidth="1" fill="rgba(255,76,0,0.08)"/><line x1="18" y1="2" x2="18" y2="30" stroke="#FFD700" strokeWidth="0.6" opacity="0.7"/></svg>; }
function Bar({pct,color,max}){ const w=Math.min((parseFloat(pct)/max)*100,100); return <div style={{height:"5px",borderRadius:"3px",background:"rgba(255,255,255,0.07)",overflow:"hidden",flex:1}}><div style={{height:"100%",width:`${w}%`,background:color,borderRadius:"3px",transition:"width 0.9s ease"}}/></div>; }
function Spin(){ return <svg width="36" height="36" viewBox="0 0 48 48" style={{animation:"spin 0.9s linear infinite"}}><circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,78,0,0.15)" strokeWidth="3"/><circle cx="24" cy="24" r="20" fill="none" stroke="#FF4E00" strokeWidth="3" strokeDasharray="28 97" strokeLinecap="round"/></svg>; }

const ChartTip = ({ active, payload, label }) => {
  if(!active||!payload?.length) return null;
  return <div style={{background:"rgba(8,8,18,0.97)",border:"1px solid rgba(255,78,0,0.25)",borderRadius:"9px",padding:"9px 13px",fontFamily:"'Barlow Condensed',sans-serif"}}>
    <div style={{fontSize:"9px",color:"rgba(255,255,255,0.80)",letterSpacing:"0.1em",marginBottom:"5px"}}>LAP {label}</div>
    {[...payload].sort((a,b)=>b.value-a.value).slice(0,5).map(p=><div key={p.dataKey} style={{display:"flex",justifyContent:"space-between",gap:"14px",color:p.color,fontSize:"11px",marginBottom:"2px"}}><span>{p.dataKey}</span><span style={{fontWeight:800}}>{p.value}%</span></div>)}
  </div>;
};

// -- AI SCOUT SUMMARY fetcher --------------------------------------------------
async function fetchDriverSummary(d, race, rank, series, driverCount) {
  const h = d.hist || {};
  const seriesLabel = SERIES_CONFIG[series].label;
  const prompt = `You are a sharp NASCAR analyst writing a brief scouting note for a prediction sheet.

Driver: ${d.name} | Sim rank: #${rank} of ${driverCount} | Series: ${seriesLabel}
Race: ${race.name} | Track type: ${race.type} (${race.geo} geometry) | Chaos level: ${(race.chaos*100).toFixed(0)}%

Key stats:
- Season: ${d.pts||0} pts, ${d.wins} wins, momentum ${d.mom}/100, skill ${d.skill}/100
- Chaos avoidance: ${d.chaosAvoid}/10 | Simulated DNF risk: ${d.dnfPct||0}%
- Chaos sim bonus: ${d.chaosBonus>0?"+":""}${d.chaosBonus} pts
- Track history at this geometry: ${h.starts||0} starts, ${h.wins||0} wins, avg finish ${h.avg||"N/A"}, top-5 rate ${h.starts?Math.round((h.top5||0)/h.starts*100):0}%
- Win prob: ${d.winPct}% | Top-5: ${d.top5Pct}%
${d.rookie?" - NOTE: Rookie driver":""}${d.sub?" - NOTE: Substitute driver":""}

Write EXACTLY 3 sentences. No headers. No bullet points. No fluff.
Sentence 1: The 1-2 biggest factors that earned them rank #${rank} in the simulation.
Sentence 2: How their chaos avoidance rating (${d.chaosAvoid}/10) specifically plays out at a ${race.chaos>0.8?"high":"moderate"}-chaos ${race.type} like this one.
Sentence 3: Their single biggest vulnerability or risk to watch -- what could knock them out of contention.
Use last name only after first mention. Be direct and specific.`;

  // Route through /api/scout proxy (keeps API key server-side, fixes CORS)
  const res = await fetch("/api/scout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.text || "Summary unavailable.";
}

// -- EXPANDABLE DRIVER ROW  -  track history + AI scout note --------------------
function TrackHistRow({ d, rank, isStd, isDH, isLS, maxWin, series, race, isTop10 }) {
  const [open, setOpen] = useState(false);
  const [aiSummary, setAiSummary] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const h = d.hist || {};
  const hasHist = h.starts > 0;
  const rankColors = ["#FFD700","#C0C0C0","#CD7F32"];
  const chaosColor = d.chaosAvoid >= 8 ? "#22c55e" : d.chaosAvoid >= 6 ? "#FFD700" : "#FF4E00";
  const dnfNum = parseFloat(d.dnfPct || 0);
  const accentColor = isStd?"#FF8C00":isDH?"#BA80F8":isLS?"#06b6d4":"rgba(255,255,255,0.60)";
  const bgColor = isStd?"rgba(255,78,0,0.06)":isDH?"rgba(138,43,226,0.06)":isLS?"rgba(6,182,212,0.05)":"rgba(255,255,255,0.02)";
  const borderColor = isStd?"rgba(255,78,0,0.28)":isDH?"rgba(138,43,226,0.28)":isLS?"rgba(6,182,212,0.25)":"rgba(255,255,255,0.06)";

  async function handleToggle() {
    const next = !open;
    setOpen(next);
    if (next && isTop10 && !aiSummary && !aiLoading) {
      setAiLoading(true);
      try {
        const s = await fetchDriverSummary(d, race, rank, series, (series==='cup'?25:series==='xfin'?16:series==='truck'?15:25));
        setAiSummary(s);
      } catch(e) {
        setAiSummary("Scout note unavailable -- check API connection.");
      }
      setAiLoading(false);
    }
  }

  return (
    <div style={{background:bgColor,border:`1px solid ${borderColor}`,borderRadius:"11px",overflow:"hidden",marginBottom:"6px",opacity:d.confirmed===false?0.45:1}}>

      {/* -- Main collapsed row */}
      <div style={{padding:"11px 14px",display:"grid",gridTemplateColumns:"26px 1fr auto auto",gap:"10px",alignItems:"center",position:"relative"}}>
        {(isStd||isDH||isLS) && <div style={{position:"absolute",top:"6px",right:"50px",fontSize:"8px",fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:"0.1em",fontWeight:800,color:accentColor}}>{isStd?"# STANDARD PICK":isDH?"* DARK HORSE":"! LONG SHOT"}</div>}

        <div style={{textAlign:"center"}}>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:"14px",fontWeight:800,color:rankColors[rank-1]||"rgba(255,255,255,0.65)"}}>{rank}</div>
          <div style={{fontSize:"8px",color:"rgba(255,255,255,0.72)"}}>#{d.num}</div>
        </div>

        <div>
          <div style={{display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap"}}>
            {d.confirmed===true && <span title="Confirmed entry" style={{width:"6px",height:"6px",borderRadius:"50%",background:"#22c55e",flexShrink:0}}/>}
            <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:"15px",fontWeight:700,color:"#f0e8e0"}}>{d.name}</span>
            {d.rookie && <span style={{fontSize:"7px",background:"rgba(34,197,94,0.1)",border:"1px solid rgba(34,197,94,0.25)",borderRadius:"3px",padding:"1px 4px",color:"#22c55e"}}>ROOKIE</span>}
            {(d.sub||d.parttime) && <span style={{fontSize:"7px",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"3px",padding:"1px 4px",color:"rgba(255,255,255,0.82)"}}>{d.sub?"SUB":"PART"}</span>}
            {isHot(d.last5) && <span style={{fontSize:"7px",background:"rgba(255,78,0,0.12)",border:"1px solid rgba(255,78,0,0.35)",borderRadius:"3px",padding:"1px 4px",color:"#FF6A00",fontWeight:700}}>HOT</span>}
            <span style={{fontSize:"7px",background:`${chaosColor}18`,border:`1px solid ${chaosColor}44`,borderRadius:"3px",padding:"1px 5px",color:chaosColor,fontWeight:700}}>CHAOS {d.chaosAvoid}/10</span>
            {dnfNum > 7 && <span style={{fontSize:"7px",background:"rgba(255,78,0,0.1)",border:"1px solid rgba(255,78,0,0.3)",borderRadius:"3px",padding:"1px 5px",color:"#FF6A00",fontWeight:700}}>DNF~{d.dnfPct}%</span>}
          </div>
          <div style={{fontSize:"9px",color:"rgba(255,255,255,0.78)",marginBottom:"5px"}}>{d.team} - {d.pts||""}pts - {d.wins}W{d.manufacturer && <span style={{color:MFG_COLORS[d.manufacturer]||"rgba(255,255,255,0.6)",fontWeight:700}}> - {d.manufacturer}</span>}</div>
          <div style={{display:"flex",alignItems:"center",gap:"7px"}}>
            <Bar pct={d.winPct} color={isStd?"#FF6A00":isDH?"#BA80F8":isLS?"#06b6d4":"#2a2a3a"} max={maxWin}/>
            <span style={{fontSize:"9px",color:"rgba(255,255,255,0.75)",whiteSpace:"nowrap"}}>T5:{d.top5Pct}%</span>
          </div>
        </div>

        <div style={{textAlign:"right"}}>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:"21px",fontWeight:900,color:accentColor,lineHeight:1}}>{d.winPct}%</div>
          <div style={{fontSize:"8px",color:"rgba(255,255,255,0.65)"}}>WIN PROB</div>
        </div>

        <button onClick={handleToggle} style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:"6px",padding:"4px 8px",cursor:"pointer",fontFamily:"'Barlow Condensed',sans-serif",fontSize:"11px",fontWeight:700,color:"rgba(255,255,255,0.85)",letterSpacing:"0.05em",whiteSpace:"nowrap",transition:"all 0.12s"}}>
          {open ? "^ HIDE" : "v INFO"}
        </button>
      </div>

      {/* -- Expanded panel */}
      {open && (
        <div style={{borderTop:"1px solid rgba(255,255,255,0.06)",background:"rgba(0,0,0,0.28)"}}>

          {/* SECTION 1: AI Scout Note (top 10 only) */}
          {isTop10 && (
            <div style={{padding:"13px 14px 12px",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
              <div style={{fontSize:"8px",color:"#FF8C00",letterSpacing:"0.14em",marginBottom:"8px",display:"flex",alignItems:"center",gap:"8px",fontWeight:800}}>
                * CREW CHIEF NOTES
                {aiLoading && <span style={{fontSize:"7px",color:"rgba(255,255,255,0.50)",fontWeight:400,animation:"pulse 1.5s infinite"}}>GENERATING...</span>}
              </div>
              {aiLoading && (
                <div style={{display:"flex",flexDirection:"column",gap:"7px"}}>
                  {[95,82,68].map(w => (
                    <div key={w} style={{height:"11px",borderRadius:"4px",width:`${w}%`,background:"linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.1) 50%,rgba(255,255,255,0.04) 75%)",backgroundSize:"200% 100%",animation:"shimmer 1.4s infinite"}}/>
                  ))}
                </div>
              )}
              {aiSummary && !aiLoading && (
                <div style={{fontSize:"12px",color:"rgba(255,255,255,0.90)",lineHeight:1.7,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:400}}>
                  {aiSummary}
                </div>
              )}
            </div>
          )}

          {/* SECTION 2: Chaos profile bar */}
          <div style={{padding:"11px 14px 10px",borderBottom:"1px solid rgba(255,255,255,0.05)",display:"flex",gap:"20px",alignItems:"center",flexWrap:"wrap"}}>
            <div>
              <div style={{fontSize:"8px",color:"rgba(255,255,255,0.55)",letterSpacing:"0.12em",marginBottom:"4px"}}>CHAOS AVOIDANCE</div>
              <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                <div style={{display:"flex",gap:"3px"}}>
                  {[1,2,3,4,5,6,7,8,9,10].map(i => (
                    <div key={i} style={{width:"14px",height:"8px",borderRadius:"2px",background: i <= d.chaosAvoid ? chaosColor : "rgba(255,255,255,0.08)"}}/>
                  ))}
                </div>
                <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:"16px",fontWeight:800,color:chaosColor}}>{d.chaosAvoid}/10</span>
              </div>
            </div>
            <div>
              <div style={{fontSize:"8px",color:"rgba(255,255,255,0.55)",letterSpacing:"0.12em",marginBottom:"4px"}}>CHAOS BONUS IN SIM</div>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:"16px",fontWeight:800,color:d.chaosBonus>=0?"#22c55e":"#FF4E00"}}>{d.chaosBonus>=0?"+":""}{d.chaosBonus} pts</div>
            </div>
            <div>
              <div style={{fontSize:"8px",color:"rgba(255,255,255,0.55)",letterSpacing:"0.12em",marginBottom:"4px"}}>SIM DNF RATE</div>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:"16px",fontWeight:800,color:dnfNum>12?"#FF4E00":dnfNum>7?"#FF8C00":"#22c55e"}}>{d.dnfPct}%</div>
            </div>
            <div style={{fontSize:"9px",color:"rgba(255,255,255,0.55)",fontFamily:"'IBM Plex Mono',monospace",lineHeight:1.5}}>
              Track chaos: {(race?.chaos*100||0).toFixed(0)}% | {d.chaosAvoid>=8?"Clean racer, avoids incidents well":d.chaosAvoid>=6?"Decent incident avoidance":"High incident risk at chaotic tracks"}
            </div>
          </div>

          {/* SECTION 3: Track history (original, untouched) */}
          {hasHist && (
            <div style={{padding:"12px 14px 14px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
                <div style={{fontSize:"9px",color:"rgba(255,255,255,0.75)",letterSpacing:"0.1em"}}>
                  TRACK HISTORY | {h.starts} STARTS | {h.yearRange || "2023-2026"}
                </div>
                {/* Live vs static badge */}
                <div style={{fontSize:"7px",padding:"2px 6px",borderRadius:"4px",fontFamily:"'IBM Plex Mono',monospace",letterSpacing:"0.08em",
                  background: d.histSource==="live" ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.04)",
                  border: d.histSource==="live" ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(255,255,255,0.08)",
                  color: d.histSource==="live" ? "#22c55e" : "rgba(255,255,255,0.35)",
                }}>
                  {d.histSource==="live" ? "LIVE | racing-reference.info" : "STATIC BASELINE"}
                </div>
              </div>

              {/* Recent finishes sparkline */}
              {h.recentFinishes?.length > 0 && (
                <div style={{display:"flex",gap:"5px",alignItems:"flex-end",marginBottom:"12px",height:"32px"}}>
                  <div style={{fontSize:"7px",color:"rgba(255,255,255,0.35)",alignSelf:"center",marginRight:"4px",letterSpacing:"0.08em"}}>RECENT</div>
                  {h.recentFinishes.map((fin, i) => {
                    const barH = Math.max(4, Math.round((1 - (fin-1)/35) * 28));
                    const col = fin===1?"#FFD700":fin<=3?"#FF8C00":fin<=5?"#22c55e":fin<=10?"#3b82f6":fin<=20?"rgba(255,255,255,0.3)":"rgba(255,78,0,0.4)";
                    return (
                      <div key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"2px"}}>
                        <div style={{width:"18px",height:`${barH}px`,background:col,borderRadius:"2px 2px 0 0"}}/>
                        <div style={{fontSize:"7px",color:"rgba(255,255,255,0.5)",fontFamily:"'IBM Plex Mono',monospace"}}>{fin}</div>
                      </div>
                    );
                  })}
                  <div style={{fontSize:"7px",color:"rgba(255,255,255,0.2)",alignSelf:"center",marginLeft:"4px"}}>last {h.recentFinishes.length} races here</div>
                </div>
              )}

              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"8px",marginBottom:"12px"}}>
                {[["TOP 20",h.top20,h.starts,"#888"],["TOP 10",h.top10,h.starts,"#3b82f6"],["TOP 5",h.top5,h.starts,"#22c55e"],["TOP 3",h.top3,h.starts,"#FFD700"]].map(([label,val,denom,color]) => (
                  <div key={label} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"8px",padding:"10px 8px",textAlign:"center"}}>
                    <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:"22px",fontWeight:900,color,lineHeight:1}}>{val}</div>
                    <div style={{fontSize:"7px",color:"rgba(255,255,255,0.75)",marginBottom:"6px",letterSpacing:"0.08em"}}>{label}</div>
                    <div style={{height:"4px",background:"rgba(255,255,255,0.06)",borderRadius:"2px",overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${Math.min((val/Math.max(denom,1))*100,100)}%`,background:color,borderRadius:"2px"}}/>
                    </div>
                    <div style={{fontSize:"8px",color:"rgba(255,255,255,0.80)",marginTop:"4px"}}>{denom>0?Math.round(val/denom*100):0}%</div>
                  </div>
                ))}
              </div>
              <div style={{display:"flex",gap:"16px",flexWrap:"wrap"}}>
                {[["WINS",h.wins,"#FF8C00"],["AVG FINISH",h.avg,"#f97316"],["TRACK APT",`+${h.apt}`,"#BA80F8"]].map(([l,v,c]) => (
                  <div key={l}>
                    <div style={{fontSize:"8px",color:"rgba(255,255,255,0.70)",letterSpacing:"0.1em"}}>{l}</div>
                    <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:"18px",fontWeight:900,color:c}}>{v}</div>
                  </div>
                ))}
                <div style={{flex:1,textAlign:"right",fontSize:"9px",color:"rgba(255,255,255,0.65)",fontFamily:"'IBM Plex Mono',monospace",lineHeight:1.6}}>
                  History factors into win probability<br/>(+{Math.round(((h.wins*4+h.top3*2+h.top5*1.2+h.top10*.8)/Math.max(h.starts,1)*8+Math.max(0,(30-h.avg)/30*6))*10)/10} composite pts)
                </div>
              </div>
            </div>
          )}
          {!hasHist && (
            <div style={{padding:"12px 14px",fontSize:"11px",color:"rgba(255,255,255,0.40)",fontFamily:"'IBM Plex Mono',monospace"}}>
              No track history on record at this geometry.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// -- SCORECARD VIEW -- prediction accuracy vs reality, sourced from api/scorecard.js --
const STAGE_LABELS = { post_race: "POST-RACE", lineups: "LINEUPS", post_quali: "POST-QUALI" };
function ScorecardView({ scorecard, status, cfg, series }) {
  if (status === "loading") {
    return <div style={{textAlign:"center",padding:"50px 20px",color:"rgba(255,255,255,0.55)"}}>
      <Spin/><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:"13px",marginTop:"10px",letterSpacing:"0.1em"}}>LOADING SCORECARD...</div>
    </div>;
  }
  if (status === "failed" || !scorecard) {
    return <div style={{textAlign:"center",padding:"50px 20px",color:"rgba(255,255,255,0.55)"}}>
      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:"13px",letterSpacing:"0.1em"}}>SCORECARD UNAVAILABLE</div>
      <div style={{fontSize:"10px",color:"rgba(255,255,255,0.35)",marginTop:"6px"}}>No graded predictions yet, or the API is unreachable.</div>
    </div>;
  }
  const stages = ["post_race","lineups","post_quali"];
  const pending = scorecard.pending;
  return (
    <div>
      {pending && (
        <div style={{background:"rgba(255,78,0,0.05)",border:"1px solid rgba(255,78,0,0.2)",borderRadius:"11px",padding:"12px 14px",marginBottom:"14px"}}>
          <div style={{fontSize:"9px",color:"#FF8C00",letterSpacing:"0.1em",marginBottom:"3px",fontWeight:800}}>UP NEXT - PICK AS OF EACH STAGE</div>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:"18px",fontWeight:900,marginBottom:"10px"}}>{pending.raceName}</div>
          <div style={{display:"flex",gap:"14px",flexWrap:"wrap"}}>
            {stages.map(stage=>{
              const s = pending.stages?.[stage];
              return (
                <div key={stage}>
                  <div style={{fontSize:"7px",color:cfg.color,letterSpacing:"0.1em",fontWeight:800,marginBottom:"2px"}}>{STAGE_LABELS[stage]}</div>
                  <div style={{fontSize:"13px",fontWeight:700,color:s?"#f0e8e0":"rgba(255,255,255,0.30)"}}>{s?s.pick:"not yet"}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div style={{fontSize:"10px",color:"rgba(255,255,255,0.55)",letterSpacing:"0.12em",marginBottom:"10px"}}>
        PREDICTION ACCURACY - {cfg.label.toUpperCase()} - how our pre-race sim compares to real results, at each stage of information
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px",marginBottom:"16px"}}>
        {stages.map(stage=>{
          const s = scorecard.summary?.[stage] || {};
          return (
            <div key={stage} style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"11px",padding:"12px 10px"}}>
              <div style={{fontSize:"8px",color:cfg.color,letterSpacing:"0.1em",marginBottom:"8px",fontWeight:800}}>{STAGE_LABELS[stage]}</div>
              <div style={{fontSize:"22px",fontWeight:900,color:"#f0e8e0",lineHeight:1}}>{s.winnerHitRate!=null?`${s.winnerHitRate}%`:"-"}</div>
              <div style={{fontSize:"7px",color:"rgba(255,255,255,0.55)",marginBottom:"8px"}}>WINNER HIT RATE</div>
              <div style={{fontSize:"14px",fontWeight:700,color:"rgba(255,255,255,0.85)"}}>{s.top5HitRate!=null?`${s.top5HitRate}%`:"-"}</div>
              <div style={{fontSize:"7px",color:"rgba(255,255,255,0.55)",marginBottom:"8px"}}>TOP-5 HIT RATE</div>
              <div style={{fontSize:"12px",fontWeight:700,color:"rgba(255,255,255,0.70)"}}>{s.avgBrier!=null?s.avgBrier:"-"}</div>
              <div style={{fontSize:"7px",color:"rgba(255,255,255,0.55)"}}>AVG BRIER (lower=better)</div>
              <div style={{fontSize:"7px",color:"rgba(255,255,255,0.35)",marginTop:"6px"}}>{s.graded||0} races graded</div>
            </div>
          );
        })}
      </div>
      {(!scorecard.races || scorecard.races.length===0) && (
        <div style={{textAlign:"center",padding:"30px 20px",color:"rgba(255,255,255,0.40)",fontSize:"11px"}}>
          No graded races yet -- the cron job needs to run at least once after a race completes.
        </div>
      )}
      {scorecard.races?.map(race=>(
        <div key={race.raceId} style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"10px",padding:"11px 13px",marginBottom:"6px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"6px"}}>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:"14px",fontWeight:700}}>{race.raceName}</div>
            <div style={{fontSize:"10px",color:"#FFD700"}}>WIN: {race.winner}</div>
          </div>
          <div style={{display:"flex",gap:"10px",flexWrap:"wrap"}}>
            {stages.map(stage=>{
              const s = race.stages?.[stage];
              if(!s) return null;
              return (
                <div key={stage} style={{fontSize:"9px",color:"rgba(255,255,255,0.55)"}}>
                  <span style={{color:cfg.color,fontWeight:700}}>{STAGE_LABELS[stage]}:</span>{" "}
                  <span style={{color:s.winnerHit?"#22c55e":"rgba(255,255,255,0.55)"}}>{s.pick||"-"}</span>
                  {s.winnerHit && <span style={{color:"#22c55e"}}> v WIN</span>}
                  {!s.winnerHit && s.top5Hit && <span style={{color:"#FFD700"}}> - TOP5</span>}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ===============================================================================
// MAIN APP
// ===============================================================================
export default function FinalLap(){
  const [series, setSeries] = useState("cup");
  const [results, setResults] = useState(null);
  const [simulating, setSimulating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [tab, setTab] = useState("picks");
  const [chart, setChart] = useState(null);
  const [liveRunning, setLiveRunning] = useState(false);
  const [liveFrame, setLiveFrame] = useState(0);
  const [vis, setVis] = useState({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [view, setView] = useState("predict"); // predict | scorecard
  const [scorecard, setScorecard] = useState(null);
  const [scorecardStatus, setScorecardStatus] = useState("idle"); // idle | loading | live | failed
  const ivRef = useRef(null); const liveRef = useRef(null);

  // -- LIVE DATA STATE ---------------------------------------------------------
  const [liveDrivers, setLiveDrivers] = useState({
    cup:   mergeDriverData(FALLBACK_DRIVERS.cup),
    xfin:  mergeDriverData(FALLBACK_DRIVERS.xfin),
    truck: mergeDriverData(FALLBACK_DRIVERS.truck),
  });
  const [liveSchedule, setLiveSchedule] = useState(STATIC_SCHEDULES);
  const [liveEntries, setLiveEntries] = useState(null);
  const [dataStatus, setDataStatus] = useState("loading");
  const [dataAsOf, setDataAsOf] = useState(null);

  // -- LIVE TRACK HISTORY STATE ---------------------------------------------
  // Keyed by "trackName|series" -> { driverName: { starts, wins, top5, ... } }
  const [liveTrackHistory, setLiveTrackHistory] = useState({});
  const [trackHistoryStatus, setTrackHistoryStatus] = useState("idle"); // idle | loading | live | failed

  // -- FINAL RESULTS STATE (official post-race results, sourced live from /api/results) ---
  // Keyed by "series-raceId" -> { winner, results, qualifying, recap, complete }
  const [raceResultsCache, setRaceResultsCache] = useState({});
  const [resultsStatus, setResultsStatus] = useState("idle"); // idle | loading | live | failed | pending

  // -- RECENT FORM STATE (real last-5 finishes per driver, from /api/recentform) -----------
  const [liveRecentForm, setLiveRecentForm] = useState({}); // seriesKey -> { driverName: [finishes] }

  // Real per-track driver history, computed server-side from NASCAR's official results
  // feed (api/tracktrends.js) -- keyed by the race's own date, no venue-name mapping needed.
  async function fetchTrackHistory(race, seriesKey) {
    const cacheKey = `${race.date}|${seriesKey}`;
    if (liveTrackHistory[cacheKey]) return; // already fetched

    setTrackHistoryStatus("loading");
    try {
      const url = `/api/tracktrends?series=${seriesKey}&date=${race.date}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.drivers && Object.keys(data.drivers).length > 0) {
        setLiveTrackHistory(prev => ({ ...prev, [cacheKey]: data.drivers }));
        setTrackHistoryStatus("live");
      } else {
        setTrackHistoryStatus("failed");
      }
    } catch (e) {
      setTrackHistoryStatus("failed");
    }
  }

  // Fetch official post-race results for a completed race (independent of our
  // hardcoded STATIC_SCHEDULES winner string -- this is the live source of truth)
  async function fetchRaceResults(race, seriesKey) {
    const cacheKey = `${seriesKey}-${race.id}`;
    if (raceResultsCache[cacheKey]) { setResultsStatus(raceResultsCache[cacheKey].complete ? "live" : "pending"); return; }

    setResultsStatus("loading");
    try {
      const res = await fetch(`/api/results?series=${seriesKey}&date=${race.date}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRaceResultsCache(prev => ({ ...prev, [cacheKey]: data }));
      setResultsStatus(data.complete ? "live" : "pending");
    } catch (e) {
      setResultsStatus("failed");
    }
  }

  // Real recent-form: last 5 finishes per driver, sourced from /api/recentform
  async function fetchRecentForm(seriesKey) {
    if (liveRecentForm[seriesKey]) return; // already fetched this session
    try {
      const res = await fetch(`/api/recentform?series=${seriesKey}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.drivers) {
        setLiveRecentForm(prev => ({ ...prev, [seriesKey]: data.drivers }));
      }
    } catch (e) { /* silent -- falls back to whatever last5 the driver object already has */ }
  }

  // Prediction-accuracy scorecard: how our pre-race sim snapshots (generated by the
  // cron job) compare to actual results, once graded.
  async function fetchScorecard(seriesKey) {
    setScorecardStatus("loading");
    try {
      const res = await fetch(`/api/scorecard?series=${seriesKey}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setScorecard(data);
      setScorecardStatus("live");
    } catch (e) {
      setScorecardStatus("failed");
    }
  }

  // Fetch all live data on mount and when series changes
  const fetchLiveData = useCallback(async (seriesKey) => {
    setDataStatus("loading");
    let anyLive = false;

    // 1. Fetch standings
    try {
      const res = await fetch(`/api/standings?series=${seriesKey}`);
      if (res.ok) {
        const data = await res.json();
        if (data.drivers?.length) {
          setLiveDrivers(prev => ({
            ...prev,
            [seriesKey]: mergeDriverData(data.drivers),
          }));
          setDataAsOf(data.asOf);
          anyLive = true;
        }
      }
    } catch(e) { /* silent fallback */ }

    // 2. Fetch schedule
    try {
      const [cupRes, xfinRes, truckRes] = await Promise.all([
        fetch("/api/schedule?series=cup"),
        fetch("/api/schedule?series=xfin"),
        fetch("/api/schedule?series=truck"),
      ]);
      const schedules = {};
      for (const [key, r] of [["cup",cupRes],["xfin",xfinRes],["truck",truckRes]]) {
        if (r.ok) {
          const d = await r.json();
          if (d.schedule?.length) { schedules[key] = d.schedule; anyLive = true; }
        }
      }
      if (Object.keys(schedules).length) {
        setLiveSchedule(prev => ({ ...prev, ...schedules }));
      }
    } catch(e) { /* silent fallback */ }

    // 3. Fetch entry list for next race
    try {
      const res = await fetch(`/api/entrylist?series=${seriesKey}`);
      if (res.ok) {
        const data = await res.json();
        if (data.entries?.length) { setLiveEntries(data.entries); anyLive = true; }
      }
    } catch(e) { /* silent fallback */ }

    setDataStatus(anyLive ? "live" : "fallback");
  }, []);

  // Fetch real recent-form (last 5 finishes per driver) whenever the series changes.
  // Kept as its own effect (not inside fetchLiveData's memoized callback) so the
  // "already fetched" cache check always sees the current liveRecentForm state.
  useEffect(() => {
    fetchRecentForm(series);
  }, [series]);

  // Fetch the scorecard whenever it's the active view, or the series changes while viewing it
  useEffect(() => {
    if (view === "scorecard") fetchScorecard(series);
  }, [view, series]);

  useEffect(() => {
    fetchLiveData(series);
  }, [series, fetchLiveData]);

  // Auto-refresh every 6 hours
  useEffect(() => {
    const interval = setInterval(() => fetchLiveData(series), 6 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [series, fetchLiveData]);

  // Derive current drivers and schedule from live state
  const currentDrivers = crossReferenceEntryList(liveDrivers[series] || mergeDriverData(FALLBACK_DRIVERS[series] || []), liveEntries);
  const currentSchedule = liveSchedule[series] || STATIC_SCHEDULES[series];
  const nextRace = currentSchedule.find(r => r.next) || currentSchedule.find(r => !r.done);
  const [selectedRace, setSelectedRace] = useState(null);

  // Auto-select next race when schedule loads
  useEffect(() => {
    const next = currentSchedule.find(r => r.next) || currentSchedule.find(r => !r.done && !r.exhib);
    // Only auto-set if nothing selected yet
    if (next && !selectedRace) {
      setSelectedRace(next);
    } else if (selectedRace) {
      // Only refresh the selected race data (e.g. winner update), don't change which race
      const refreshed = currentSchedule.find(r => r.id === selectedRace.id);
      if (refreshed && refreshed.id === selectedRace.id) setSelectedRace(refreshed);
    }
  }, [currentSchedule]);

  // When a race is selected, kick off live track history fetch in background
  useEffect(() => {
    if (selectedRace && !selectedRace.done) {
      fetchTrackHistory(selectedRace, series);
    }
  }, [selectedRace?.id, series]);

  // Fetch official results/qualifying live for any non-exhibition race -- qualifying is
  // often posted days before the race itself, so this fires regardless of selectedRace.done
  useEffect(() => {
    if (selectedRace && !selectedRace.exhib) {
      fetchRaceResults(selectedRace, series);
    } else {
      setResultsStatus("idle");
    }
  }, [selectedRace?.id, series]);

  function changeSeries(s){
    setSeries(s); setResults(null); setChart(null); setTab("picks");
    setSelectedRace(null); // triggers useEffect to set next race
  }

  function simulate(){
    if(!selectedRace||selectedRace.done) return;
    setSimulating(true); setResults(null); setChart(null); setProgress(0);
    let p=0;
    ivRef.current=setInterval(()=>{ p+=Math.random()*14+4; if(p>=92){clearInterval(ivRef.current);p=92;} setProgress(Math.min(p,92)); },80);
    setTimeout(()=>{
      clearInterval(ivRef.current); setProgress(97);
      // Merge real live track history, recent form, and qualifying into the driver pool
      const histCacheKey = `${selectedRace.date}|${series}`;
      const liveHist = liveTrackHistory[histCacheKey] || null;
      const recentForm = liveRecentForm[series] || null;
      const resultsCacheKey = `${series}-${selectedRace.id}`;
      const qualifying = raceResultsCache[resultsCacheKey]?.qualifying || null;
      const qualByName = qualifying ? Object.fromEntries(qualifying.map(q => [q.name, q.pos])) : null;

      const driversWithLiveHist = currentDrivers.map(d => {
        const scraped = liveHist?.[d.name];
        const form = recentForm?.[d.name];
        const qualPos = qualByName?.[d.name];
        return {
          ...d,
          ...(scraped && scraped.starts > 0 ? { _liveHist: scraped } : {}),
          ...(form && form.length ? { last5: form } : {}),
          ...(qualPos ? { qualifyingPos: qualPos } : {}),
        };
      });
      const r=runSim(selectedRace, series, driversWithLiveHist);
      const c=genChart(selectedRace,r);
      const v={}; c.drivers.forEach((d,i)=>{ v[d.name]=i<6; });
      setTimeout(()=>{ setResults(r); setChart(c); setVis(v); setSimulating(false); setProgress(100); setTab("picks"); },300);
    },1800);
  }

  function playRace(){ if(!chart) return; setLiveRunning(true); setLiveFrame(0); liveRef.current=setInterval(()=>setLiveFrame(f=>{ if(f>=chart.data.length-1){clearInterval(liveRef.current);setLiveRunning(false);return f;} return f+1; }),320); }
  function pauseRace(){ clearInterval(liveRef.current); setLiveRunning(false); }
  function resetRace(){ clearInterval(liveRef.current); setLiveFrame(0); setLiveRunning(false); }
  useEffect(()=>()=>{clearInterval(ivRef.current);clearInterval(liveRef.current);},[]);

  const std = results?.[0];
  const dh = results?.find((d,i)=>i>=2&&(d.hist?.apt||0)>=7);
  // Long shot: ranked 8-last, high chaos avoidance (survives chaos), low win% but real upside
  // Must be distinct from std and dh. Prioritize: high chaosAvoid, decent mom, low win% (true long shot)
  const longShot = results?.find((d,i)=> {
    if(i<3) return false; // not #1 or #2
    if(d.name===std?.name || d.name===dh?.name) return false;
    return d.chaosAvoid>=6 && d.mom>=60; // survives chaos, has some momentum
  }) || results?.find((d,i)=>i>=3&&d.name!==std?.name&&d.name!==dh?.name);
  const maxW = results ? Math.max(...results.map(d=>parseFloat(d.winPct))) : 40;
  const liveData = chart ? chart.data.slice(0,liveFrame+1) : [];
  const liveLeader = chart&&liveFrame>0 ? Object.entries(chart.data[liveFrame]).filter(([k])=>k!=="lap").sort((a,b)=>b[1]-a[1])[0]?.[0] : null;
  const cfg = SERIES_CONFIG[series];

  const TABS = [["picks","Top Picks"],["standings","Standings"],["speed","Speed/Aero"],["history","Track History"],["race","In-Race Chart"]];

  return (
    <div style={{minHeight:"100vh",background:"#07070f",color:"#f0e8e0",fontFamily:"'Barlow Condensed',sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;500;600;700;800;900&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        @keyframes spin{to{transform:rotate(360deg);}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:none;}}
        @keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.3;}}
        @keyframes shimmer{0%{background-position:-200% 0;}100%{background-position:200% 0;}}
        @keyframes slideIn{from{transform:translateX(-100%);}to{transform:translateX(0);}}
        .cal-row:hover{background:rgba(255,78,0,0.06)!important;border-color:rgba(255,78,0,0.25)!important;cursor:pointer;}
        .run-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 12px 36px rgba(255,78,0,0.4)!important;}
        .run-btn:disabled{opacity:0.38;cursor:not-allowed;}
        ::-webkit-scrollbar{width:3px;}::-webkit-scrollbar-thumb{background:#1a1a2a;border-radius:2px;}
      `}</style>

      {/* -- DRAWER OVERLAY */}
      {drawerOpen && (
        <div style={{position:"fixed",inset:0,zIndex:50,display:"flex"}}>
          {/* Backdrop */}
          <div onClick={()=>setDrawerOpen(false)} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.7)",backdropFilter:"blur(2px)"}}/>
          {/* Drawer panel */}
          <div style={{position:"relative",zIndex:51,width:"min(340px,90vw)",background:"#0e0e1a",borderRight:"1px solid rgba(255,255,255,0.08)",height:"100%",overflowY:"auto",padding:"16px 14px 40px",display:"flex",flexDirection:"column",gap:"12px",animation:"slideIn 0.22s ease"}}>
            {/* Drawer header */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"4px"}}>
              <div style={{fontSize:"10px",color:"rgba(255,255,255,0.50)",letterSpacing:"0.14em"}}>RACE CARD - SELECT A RACE</div>
              <button onClick={()=>setDrawerOpen(false)} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"6px",padding:"4px 10px",cursor:"pointer",fontFamily:"'Barlow Condensed',sans-serif",fontSize:"13px",fontWeight:700,color:"rgba(255,255,255,0.70)"}}>x CLOSE</button>
            </div>

            {/* Series tabs inside drawer */}
            <div style={{display:"flex",gap:"6px"}}>
              {Object.entries(SERIES_CONFIG).map(([id,c])=>(
                <button key={id} onClick={()=>{ changeSeries(id); }} style={{
                  flex:1,background:series===id?`${c.color}22`:"rgba(255,255,255,0.03)",
                  border:`1px solid ${series===id?c.color:"rgba(255,255,255,0.1)"}`,
                  borderRadius:"8px",padding:"8px 4px",cursor:"pointer",
                  fontFamily:"'Barlow Condensed',sans-serif",fontSize:"13px",fontWeight:800,
                  color:series===id?c.color:"rgba(255,255,255,0.55)",letterSpacing:"0.1em",transition:"all 0.15s",
                }}>{c.short}</button>
              ))}
            </div>

            {/* Series info chip */}
            <div style={{padding:"10px 12px",background:`${cfg.color}14`,border:`1px solid ${cfg.color}33`,borderRadius:"9px"}}>
              <div style={{fontSize:"9px",color:cfg.color,letterSpacing:"0.1em",marginBottom:"1px"}}>{cfg.short} | {cfg.chase}</div>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:"15px",fontWeight:900,color:"#f0e8e0"}}>{cfg.label}</div>
              <div style={{fontSize:"9px",color:"rgba(255,255,255,0.70)",marginTop:"1px"}}>Win = {cfg.ptWin}pts | {currentDrivers.length} drivers</div>
            </div>

            {/* Race list */}
            <div style={{fontSize:"9px",letterSpacing:"0.12em",color:"rgba(255,255,255,0.45)",marginBottom:"2px"}}>2026 SCHEDULE - OLDEST TO NEWEST</div>
            <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
              {currentSchedule.map(race=>{
                const sel=selectedRace?.id===race.id;
                const days=daysUntil(race.date);
                return (
                  <div key={race.id} className="cal-row" onClick={()=>{ setSelectedRace(race); setResults(null); setChart(null); setDrawerOpen(false); }} style={{
                    background:sel?"rgba(255,78,0,0.1)":race.done?"rgba(255,255,255,0.01)":"rgba(255,255,255,0.03)",
                    border:sel?"1px solid rgba(255,78,0,0.5)":race.next?`1px solid ${cfg.color}44`:"1px solid rgba(255,255,255,0.07)",
                    borderRadius:"9px",padding:"10px 12px",transition:"all 0.12s",opacity:race.done?0.55:1,
                  }}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:"13px",fontWeight:700,color:sel?"#FF8C00":race.next?cfg.color:"#e0d8d0",lineHeight:1.2}}>{race.name}</div>
                        <div style={{fontSize:"9px",color:"rgba(255,255,255,0.60)",marginTop:"2px"}}>{fmtDate(race.date)}</div>
                      </div>
                      <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:"3px",marginLeft:"8px"}}>
                        {race.done&&<span style={{fontSize:"8px",color:"rgba(255,255,255,0.35)"}}>v DONE</span>}
                        {race.next&&<span style={{fontSize:"8px",color:cfg.color,fontWeight:700,animation:"pulse 2s infinite"}}>NEXT &gt;</span>}
                        {!race.done&&!race.next&&days>0&&<span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:"9px",color:"rgba(255,255,255,0.40)"}}>{days}d</span>}
                      </div>
                    </div>
                    {race.done&&race.winner&&<div style={{fontSize:"9px",color:"#FF8C00",marginTop:"4px"}}>WIN: {race.winner}</div>}
                    <div style={{display:"flex",gap:"5px",marginTop:"5px",flexWrap:"wrap"}}>
                      <span style={{fontSize:"8px",color:"rgba(255,255,255,0.55)",background:"rgba(255,255,255,0.05)",padding:"2px 6px",borderRadius:"3px"}}>{race.type}</span>
                      <span style={{fontSize:"8px",color:race.chaos>.85?"#FF4E00":race.chaos>.7?"#FF8C00":"rgba(255,255,255,0.50)",background:"rgba(255,255,255,0.04)",padding:"2px 6px",borderRadius:"3px"}}>CHAOS {(race.chaos*100).toFixed(0)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Spotter Feed */}
            <div style={{padding:"10px 12px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"8px"}}>
              <div style={{fontSize:"8px",color:"rgba(255,255,255,0.45)",letterSpacing:"0.1em",marginBottom:"6px"}}>SPOTTER FEED</div>
              {[["RR","Racing-Reference.info"],["DA","DriverAverages.com"],["FL","Fastlap.io"]].map(([a,n])=>(
                <div key={a} style={{display:"flex",gap:"7px",alignItems:"center",marginBottom:"5px"}}>
                  <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:"8px",color:"#FF8C00",background:"rgba(255,78,0,0.1)",padding:"1px 5px",borderRadius:"2px",minWidth:"20px",textAlign:"center"}}>{a}</span>
                  <span style={{fontSize:"10px",color:"rgba(255,255,255,0.70)"}}>{n}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* -- HEADER */}
      <div style={{borderBottom:"1px solid rgba(255,255,255,0.07)",padding:"0 14px",position:"sticky",top:0,zIndex:40,background:"#07070f"}}>
        <div style={{maxWidth:"860px",margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",height:"54px",gap:"10px"}}>
          {/* Logo */}
          <div style={{display:"flex",alignItems:"center",gap:"9px",flexShrink:0}}>
            <PrismLogo/>
            <div>
              <div style={{fontSize:"17px",fontWeight:900,letterSpacing:"0.22em",color:"#FF4E00",lineHeight:1}}>FINAL LAP</div>
              <div style={{fontSize:"8px",color:"#FF8C00",letterSpacing:"0.13em",fontWeight:700,lineHeight:1.2}}>THE SETUP SHEET</div>
              <div style={{fontSize:"6px",color:"rgba(255,255,255,0.40)",letterSpacing:"0.08em"}}>What the crew chief knows</div>
            </div>
          </div>

          {/* Series tabs - center */}
          <div style={{display:"flex",gap:"5px",flexShrink:0}}>
            {Object.entries(SERIES_CONFIG).map(([id,c])=>(
              <button key={id} onClick={()=>changeSeries(id)} style={{
                background:series===id?`${c.color}22`:"rgba(255,255,255,0.04)",
                border:`1px solid ${series===id?c.color:"rgba(255,255,255,0.1)"}`,
                borderRadius:"7px",padding:"5px 11px",cursor:"pointer",
                fontFamily:"'Barlow Condensed',sans-serif",fontSize:"12px",fontWeight:800,
                color:series===id?c.color:"rgba(255,255,255,0.60)",letterSpacing:"0.1em",transition:"all 0.15s",
              }}>{c.short}</button>
            ))}
          </div>

          {/* Right side: race picker button + data status */}
          <div style={{display:"flex",alignItems:"center",gap:"8px",flexShrink:0}}>
            <button onClick={()=>setView(view==="scorecard"?"predict":"scorecard")} style={{
              background:view==="scorecard"?`${cfg.color}22`:"rgba(255,255,255,0.04)",
              border:`1px solid ${view==="scorecard"?cfg.color:"rgba(255,255,255,0.12)"}`,
              borderRadius:"8px",padding:"6px 10px",cursor:"pointer",
              fontFamily:"'Barlow Condensed',sans-serif",fontSize:"10px",fontWeight:800,
              color:view==="scorecard"?cfg.color:"rgba(255,255,255,0.70)",letterSpacing:"0.08em",
            }}>
              {view==="scorecard"?"< PREDICT":"SCORECARD"}
            </button>
            <button onClick={()=>setDrawerOpen(true)} style={{
              background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.12)",
              borderRadius:"8px",padding:"6px 12px",cursor:"pointer",
              fontFamily:"'Barlow Condensed',sans-serif",fontSize:"11px",fontWeight:700,
              color:"rgba(255,255,255,0.80)",letterSpacing:"0.08em",display:"flex",alignItems:"center",gap:"6px",
            }}>
              <span>=</span>
              <span style={{display:"flex",flexDirection:"column",alignItems:"flex-start",lineHeight:1.2}}>
                <span style={{fontSize:"9px",color:"rgba(255,255,255,0.45)"}}>RACE CARD</span>
                <span style={{fontSize:"10px",color:selectedRace?cfg.color:"rgba(255,255,255,0.40)",maxWidth:"90px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                  {selectedRace ? selectedRace.name : "Select race"}
                </span>
              </span>
            </button>
            {/* Live/Cached/Syncing status pill */}
            <div style={{display:"flex",alignItems:"center",gap:"4px",padding:"3px 7px",background:dataStatus==="live"?"rgba(34,197,94,0.1)":dataStatus==="loading"?"rgba(255,215,0,0.08)":"rgba(255,78,0,0.08)",border:`1px solid ${dataStatus==="live"?"rgba(34,197,94,0.3)":dataStatus==="loading"?"rgba(255,215,0,0.25)":"rgba(255,78,0,0.25)"}`,borderRadius:"5px",flexShrink:0}}>
              <div style={{width:"5px",height:"5px",borderRadius:"50%",background:dataStatus==="live"?"#22c55e":dataStatus==="loading"?"#FFD700":"#FF6A00",animation:"pulse 2.5s infinite"}}/>
              <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:"7px",color:dataStatus==="live"?"#22c55e":dataStatus==="loading"?"#FFD700":"#FF8C00",letterSpacing:"0.08em"}}>
                {dataStatus==="live"?"LIVE":dataStatus==="loading"?"SYNC":"CACHED"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* -- MAIN CONTENT - full width -- */}
      <div style={{maxWidth:"860px",margin:"0 auto",padding:"16px 14px 72px"}}>
        {view==="scorecard" ? (
        <ScorecardView scorecard={scorecard} status={scorecardStatus} cfg={cfg} series={series}/>
        ) : (<>

        {/* Selected race banner */}
        {selectedRace && (
          <div style={{background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"12px",padding:"14px 16px",marginBottom:"14px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:"10px"}}>
              <div>
                <div style={{fontSize:"10px",color:"rgba(255,255,255,0.55)",letterSpacing:"0.1em",marginBottom:"3px"}}>{fmtDate(selectedRace.date)}  |  {cfg.label.toUpperCase()}</div>
                <div style={{fontSize:"26px",fontWeight:900,color:selectedRace.next?cfg.color:"#FF8C00",letterSpacing:"0.02em",lineHeight:1}}>{selectedRace.name}</div>
                <div style={{fontSize:"13px",color:"rgba(255,255,255,0.70)",marginTop:"3px"}}>{selectedRace.type}  |  {selectedRace.miles}mi  |  {selectedRace.geo}</div>
              </div>
              <button onClick={()=>setDrawerOpen(true)} style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"8px",padding:"7px 14px",cursor:"pointer",fontFamily:"'Barlow Condensed',sans-serif",fontSize:"12px",fontWeight:700,color:"rgba(255,255,255,0.65)",letterSpacing:"0.08em",whiteSpace:"nowrap"}}>
                = CHANGE RACE
              </button>
            </div>
            {dataStatus==="fallback" && (
              <div style={{marginTop:"9px",padding:"6px 10px",background:"rgba(255,78,0,0.08)",border:"1px solid rgba(255,78,0,0.25)",borderRadius:"7px",fontSize:"9px",color:"#FF8C00",letterSpacing:"0.04em"}}>
                ! CACHED DATA - live standings/schedule API unreachable. Showing static baseline last verified {new Date(STATIC_DATA_LAST_UPDATED+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}.
              </div>
            )}
            <div style={{display:"flex",gap:"18px",flexWrap:"wrap",marginTop:"12px",alignItems:"flex-end"}}>
              {[
                ["CHAOS",(selectedRace.chaos*100).toFixed(0)+"%"],
                ["DRIVERS", currentDrivers.length],
                ["ENTRIES", liveEntries ? `${liveEntries.length} cars` : "TBD"],
                ["ITERS","25,000"],
                ["DATA", dataAsOf ? new Date(dataAsOf).toLocaleDateString("en-US",{month:"short",day:"numeric"}) : new Date(STATIC_DATA_LAST_UPDATED+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"})],
              ].map(([k,v])=>(
                <div key={k}><div style={{fontSize:"8px",color:"rgba(255,255,255,0.45)",letterSpacing:"0.1em"}}>{k}</div><div style={{fontSize:"15px",fontWeight:700,color:"rgba(255,255,255,0.90)"}}>{v}</div></div>
              ))}
              {/* Track history fetch status */}
              <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:"5px",padding:"4px 8px",borderRadius:"6px",
                background: trackHistoryStatus==="live"?"rgba(34,197,94,0.08)":trackHistoryStatus==="loading"?"rgba(255,215,0,0.08)":trackHistoryStatus==="failed"?"rgba(255,78,0,0.08)":"transparent",
                border: trackHistoryStatus==="live"?"1px solid rgba(34,197,94,0.25)":trackHistoryStatus==="loading"?"1px solid rgba(255,215,0,0.2)":trackHistoryStatus==="failed"?"1px solid rgba(255,78,0,0.2)":"1px solid transparent",
              }}>
                <div style={{width:"5px",height:"5px",borderRadius:"50%",flexShrink:0,
                  background: trackHistoryStatus==="live"?"#22c55e":trackHistoryStatus==="loading"?"#FFD700":trackHistoryStatus==="failed"?"#FF4E00":"rgba(255,255,255,0.2)",
                  animation: trackHistoryStatus==="loading"?"pulse 1.2s infinite":"none",
                }}/>
                <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:"7px",color:"rgba(255,255,255,0.55)",letterSpacing:"0.07em"}}>
                  {trackHistoryStatus==="live"?"TRACK HIST | LIVE":trackHistoryStatus==="loading"?"FETCHING TRACK HIST...":trackHistoryStatus==="failed"?"TRACK HIST | DEPLOY /api/trackhistory":"TRACK HIST | IDLE"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Final Results panel - official post-race results, sourced live from /api/results */}
        {selectedRace?.done && !selectedRace.exhib && (
          <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"12px",padding:"14px 16px",marginBottom:"14px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
              <div style={{fontSize:"10px",color:"rgba(255,255,255,0.55)",letterSpacing:"0.12em"}}>FINAL RESULTS</div>
              <div style={{display:"flex",alignItems:"center",gap:"5px"}}>
                <div style={{width:"5px",height:"5px",borderRadius:"50%",background:resultsStatus==="live"?"#22c55e":resultsStatus==="loading"?"#FFD700":resultsStatus==="failed"?"#FF4E00":"rgba(255,255,255,0.2)",animation:resultsStatus==="loading"?"pulse 1.2s infinite":"none"}}/>
                <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:"7px",color:"rgba(255,255,255,0.55)",letterSpacing:"0.07em"}}>
                  {resultsStatus==="live"?"LIVE | NASCAR.com":resultsStatus==="loading"?"FETCHING...":resultsStatus==="pending"?"NOT YET OFFICIAL":resultsStatus==="failed"?"UNAVAILABLE":"IDLE"}
                </span>
              </div>
            </div>
            {(() => {
              const cacheKey = `${series}-${selectedRace.id}`;
              const rr = raceResultsCache[cacheKey];
              if (resultsStatus==="loading") {
                return <div style={{fontSize:"11px",color:"rgba(255,255,255,0.5)"}}>Pulling official results...</div>;
              }
              if (!rr || !rr.complete) {
                return <div style={{fontSize:"11px",color:"rgba(255,255,255,0.5)"}}>WIN: {selectedRace.winner || "Results not yet official"}</div>;
              }
              return (
                <div>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:"20px",fontWeight:900,color:"#FFD700",marginBottom:"8px"}}>WIN: {rr.winner}</div>
                  {rr.recap && <div style={{fontSize:"10px",color:"rgba(255,255,255,0.65)",marginBottom:"10px",lineHeight:1.5}}>{rr.recap}</div>}
                  <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
                    {rr.results.slice(0,10).map(r=>(
                      <div key={r.pos} style={{display:"grid",gridTemplateColumns:"24px 1fr auto auto",gap:"8px",alignItems:"center",padding:"6px 8px",background:"rgba(255,255,255,0.02)",borderRadius:"6px"}}>
                        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:"13px",fontWeight:800,color:r.pos===1?"#FFD700":r.pos<=3?"#FF8C00":"rgba(255,255,255,0.65)"}}>{r.pos}</div>
                        <div>
                          <div style={{fontSize:"12px",fontWeight:700}}>{r.name}</div>
                          <div style={{fontSize:"8px",color:"rgba(255,255,255,0.5)"}}>#{r.num} - {r.team}{r.manufacturer?` - ${r.manufacturer}`:""}</div>
                        </div>
                        <div style={{fontSize:"9px",color:"rgba(255,255,255,0.55)",textAlign:"right"}}>{r.lapsLed>0?`${r.lapsLed} LL`:""}</div>
                        <div style={{fontSize:"9px",color:r.status==="Running"?"rgba(255,255,255,0.55)":"#FF6A00",textAlign:"right"}}>{r.status}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* No race selected prompt */}
        {!selectedRace && (
          <div onClick={()=>setDrawerOpen(true)} style={{background:"rgba(255,255,255,0.02)",border:"1px dashed rgba(255,255,255,0.1)",borderRadius:"12px",padding:"32px 20px",marginBottom:"14px",textAlign:"center",cursor:"pointer"}}>
            <div style={{fontSize:"28px",marginBottom:"8px",opacity:0.4}}>=</div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:"16px",letterSpacing:"0.12em",color:"rgba(255,255,255,0.55)"}}>TAP TO SELECT A RACE</div>
            <div style={{fontSize:"10px",color:"rgba(255,255,255,0.30)",marginTop:"4px"}}>{cfg.label}  |  {currentSchedule.filter(r=>!r.done).length} races remaining</div>
          </div>
        )}

        {/* Pull the Setup button */}
        {selectedRace && (
          <button className="run-btn" onClick={simulate} disabled={simulating||selectedRace.done} style={{
            width:"100%",padding:"15px",marginBottom:"16px",
            background:selectedRace.done?"rgba(255,255,255,0.04)":simulating?"rgba(255,78,0,0.15)":`linear-gradient(135deg,${cfg.color},${cfg.color}cc)`,
            border:selectedRace.done||simulating?"1px solid rgba(255,78,0,0.2)":"none",
            borderRadius:"11px",cursor:selectedRace.done?"not-allowed":"pointer",
            fontFamily:"'Barlow Condensed',sans-serif",fontSize:"16px",fontWeight:900,
            color:selectedRace.done?"rgba(255,255,255,0.25)":"#fff",letterSpacing:"0.16em",
            transition:"all 0.2s",display:"flex",alignItems:"center",justifyContent:"center",gap:"10px",
            boxShadow:selectedRace.done||simulating?"none":`0 4px 28px ${cfg.color}44`,
          }}>
            {selectedRace.done ? `v ${selectedRace.winner||"RACE COMPLETE"}  -  SELECT UPCOMING RACE` :
             simulating ? <><Spin/>PULLING THE SETUP... {Math.round(progress)}%</> :
             `> PULL THE SETUP  -  ${selectedRace.name.toUpperCase()}`}
          </button>
        )}
        {simulating&&<div style={{height:"2px",background:"rgba(255,255,255,0.04)",borderRadius:"2px",marginTop:"-10px",marginBottom:"16px",overflow:"hidden"}}><div style={{height:"100%",width:`${progress}%`,background:`linear-gradient(90deg,${cfg.color},#FFD700)`,transition:"width 0.12s ease",borderRadius:"2px"}}/></div>}

        {/* Results content */}
        <div>
          {results&&(
            <div style={{animation:"fadeUp 0.35s ease forwards"}}>
              {/* Summary picks - 3 cards */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px",marginBottom:"11px"}}>
                {[
                  [std,       "# STANDARD PICK", "rgba(255,78,0,0.07)",    "rgba(255,78,0,0.28)",    "#FF8C00", "#FFD700"],
                  [dh||results[2], "* DARK HORSE","rgba(138,43,226,0.07)", "rgba(138,43,226,0.28)",  "#BA80F8", "#BA80F8"],
                  [longShot,  "! LONG SHOT",      "rgba(6,182,212,0.07)",  "rgba(6,182,212,0.28)",   "#06b6d4", "#06b6d4"],
                ].map(([d,label,bg,bc,tc,vc])=>(
                  <div key={label} style={{background:bg,border:`1px solid ${bc}`,borderRadius:"11px",padding:"12px 10px"}}>
                    <div style={{fontSize:"7px",color:tc,letterSpacing:"0.12em",marginBottom:"4px",fontWeight:800}}>{label}</div>
                    <div style={{fontSize:"15px",fontWeight:900,color:vc,lineHeight:1.1,marginBottom:"2px"}}>{d?.name}</div>
                    <div style={{fontSize:"8px",color:"rgba(255,255,255,0.65)",marginBottom:"5px"}}>#{d?.num}  |  {d?.team?.split(" ")[0]}</div>
                    <div style={{fontSize:"24px",fontWeight:900,color:tc,lineHeight:1}}>{d?.winPct}%</div>
                    <div style={{fontSize:"7px",color:"rgba(255,255,255,0.55)",marginBottom:"6px"}}>WIN PROB</div>
                    <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
                      {[["MOM",d?.mom,"#22c55e"],["APTD",`+${d?.hist?.apt||0}`,"#FFD700"],["DNF",`${d?.dnfPct}%`,d?.dnfPct>10?"#FF4E00":"#888"]].map(([l,v,c])=>(
                        <div key={l} style={{textAlign:"center"}}>
                          <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:"10px",color:c,fontWeight:600}}>{v}</div>
                          <div style={{fontSize:"6px",color:"rgba(255,255,255,0.50)"}}>{l}</div>
                        </div>
                      ))}
                    </div>
                    {label==="! LONG SHOT" && d && (
                      <div style={{marginTop:"7px",fontSize:"8px",color:"rgba(6,182,212,0.80)",lineHeight:1.4,borderTop:"1px solid rgba(6,182,212,0.15)",paddingTop:"6px"}}>
                        Chaos avoid {d.chaosAvoid}/10  |  Ranked #{results.indexOf(d)+1} in sim
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Tabs */}
              <div style={{display:"flex",gap:"2px",marginBottom:"10px",background:"rgba(255,255,255,0.02)",borderRadius:"8px",padding:"3px"}}>
                {TABS.map(([id,label])=>(
                  <button key={id} onClick={()=>setTab(id)} style={{
                    flex:1,background:tab===id?`${cfg.color}22`:"transparent",
                    border:tab===id?`1px solid ${cfg.color}55`:"1px solid transparent",
                    borderRadius:"6px",padding:"6px 2px",cursor:"pointer",
                    fontFamily:"'Barlow Condensed',sans-serif",fontSize:"10px",fontWeight:700,
                    color:tab===id?cfg.color:"rgba(255,255,255,0.75)",letterSpacing:"0.04em",transition:"all 0.12s",
                  }}>{label.toUpperCase()}</button>
                ))}
              </div>

              {/* -- PICKS TAB -- */}
              {tab==="picks"&&results.map((d,i)=>(
                <TrackHistRow key={d.name} d={d} rank={i+1} isStd={d.name===std?.name} isDH={d.name===(dh||results[2])?.name&&d.name!==std?.name} isLS={d.name===longShot?.name&&d.name!==std?.name&&d.name!==(dh||results[2])?.name} maxWin={maxW} series={series} race={selectedRace} isTop10={i<10}/>
              ))}

              {/* -- STANDINGS TAB -- */}
              {tab==="standings"&&(
                <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
                  <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:"8px",color:"rgba(255,255,255,0.65)",padding:"6px 9px",background:"rgba(255,255,255,0.02)",borderRadius:"5px",marginBottom:"4px"}}>
                    2026 {cfg.label.toUpperCase()} STANDINGS  |  {cfg.chase}  |  WIN = {cfg.ptWin}PTS
                  </div>
                  {currentDrivers.filter((d,i,a)=>a.findIndex(x=>x.name===d.name)===i).map((d,i)=>{
                    const r=results.find(x=>x.name===d.name);
                    const inChase=i<(series==="cup"?16:series==="xfin"?12:10);
                    return (
                      <div key={d.name} style={{background:"rgba(255,255,255,0.02)",border:`1px solid ${inChase?cfg.color+"22":"rgba(255,255,255,0.05)"}`,borderRadius:"8px",padding:"8px 12px",display:"grid",gridTemplateColumns:"20px 1fr auto auto auto",gap:"8px",alignItems:"center"}}>
                        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:"12px",fontWeight:800,color:["#FFD700","#C0C0C0","#CD7F32"][i]||"rgba(255,255,255,0.70)"}}>{d.pos}</div>
                        <div>
                          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:"13px",fontWeight:700}}>{d.name}</div>
                          <div style={{display:"flex",alignItems:"center",gap:"5px",marginTop:"3px"}}>
                            <Bar pct={d.pts||0} color={inChase?cfg.color:"#333"} max={Math.max(...currentDrivers.map(x=>x.pts||0),1)}/>
                            {inChase&&<span style={{fontSize:"6px",color:cfg.color,letterSpacing:"0.07em",whiteSpace:"nowrap"}}>CHASE</span>}
                          </div>
                        </div>
                        <div style={{textAlign:"right"}}><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:"16px",fontWeight:900,color:cfg.color}}>{d.pts||" - "}</div><div style={{fontSize:"7px",color:"rgba(255,255,255,0.65)"}}>PTS</div></div>
                        <div style={{textAlign:"right"}}><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:"16px",fontWeight:900,color:d.wins>0?"#FFD700":"rgba(255,255,255,0.62)"}}>{d.wins}</div><div style={{fontSize:"7px",color:"rgba(255,255,255,0.65)"}}>WINS</div></div>
                        {r&&<div style={{textAlign:"right"}}><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:"12px",fontWeight:700,color:"#FF8C00"}}>{r.winPct}%</div><div style={{fontSize:"7px",color:"rgba(255,255,255,0.65)"}}>SIM%</div></div>}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* -- SPEED/AERO TAB -- */}
              {tab==="speed"&&(()=>{
                const hasQual = results.some(d=>d.qualifyingPos);
                return [...results].sort((a,b)=>b.spd-a.spd).map((d,i)=>(
                <div key={d.name} style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:"9px",padding:"9px 12px",display:"grid",gridTemplateColumns:hasQual?"20px 1fr auto auto auto":"20px 1fr auto auto",gap:"8px",alignItems:"center",marginBottom:"4px"}}>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:"12px",fontWeight:700,color:"rgba(255,255,255,0.70)"}}>{i+1}</div>
                  <div>
                    <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:"14px",fontWeight:700}}>{d.name}</div>
                    <div style={{display:"flex",alignItems:"center",gap:"6px",marginTop:"3px"}}><Bar pct={d.spd-155} color="#f97316" max={16}/><span style={{fontSize:"8px",color:"rgba(255,255,255,0.72)",whiteSpace:"nowrap"}}>AERO+{d.aero}</span></div>
                  </div>
                  <div style={{textAlign:"right"}}><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:"16px",fontWeight:900,color:"#f97316"}}>{d.spd}</div><div style={{fontSize:"7px",color:"rgba(255,255,255,0.65)"}}>MPH</div></div>
                  <div style={{textAlign:"right"}}><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:"16px",fontWeight:900,color:d.aero>=8?"#22c55e":"rgba(255,255,255,0.70)"}}>{d.aero}/10</div><div style={{fontSize:"7px",color:"rgba(255,255,255,0.65)"}}>AERO</div></div>
                  {hasQual && <div style={{textAlign:"right"}}><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:"16px",fontWeight:900,color:d.qualifyingPos&&d.qualifyingPos<=10?"#22c55e":"rgba(255,255,255,0.70)"}}>{d.qualifyingPos?`P${d.qualifyingPos}`:"-"}</div><div style={{fontSize:"7px",color:"rgba(255,255,255,0.65)"}}>QUAL</div></div>}
                </div>
              ));
              })()}

              {/* -- TRACK HISTORY TAB -- */}
              {tab==="history"&&(
                <div>
                  <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:"9px",color:"rgba(255,255,255,0.65)",padding:"6px 9px",background:"rgba(255,255,255,0.02)",borderRadius:"5px",marginBottom:"8px"}}>
                    {selectedRace?.name}  |  {selectedRace?.geo} geometry  |  Click v HIST to expand per-driver finish breakdown
                  </div>
                  {[...results].sort((a,b)=>(b.hist?.apt||0)-(a.hist?.apt||0)).map((d,i)=>(
                    <TrackHistRow key={d.name} d={d} rank={i+1} isStd={d.name===std?.name} isDH={d.name===(dh||results[2])?.name&&d.name!==std?.name} isLS={d.name===longShot?.name&&d.name!==std?.name&&d.name!==(dh||results[2])?.name} maxWin={maxW} series={series} race={selectedRace} isTop10={i<10}/>
                  ))}
                </div>
              )}

              {/* -- IN-RACE CHART TAB -- */}
              {tab==="race"&&chart&&(
                <div>
                  {liveLeader&&liveFrame>0&&(
                    <div style={{background:"rgba(255,78,0,0.07)",border:"1px solid rgba(255,78,0,0.22)",borderRadius:"8px",padding:"9px 13px",marginBottom:"9px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div><div style={{fontSize:"8px",color:"rgba(255,255,255,0.75)",letterSpacing:"0.1em"}}>LIVE LEADER  |  LAP {chart.data[liveFrame]?.lap}</div><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:"20px",fontWeight:900,color:"#FFD700",lineHeight:1}}>{liveLeader}</div></div>
                      <div style={{textAlign:"right"}}><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:"26px",fontWeight:900,color:"#FF8C00"}}>{chart.data[liveFrame]?.[liveLeader]}%</div><div style={{fontSize:"7px",color:"rgba(255,255,255,0.70)"}}>WIN PROB</div></div>
                    </div>
                  )}
                  <div style={{background:"rgba(255,255,255,0.015)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:"10px",padding:"14px 6px 8px"}}>
                    <div style={{fontSize:"8px",color:"rgba(255,255,255,0.72)",letterSpacing:"0.1em",marginBottom:"8px",paddingLeft:"8px"}}>WIN PROBABILITY SHIFT PER LAP  -  TRACK POS  |  PIT STRATEGY  |  CAUTIONS  |  TIRE WEAR  |  MOMENTUM</div>
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={liveData} margin={{top:3,right:8,left:-18,bottom:3}}>
                        <XAxis dataKey="lap" stroke="rgba(255,255,255,0.1)" tick={{fontSize:8,fontFamily:"'IBM Plex Mono',monospace",fill:"rgba(255,255,255,0.75)"}}/>
                        <YAxis stroke="rgba(255,255,255,0.07)" tick={{fontSize:8,fontFamily:"'IBM Plex Mono',monospace",fill:"rgba(255,255,255,0.75)"}} tickFormatter={v=>`${v}%`}/>
                        <Tooltip content={<ChartTip/>}/>
                        <Legend wrapperStyle={{fontSize:"9px",fontFamily:"'Barlow Condensed',sans-serif",paddingTop:"6px"}}/>
                        {chart.events && Object.values(chart.events).map(ev=>(
                          <ReferenceLine key={ev.label} x={ev.lap} stroke="rgba(255,255,255,0.35)" strokeDasharray="4 3"
                            label={{ value:ev.label, position:"top", fill:"rgba(255,255,255,0.55)", fontSize:8, fontFamily:"'IBM Plex Mono',monospace" }}/>
                        ))}
                        {chart.drivers.map((d,i)=>vis[d.name]&&<Line key={d.name} type="monotone" dataKey={d.name} stroke={DRIVER_COLORS[i]} strokeWidth={1.8} dot={false} activeDot={{r:3,strokeWidth:0}}/>)}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:"4px",marginTop:"8px"}}>
                    {chart.drivers.map((d,i)=>(
                      <button key={d.name} onClick={()=>setVis(v=>({...v,[d.name]:!v[d.name]}))} style={{background:vis[d.name]?`${DRIVER_COLORS[i]}22`:"rgba(255,255,255,0.02)",border:`1px solid ${vis[d.name]?DRIVER_COLORS[i]:"rgba(255,255,255,0.07)"}`,borderRadius:"5px",padding:"3px 9px",cursor:"pointer",fontFamily:"'Barlow Condensed',sans-serif",fontSize:"10px",fontWeight:700,color:vis[d.name]?DRIVER_COLORS[i]:"rgba(255,255,255,0.78)",transition:"all 0.12s"}}>{d.name}</button>
                    ))}
                  </div>
                  <div style={{display:"flex",gap:"7px",marginTop:"10px",alignItems:"center"}}>
                    <button onClick={liveRunning?pauseRace:playRace} style={{background:liveRunning?"rgba(239,68,68,0.12)":"linear-gradient(135deg,#FF4E00,#FF8C00)",border:liveRunning?"1px solid rgba(239,68,68,0.35)":"none",borderRadius:"7px",padding:"8px 16px",cursor:"pointer",fontFamily:"'Barlow Condensed',sans-serif",fontSize:"12px",fontWeight:900,color:"#fff",letterSpacing:"0.1em"}}>{liveRunning?"|| PAUSE":"> PLAY RACE"}</button>
                    <button onClick={resetRace} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"7px",padding:"8px 12px",cursor:"pointer",fontFamily:"'Barlow Condensed',sans-serif",fontSize:"12px",fontWeight:700,color:"rgba(255,255,255,0.82)",letterSpacing:"0.07em"}}>R RESET</button>
                    <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:"9px",color:"rgba(255,255,255,0.70)",flex:1,textAlign:"right"}}>LAP {chart.data[liveFrame]?.lap||0} / {chart.laps}</div>
                  </div>
                </div>
              )}

              <div style={{marginTop:"12px",padding:"8px 11px",background:"rgba(255,255,255,0.01)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:"7px",fontFamily:"'IBM Plex Mono',monospace",fontSize:"7px",color:"rgba(255,255,255,0.62)",lineHeight:1.7}}>
                SCORE: Track History 30%  |  Momentum + Win Rate 20%  |  Chaos Avoidance 20%  |  Skill + Qual Speed 15%  |  Pit/Aero 15%  |  + Manufacturer &amp; Qualifying bonuses{"\n"}
                ENGINE: Gumbel dist  |  25K iters  |  Chaos {(selectedRace?.chaos*100).toFixed(0)}%  |  NextGen 2022-2026 weighted  |  {cfg.label}  |  {cfg.chase}
              </div>
            </div>
          )}

          {!results&&!simulating&&(
            <div style={{textAlign:"center",padding:"50px 20px",color:"rgba(255,255,255,0.60)"}}>
              <div style={{fontSize:"36px",marginBottom:"8px",opacity:0.35}}>&#9664;</div>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:"14px",letterSpacing:"0.1em"}}>SELECT A RACE  |  PULL THE SETUP</div>
              <div style={{fontSize:"9px",color:"rgba(255,255,255,0.07)",marginTop:"5px"}}>{cfg.label}  |  {currentSchedule.filter(r=>!r.done).length} races remaining</div>
            </div>
          )}
        </div>
        </>)}
      </div>
    </div>
  );
}
