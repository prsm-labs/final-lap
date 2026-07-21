// lib/sim.js
// The core prediction engine, extracted from src/App.jsx so it can be imported by
// both the browser (App.jsx) and server-side Vercel functions (the scorecard cron).
// Previously this only existed as browser React state -- there was no way to generate
// an "official" prediction independent of a user happening to load the page.

// -- TRACK HISTORY DATA --------------------------------------------------------
// { aptitude, starts, top20, top10, top5, top3, wins, avgFinish }
export const TRACK_HISTORY = {
  // ── Keyed by race.id (actual track), not geometry ──────────────────────────
  // Data: NextGen era 2022-2026 Cup Series. apt=1-10 track aptitude score.
  // { apt, starts, top20, top10, top5, top3, wins, avg }

  // ── POCONO RACEWAY (Great American Getaway 400) ──────────────────────────
  "pocono": {
    "Denny Hamlin":       { apt:10, starts:5, top20:5, top10:4, top5:3, top3:2, wins:1, avg:6.2 },
    "Kyle Larson":        { apt:9,  starts:5, top20:4, top10:3, top5:2, top3:2, wins:1, avg:8.4 },
    "Ryan Blaney":        { apt:9,  starts:5, top20:5, top10:4, top5:3, top3:2, wins:1, avg:7.1 },
    "Chase Elliott":      { apt:8,  starts:5, top20:4, top10:3, top5:2, top3:1, wins:0, avg:9.8 },
    "William Byron":      { apt:7,  starts:5, top20:4, top10:3, top5:2, top3:1, wins:0, avg:10.2 },
    "Tyler Reddick":      { apt:7,  starts:5, top20:4, top10:3, top5:2, top3:1, wins:0, avg:10.6 },
    "Christopher Bell":   { apt:7,  starts:5, top20:4, top10:3, top5:1, top3:0, wins:0, avg:12.1 },
    "Joey Logano":        { apt:7,  starts:5, top20:4, top10:3, top5:2, top3:1, wins:1, avg:9.4 },
    "Brad Keselowski":    { apt:6,  starts:5, top20:3, top10:2, top5:1, top3:0, wins:0, avg:14.8 },
    "Chris Buescher":     { apt:6,  starts:5, top20:3, top10:2, top5:1, top3:0, wins:0, avg:14.2 },
    "Bubba Wallace":      { apt:5,  starts:5, top20:3, top10:1, top5:0, top3:0, wins:0, avg:17.4 },
    "Ross Chastain":      { apt:5,  starts:5, top20:3, top10:1, top5:1, top3:0, wins:0, avg:15.8 },
    "Austin Cindric":     { apt:5,  starts:5, top20:3, top10:2, top5:1, top3:0, wins:0, avg:14.6 },
    "Ty Gibbs":           { apt:5,  starts:3, top20:2, top10:1, top5:0, top3:0, wins:0, avg:16.3 },
    "Carson Hocevar":     { apt:4,  starts:2, top20:1, top10:0, top5:0, top3:0, wins:0, avg:21.5 },
    "Daniel Suárez":      { apt:4,  starts:5, top20:2, top10:1, top5:0, top3:0, wins:0, avg:18.6 },
    "Chase Briscoe":      { apt:6,  starts:4, top20:3, top10:2, top5:1, top3:1, wins:1, avg:10.8 },
    "Shane van Gisbergen":{ apt:5,  starts:1, top20:1, top10:0, top5:0, top3:0, wins:0, avg:18.0 },
    "Kyle Busch":         { apt:6,  starts:5, top20:3, top10:2, top5:1, top3:0, wins:0, avg:13.4 },
    "Erik Jones":         { apt:4,  starts:5, top20:2, top10:1, top5:0, top3:0, wins:0, avg:20.2 },
    "Michael McDowell":   { apt:4,  starts:5, top20:2, top10:1, top5:0, top3:0, wins:0, avg:19.8 },
  },

  // ── DAYTONA INTERNATIONAL SPEEDWAY ──────────────────────────────────────
  "daytona": {
    "Tyler Reddick":      { apt:10, starts:5, top20:5, top10:4, top5:3, top3:2, wins:2, avg:7.4 },
    "Bubba Wallace":      { apt:9,  starts:5, top20:5, top10:4, top5:2, top3:1, wins:0, avg:9.8 },
    "Ryan Blaney":        { apt:8,  starts:5, top20:4, top10:3, top5:2, top3:1, wins:0, avg:12.2 },
    "Ross Chastain":      { apt:7,  starts:5, top20:4, top10:3, top5:1, top3:1, wins:0, avg:13.4 },
    "Shane van Gisbergen":{ apt:7,  starts:2, top20:2, top10:1, top5:1, top3:0, wins:0, avg:11.5 },
    "Chase Elliott":      { apt:6,  starts:5, top20:3, top10:2, top5:1, top3:0, wins:0, avg:16.2 },
    "Kyle Larson":        { apt:6,  starts:5, top20:3, top10:2, top5:1, top3:0, wins:0, avg:15.8 },
    "Denny Hamlin":       { apt:7,  starts:5, top20:4, top10:2, top5:1, top3:1, wins:0, avg:14.6 },
    "William Byron":      { apt:6,  starts:5, top20:3, top10:2, top5:1, top3:0, wins:0, avg:15.4 },
    "Carson Hocevar":     { apt:7,  starts:3, top20:3, top10:2, top5:1, top3:0, wins:0, avg:12.3 },
    "Austin Cindric":     { apt:5,  starts:5, top20:3, top10:1, top5:0, top3:0, wins:0, avg:18.4 },
  },
  "daytona2": {
    "Tyler Reddick":      { apt:9,  starts:4, top20:4, top10:3, top5:2, top3:1, wins:1, avg:9.2 },
    "Bubba Wallace":      { apt:8,  starts:4, top20:4, top10:3, top5:1, top3:1, wins:0, avg:10.4 },
    "Ryan Blaney":        { apt:7,  starts:4, top20:3, top10:2, top5:1, top3:0, wins:0, avg:14.8 },
    "Denny Hamlin":       { apt:7,  starts:4, top20:3, top10:2, top5:1, top3:0, wins:0, avg:13.6 },
  },

  // ── TALLADEGA SUPERSPEEDWAY ──────────────────────────────────────────────
  "talladega": {
    "Shane van Gisbergen":{ apt:8,  starts:3, top20:3, top10:2, top5:2, top3:1, wins:1, avg:7.3 },
    "Tyler Reddick":      { apt:8,  starts:5, top20:4, top10:3, top5:2, top3:1, wins:0, avg:10.6 },
    "Bubba Wallace":      { apt:9,  starts:5, top20:5, top10:3, top5:2, top3:1, wins:1, avg:9.4 },
    "Ryan Blaney":        { apt:7,  starts:5, top20:4, top10:2, top5:1, top3:0, wins:0, avg:15.2 },
    "Chase Elliott":      { apt:6,  starts:5, top20:3, top10:1, top5:1, top3:0, wins:0, avg:17.4 },
    "Ross Chastain":      { apt:7,  starts:5, top20:4, top10:2, top5:1, top3:1, wins:0, avg:13.8 },
    "Kyle Larson":        { apt:5,  starts:5, top20:2, top10:1, top5:0, top3:0, wins:0, avg:20.4 },
    "Denny Hamlin":       { apt:6,  starts:5, top20:3, top10:2, top5:1, top3:0, wins:0, avg:16.2 },
    "Carson Hocevar":     { apt:7,  starts:3, top20:3, top10:2, top5:1, top3:0, wins:0, avg:11.3 },
    "Brad Keselowski":    { apt:5,  starts:5, top20:3, top10:1, top5:0, top3:0, wins:0, avg:18.8 },
  },
  "talladega2": {
    "Tyler Reddick":      { apt:8,  starts:4, top20:4, top10:3, top5:2, top3:1, wins:1, avg:8.2 },
    "Bubba Wallace":      { apt:8,  starts:4, top20:4, top10:2, top5:1, top3:1, wins:0, avg:11.4 },
    "Ross Chastain":      { apt:7,  starts:4, top20:3, top10:2, top5:1, top3:0, wins:0, avg:13.6 },
  },

  // ── MARTINSVILLE SPEEDWAY ────────────────────────────────────────────────
  "martinsville": {
    "Ryan Blaney":        { apt:10, starts:5, top20:5, top10:4, top5:3, top3:2, wins:2, avg:4.3 },
    "Denny Hamlin":       { apt:10, starts:5, top20:5, top10:5, top5:4, top3:3, wins:2, avg:5.8 },
    "William Byron":      { apt:9,  starts:5, top20:5, top10:4, top5:3, top3:2, wins:1, avg:7.2 },
    "Chase Elliott":      { apt:8,  starts:5, top20:5, top10:4, top5:3, top3:1, wins:0, avg:9.4 },
    "Christopher Bell":   { apt:7,  starts:5, top20:4, top10:3, top5:2, top3:1, wins:1, avg:10.8 },
    "Kyle Larson":        { apt:7,  starts:5, top20:4, top10:3, top5:2, top3:1, wins:1, avg:11.9 },
    "Brad Keselowski":    { apt:7,  starts:5, top20:4, top10:3, top5:2, top3:1, wins:0, avg:11.2 },
    "Tyler Reddick":      { apt:6,  starts:5, top20:3, top10:2, top5:1, top3:0, wins:0, avg:14.1 },
    "Joey Logano":        { apt:6,  starts:5, top20:3, top10:2, top5:1, top3:0, wins:0, avg:12.8 },
    "Kyle Busch":         { apt:6,  starts:5, top20:3, top10:2, top5:1, top3:0, wins:0, avg:12.4 },
    "Ross Chastain":      { apt:5,  starts:5, top20:3, top10:1, top5:0, top3:0, wins:0, avg:15.2 },
    "Austin Cindric":     { apt:5,  starts:5, top20:3, top10:2, top5:1, top3:0, wins:0, avg:13.5 },
    "Bubba Wallace":      { apt:4,  starts:5, top20:3, top10:1, top5:0, top3:0, wins:0, avg:17.3 },
    "Ty Gibbs":           { apt:4,  starts:3, top20:2, top10:1, top5:0, top3:0, wins:0, avg:14.8 },
    "Chris Buescher":     { apt:4,  starts:5, top20:3, top10:1, top5:0, top3:0, wins:0, avg:15.6 },
    "Carson Hocevar":     { apt:3,  starts:2, top20:1, top10:0, top5:0, top3:0, wins:0, avg:19.2 },
    "Daniel Suárez":      { apt:3,  starts:5, top20:2, top10:1, top5:0, top3:0, wins:0, avg:18.9 },
  },
  "martinsville2": {
    "Ryan Blaney":        { apt:10, starts:4, top20:4, top10:4, top5:3, top3:2, wins:1, avg:5.1 },
    "Denny Hamlin":       { apt:9,  starts:4, top20:4, top10:3, top5:3, top3:2, wins:1, avg:7.2 },
    "William Byron":      { apt:9,  starts:4, top20:4, top10:3, top5:2, top3:2, wins:1, avg:7.8 },
    "Chase Elliott":      { apt:8,  starts:4, top20:4, top10:3, top5:2, top3:1, wins:0, avg:9.6 },
    "Christopher Bell":   { apt:7,  starts:4, top20:3, top10:2, top5:1, top3:0, wins:0, avg:12.4 },
    "Kyle Larson":        { apt:7,  starts:4, top20:3, top10:2, top5:1, top3:1, wins:0, avg:11.2 },
  },

  // ── MICHIGAN INTERNATIONAL SPEEDWAY ─────────────────────────────────────
  "michigan": {
    "Denny Hamlin":       { apt:10, starts:5, top20:5, top10:4, top5:3, top3:2, wins:2, avg:5.8 },
    "Kyle Larson":        { apt:8,  starts:5, top20:5, top10:4, top5:3, top3:1, wins:1, avg:7.4 },
    "Tyler Reddick":      { apt:7,  starts:5, top20:4, top10:3, top5:2, top3:1, wins:1, avg:9.2 },
    "Chase Elliott":      { apt:7,  starts:5, top20:4, top10:3, top5:2, top3:0, wins:0, avg:10.8 },
    "William Byron":      { apt:6,  starts:5, top20:3, top10:2, top5:1, top3:0, wins:0, avg:13.4 },
    "Ryan Blaney":        { apt:6,  starts:5, top20:3, top10:2, top5:1, top3:0, wins:0, avg:13.8 },
    "Bubba Wallace":      { apt:7,  starts:5, top20:4, top10:2, top5:1, top3:1, wins:0, avg:11.6 },
    "Carson Hocevar":     { apt:6,  starts:3, top20:3, top10:2, top5:1, top3:0, wins:0, avg:12.3 },
    "Erik Jones":         { apt:6,  starts:5, top20:3, top10:2, top5:1, top3:1, wins:0, avg:13.2 },
    "Christopher Bell":   { apt:5,  starts:5, top20:3, top10:1, top5:0, top3:0, wins:0, avg:17.4 },
    "Brad Keselowski":    { apt:5,  starts:5, top20:3, top10:1, top5:0, top3:0, wins:0, avg:16.8 },
    "Chris Buescher":     { apt:5,  starts:5, top20:3, top10:2, top5:1, top3:0, wins:0, avg:14.6 },
  },

  // ── BRISTOL MOTOR SPEEDWAY ───────────────────────────────────────────────
  "bristol": {
    "Kyle Larson":        { apt:10, starts:5, top20:5, top10:4, top5:3, top3:2, wins:2, avg:5.6 },
    "Chase Elliott":      { apt:9,  starts:5, top20:5, top10:4, top5:3, top3:2, wins:1, avg:6.8 },
    "Denny Hamlin":       { apt:8,  starts:5, top20:4, top10:3, top5:2, top3:1, wins:0, avg:9.4 },
    "Christopher Bell":   { apt:8,  starts:5, top20:4, top10:3, top5:2, top3:1, wins:0, avg:9.8 },
    "Tyler Reddick":      { apt:7,  starts:5, top20:4, top10:3, top5:1, top3:1, wins:0, avg:10.6 },
    "William Byron":      { apt:7,  starts:5, top20:4, top10:2, top5:1, top3:0, wins:0, avg:12.4 },
    "Carson Hocevar":     { apt:6,  starts:3, top20:2, top10:1, top5:0, top3:0, wins:0, avg:15.3 },
    "Brad Keselowski":    { apt:6,  starts:5, top20:3, top10:2, top5:1, top3:0, wins:0, avg:13.8 },
    "Ryan Blaney":        { apt:5,  starts:5, top20:3, top10:1, top5:0, top3:0, wins:0, avg:17.2 },
  },
  "bristol2": {
    "Kyle Larson":        { apt:10, starts:4, top20:4, top10:3, top5:2, top3:1, wins:1, avg:6.4 },
    "Chase Elliott":      { apt:9,  starts:4, top20:4, top10:3, top5:2, top3:2, wins:1, avg:7.2 },
    "Denny Hamlin":       { apt:8,  starts:4, top20:4, top10:3, top5:2, top3:1, wins:1, avg:8.6 },
    "Christopher Bell":   { apt:7,  starts:4, top20:3, top10:2, top5:1, top3:1, wins:0, avg:11.4 },
    "Tyler Reddick":      { apt:7,  starts:4, top20:3, top10:2, top5:1, top3:0, wins:0, avg:12.2 },
  },

  // ── RICHMOND RACEWAY ────────────────────────────────────────────────────
  "richmond": {
    "Ty Gibbs":           { apt:9,  starts:4, top20:4, top10:3, top5:2, top3:1, wins:1, avg:7.8 },
    "Denny Hamlin":       { apt:9,  starts:5, top20:5, top10:4, top5:3, top3:2, wins:1, avg:6.4 },
    "Kyle Larson":        { apt:8,  starts:5, top20:4, top10:3, top5:2, top3:1, wins:1, avg:8.6 },
    "Tyler Reddick":      { apt:7,  starts:5, top20:4, top10:3, top5:2, top3:1, wins:0, avg:9.8 },
    "Christopher Bell":   { apt:7,  starts:5, top20:4, top10:3, top5:2, top3:0, wins:0, avg:10.4 },
    "Chase Elliott":      { apt:7,  starts:5, top20:4, top10:3, top5:1, top3:0, wins:0, avg:11.6 },
    "William Byron":      { apt:6,  starts:5, top20:3, top10:2, top5:1, top3:0, wins:0, avg:13.2 },
    "Ryan Blaney":        { apt:6,  starts:5, top20:3, top10:2, top5:1, top3:0, wins:0, avg:13.8 },
    "Brad Keselowski":    { apt:6,  starts:5, top20:3, top10:2, top5:1, top3:0, wins:0, avg:14.2 },
    "Chris Buescher":     { apt:5,  starts:5, top20:3, top10:1, top5:0, top3:0, wins:0, avg:16.4 },
    "Carson Hocevar":     { apt:5,  starts:3, top20:2, top10:1, top5:0, top3:0, wins:0, avg:16.7 },
  },

  // ── CHARLOTTE MOTOR SPEEDWAY (oval) ─────────────────────────────────────
  "charlotte": {
    "Kyle Larson":        { apt:9,  starts:5, top20:5, top10:4, top5:3, top3:2, wins:2, avg:6.4 },
    "Tyler Reddick":      { apt:9,  starts:5, top20:5, top10:4, top5:3, top3:2, wins:1, avg:7.2 },
    "William Byron":      { apt:8,  starts:5, top20:4, top10:3, top5:2, top3:1, wins:1, avg:8.6 },
    "Denny Hamlin":       { apt:7,  starts:5, top20:4, top10:3, top5:2, top3:1, wins:0, avg:10.4 },
    "Ryan Blaney":        { apt:7,  starts:5, top20:4, top10:3, top5:2, top3:1, wins:0, avg:10.8 },
    "Chase Elliott":      { apt:7,  starts:5, top20:4, top10:3, top5:2, top3:0, wins:0, avg:11.2 },
    "Christopher Bell":   { apt:6,  starts:5, top20:3, top10:2, top5:1, top3:0, wins:0, avg:13.6 },
    "Ty Gibbs":           { apt:6,  starts:4, top20:3, top10:2, top5:1, top3:1, wins:0, avg:12.4 },
    "Brad Keselowski":    { apt:5,  starts:5, top20:3, top10:1, top5:0, top3:0, wins:0, avg:16.8 },
    "Ross Chastain":      { apt:5,  starts:5, top20:3, top10:1, top5:0, top3:0, wins:0, avg:17.4 },
  },

  // ── CHARLOTTE ROVAL ─────────────────────────────────────────────────────
  "charlotte2": {
    "Chase Elliott":      { apt:10, starts:5, top20:5, top10:4, top5:4, top3:2, wins:2, avg:5.4 },
    "Kyle Larson":        { apt:9,  starts:5, top20:5, top10:4, top5:3, top3:2, wins:1, avg:6.8 },
    "Tyler Reddick":      { apt:8,  starts:5, top20:4, top10:3, top5:2, top3:1, wins:1, avg:8.4 },
    "Shane van Gisbergen":{ apt:8,  starts:2, top20:2, top10:2, top5:1, top3:0, wins:0, avg:9.5 },
    "Ross Chastain":      { apt:7,  starts:5, top20:4, top10:3, top5:2, top3:1, wins:0, avg:10.6 },
    "Christopher Bell":   { apt:7,  starts:5, top20:4, top10:3, top5:2, top3:1, wins:0, avg:11.2 },
    "Denny Hamlin":       { apt:6,  starts:5, top20:3, top10:2, top5:1, top3:0, wins:0, avg:14.6 },
    "Ryan Blaney":        { apt:6,  starts:5, top20:3, top10:2, top5:1, top3:0, wins:0, avg:13.8 },
    "William Byron":      { apt:6,  starts:5, top20:3, top10:2, top5:1, top3:0, wins:0, avg:13.4 },
  },

  // ── DOVER MOTOR SPEEDWAY ─────────────────────────────────────────────────
  "dover": {
    "Kyle Larson":        { apt:10, starts:5, top20:5, top10:4, top5:3, top3:2, wins:2, avg:5.8 },
    "Chase Elliott":      { apt:9,  starts:5, top20:5, top10:4, top5:3, top3:2, wins:1, avg:7.2 },
    "Tyler Reddick":      { apt:7,  starts:5, top20:4, top10:2, top5:1, top3:0, wins:0, avg:12.4 },
    "Denny Hamlin":       { apt:7,  starts:5, top20:4, top10:3, top5:2, top3:1, wins:0, avg:10.6 },
    "William Byron":      { apt:6,  starts:5, top20:3, top10:2, top5:1, top3:0, wins:0, avg:13.8 },
    "Christopher Bell":   { apt:6,  starts:5, top20:3, top10:2, top5:1, top3:0, wins:0, avg:14.2 },
    "Kyle Busch":         { apt:6,  starts:5, top20:3, top10:2, top5:1, top3:0, wins:0, avg:13.6 },
    "Ryan Blaney":        { apt:5,  starts:5, top20:3, top10:1, top5:0, top3:0, wins:0, avg:17.4 },
    "Brad Keselowski":    { apt:5,  starts:5, top20:3, top10:1, top5:0, top3:0, wins:0, avg:16.8 },
  },

  // ── DARLINGTON RACEWAY ───────────────────────────────────────────────────
  "darlington": {
    "Denny Hamlin":       { apt:10, starts:5, top20:5, top10:4, top5:4, top3:3, wins:2, avg:5.2 },
    "Kyle Larson":        { apt:8,  starts:5, top20:4, top10:3, top5:2, top3:1, wins:0, avg:9.4 },
    "Tyler Reddick":      { apt:8,  starts:5, top20:4, top10:3, top5:2, top3:1, wins:1, avg:8.6 },
    "Brad Keselowski":    { apt:8,  starts:5, top20:4, top10:3, top5:2, top3:2, wins:1, avg:7.8 },
    "William Byron":      { apt:7,  starts:5, top20:4, top10:3, top5:2, top3:1, wins:1, avg:9.2 },
    "Chase Elliott":      { apt:6,  starts:5, top20:3, top10:2, top5:1, top3:0, wins:0, avg:13.4 },
    "Ryan Blaney":        { apt:6,  starts:5, top20:3, top10:2, top5:1, top3:0, wins:0, avg:13.8 },
    "Christopher Bell":   { apt:6,  starts:5, top20:3, top10:2, top5:1, top3:0, wins:0, avg:14.2 },
    "Chris Buescher":     { apt:5,  starts:5, top20:3, top10:1, top5:0, top3:0, wins:0, avg:16.6 },
    "Bubba Wallace":      { apt:4,  starts:5, top20:2, top10:1, top5:0, top3:0, wins:0, avg:19.4 },
  },

  // ── CIRCUIT OF THE AMERICAS ──────────────────────────────────────────────
  "cota": {
    "Tyler Reddick":      { apt:10, starts:4, top20:4, top10:4, top5:3, top3:2, wins:2, avg:4.8 },
    "Kyle Larson":        { apt:10, starts:5, top20:5, top10:4, top5:4, top3:3, wins:2, avg:4.2 },
    "Chase Elliott":      { apt:9,  starts:5, top20:5, top10:4, top5:3, top3:2, wins:1, avg:6.4 },
    "Ross Chastain":      { apt:8,  starts:5, top20:4, top10:3, top5:2, top3:1, wins:0, avg:9.8 },
    "Shane van Gisbergen":{ apt:8,  starts:2, top20:2, top10:2, top5:1, top3:0, wins:0, avg:8.5 },
    "Ryan Blaney":        { apt:6,  starts:5, top20:3, top10:2, top5:1, top3:0, wins:0, avg:14.6 },
    "Christopher Bell":   { apt:6,  starts:5, top20:3, top10:2, top5:1, top3:0, wins:0, avg:13.8 },
    "Denny Hamlin":       { apt:5,  starts:5, top20:2, top10:1, top5:0, top3:0, wins:0, avg:18.4 },
    "William Byron":      { apt:5,  starts:5, top20:2, top10:1, top5:0, top3:0, wins:0, avg:17.6 },
    "Austin Cindric":     { apt:6,  starts:5, top20:3, top10:2, top5:1, top3:0, wins:0, avg:13.2 },
  },

  // ── SONOMA RACEWAY ───────────────────────────────────────────────────────
  "sonoma": {
    "Kyle Larson":        { apt:10, starts:5, top20:5, top10:5, top5:4, top3:3, wins:3, avg:3.8 },
    "Chase Elliott":      { apt:9,  starts:5, top20:5, top10:4, top5:3, top3:2, wins:1, avg:6.4 },
    "Tyler Reddick":      { apt:8,  starts:5, top20:4, top10:3, top5:2, top3:1, wins:0, avg:9.8 },
    "Shane van Gisbergen":{ apt:8,  starts:2, top20:2, top10:2, top5:1, top3:1, wins:0, avg:7.5 },
    "Ross Chastain":      { apt:7,  starts:5, top20:4, top10:3, top5:1, top3:0, wins:0, avg:12.4 },
    "Christopher Bell":   { apt:6,  starts:5, top20:3, top10:2, top5:1, top3:0, wins:0, avg:14.2 },
    "Denny Hamlin":       { apt:5,  starts:5, top20:2, top10:1, top5:0, top3:0, wins:0, avg:19.4 },
    "Ryan Blaney":        { apt:5,  starts:5, top20:2, top10:1, top5:0, top3:0, wins:0, avg:18.8 },
  },

  // ── PHOENIX RACEWAY ──────────────────────────────────────────────────────
  "phoenix": {
    "Ryan Blaney":        { apt:9,  starts:5, top20:5, top10:4, top5:3, top3:2, wins:2, avg:5.6 },
    "Denny Hamlin":       { apt:8,  starts:5, top20:5, top10:3, top5:2, top3:1, wins:0, avg:10.4 },
    "Kyle Larson":        { apt:8,  starts:5, top20:4, top10:3, top5:2, top3:1, wins:1, avg:8.8 },
    "Chase Elliott":      { apt:7,  starts:5, top20:4, top10:3, top5:2, top3:1, wins:0, avg:11.2 },
    "Tyler Reddick":      { apt:6,  starts:5, top20:3, top10:2, top5:1, top3:0, wins:0, avg:14.6 },
    "Christopher Bell":   { apt:6,  starts:5, top20:3, top10:2, top5:1, top3:0, wins:0, avg:13.8 },
    "William Byron":      { apt:6,  starts:5, top20:3, top10:2, top5:1, top3:0, wins:0, avg:13.4 },
    "Brad Keselowski":    { apt:6,  starts:5, top20:3, top10:2, top5:1, top3:0, wins:0, avg:14.2 },
    "Austin Cindric":     { apt:5,  starts:5, top20:3, top10:1, top5:0, top3:0, wins:0, avg:17.8 },
    "Joey Logano":        { apt:7,  starts:5, top20:4, top10:3, top5:2, top3:1, wins:1, avg:9.6 },
  },
  "phoenix2": {
    "Ryan Blaney":        { apt:9,  starts:4, top20:4, top10:3, top5:2, top3:1, wins:1, avg:7.4 },
    "Denny Hamlin":       { apt:8,  starts:4, top20:4, top10:3, top5:2, top3:1, wins:0, avg:9.8 },
    "Kyle Larson":        { apt:8,  starts:4, top20:4, top10:3, top5:2, top3:1, wins:1, avg:8.2 },
    "Joey Logano":        { apt:7,  starts:4, top20:3, top10:2, top5:1, top3:1, wins:1, avg:9.4 },
  },

  // ── NASHVILLE SUPERSPEEDWAY ──────────────────────────────────────────────
  "nashville": {
    "Denny Hamlin":       { apt:9,  starts:4, top20:4, top10:3, top5:3, top3:2, wins:2, avg:5.4 },
    "Kyle Larson":        { apt:8,  starts:4, top20:4, top10:3, top5:2, top3:1, wins:0, avg:9.2 },
    "Tyler Reddick":      { apt:8,  starts:4, top20:4, top10:3, top5:2, top3:1, wins:0, avg:9.8 },
    "William Byron":      { apt:7,  starts:4, top20:3, top10:2, top5:1, top3:0, wins:0, avg:12.4 },
    "Christopher Bell":   { apt:6,  starts:4, top20:3, top10:2, top5:1, top3:0, wins:0, avg:14.2 },
    "Ryan Blaney":        { apt:6,  starts:4, top20:3, top10:2, top5:1, top3:0, wins:0, avg:13.8 },
    "Chase Elliott":      { apt:6,  starts:4, top20:3, top10:2, top5:1, top3:0, wins:0, avg:13.4 },
    "Ty Gibbs":           { apt:6,  starts:3, top20:3, top10:2, top5:1, top3:0, wins:0, avg:13.6 },
    "Bubba Wallace":      { apt:5,  starts:4, top20:2, top10:1, top5:0, top3:0, wins:0, avg:18.2 },
  },

  // ── NORTH WILKESBORO ─────────────────────────────────────────────────────
  "nwilkes": {
    "Chase Elliott":      { apt:9,  starts:2, top20:2, top10:2, top5:1, top3:1, wins:1, avg:5.5 },
    "Kyle Larson":        { apt:8,  starts:2, top20:2, top10:2, top5:1, top3:0, wins:0, avg:8.5 },
    "Denny Hamlin":       { apt:7,  starts:2, top20:2, top10:1, top5:1, top3:1, wins:0, avg:9.5 },
    "Tyler Reddick":      { apt:7,  starts:2, top20:2, top10:1, top5:1, top3:0, wins:0, avg:10.5 },
    "Ryan Blaney":        { apt:6,  starts:2, top20:1, top10:1, top5:0, top3:0, wins:0, avg:14.5 },
    "William Byron":      { apt:6,  starts:2, top20:1, top10:1, top5:0, top3:0, wins:0, avg:13.5 },
  },

  // ── LAS VEGAS MOTOR SPEEDWAY ─────────────────────────────────────────────
  "las_vegas": {
    "Denny Hamlin":       { apt:9,  starts:5, top20:4, top10:3, top5:2, top3:2, wins:2, avg:7.4 },
    "Kyle Larson":        { apt:8,  starts:5, top20:4, top10:3, top5:2, top3:1, wins:1, avg:8.8 },
    "Tyler Reddick":      { apt:7,  starts:5, top20:4, top10:3, top5:1, top3:1, wins:0, avg:10.8 },
    "William Byron":      { apt:7,  starts:5, top20:4, top10:3, top5:2, top3:1, wins:0, avg:9.6 },
    "Ryan Blaney":        { apt:7,  starts:5, top20:4, top10:2, top5:1, top3:0, wins:0, avg:12.4 },
    "Chase Elliott":      { apt:6,  starts:5, top20:3, top10:2, top5:1, top3:0, wins:0, avg:13.8 },
    "Christopher Bell":   { apt:6,  starts:5, top20:3, top10:2, top5:1, top3:0, wins:0, avg:13.4 },
    "Brad Keselowski":    { apt:5,  starts:5, top20:3, top10:1, top5:0, top3:0, wins:0, avg:17.2 },
    "Joey Logano":        { apt:6,  starts:5, top20:3, top10:2, top5:1, top3:0, wins:0, avg:12.8 },
  },

  // ── ATLANTA MOTOR SPEEDWAY (superspeedway config) ────────────────────────
  "atlanta": {
    "Tyler Reddick":      { apt:9,  starts:4, top20:4, top10:3, top5:3, top3:2, wins:1, avg:7.2 },
    "Bubba Wallace":      { apt:8,  starts:4, top20:4, top10:3, top5:2, top3:1, wins:0, avg:9.8 },
    "Ryan Blaney":        { apt:7,  starts:4, top20:3, top10:2, top5:1, top3:0, wins:0, avg:13.4 },
    "Ross Chastain":      { apt:7,  starts:4, top20:3, top10:2, top5:1, top3:0, wins:0, avg:12.8 },
    "Carson Hocevar":     { apt:7,  starts:3, top20:3, top10:2, top5:1, top3:0, wins:0, avg:11.3 },
    "Shane van Gisbergen":{ apt:6,  starts:2, top20:2, top10:1, top5:0, top3:0, wins:0, avg:14.5 },
    "Chase Elliott":      { apt:5,  starts:4, top20:2, top10:1, top5:0, top3:0, wins:0, avg:18.6 },
    "Kyle Larson":        { apt:5,  starts:4, top20:2, top10:1, top5:0, top3:0, wins:0, avg:17.8 },
    "William Byron":      { apt:5,  starts:4, top20:2, top10:1, top5:0, top3:0, wins:0, avg:17.2 },
    "Denny Hamlin":       { apt:5,  starts:4, top20:2, top10:1, top5:0, top3:0, wins:0, avg:18.4 },
  },

  // ── HOMESTEAD-MIAMI SPEEDWAY ─────────────────────────────────────────────
  "homestead2": {
    "Tyler Reddick":      { apt:9,  starts:4, top20:4, top10:3, top5:2, top3:2, wins:1, avg:7.8 },
    "Denny Hamlin":       { apt:8,  starts:4, top20:4, top10:3, top5:2, top3:1, wins:1, avg:8.4 },
    "Kyle Larson":        { apt:8,  starts:4, top20:4, top10:3, top5:2, top3:1, wins:1, avg:8.8 },
    "Joey Logano":        { apt:7,  starts:4, top20:3, top10:2, top5:1, top3:1, wins:1, avg:9.2 },
  },

  // ── CHICAGOLAND SPEEDWAY (moved to intermediate oval for 2026) ───────────
  "chicagoland": {
    "Chase Briscoe":      { apt:8,  starts:3, top20:3, top10:2, top5:2, top3:1, wins:1, avg:6.7 },
    "Denny Hamlin":       { apt:7,  starts:3, top20:3, top10:2, top5:1, top3:1, wins:0, avg:9.3 },
    "Kyle Larson":        { apt:7,  starts:3, top20:3, top10:2, top5:1, top3:0, wins:0, avg:10.7 },
    "Tyler Reddick":      { apt:6,  starts:3, top20:2, top10:1, top5:1, top3:0, wins:0, avg:12.3 },
    "Chase Elliott":      { apt:6,  starts:3, top20:2, top10:1, top5:0, top3:0, wins:0, avg:13.7 },
    "William Byron":      { apt:6,  starts:3, top20:2, top10:1, top5:0, top3:0, wins:0, avg:14.3 },
    "Ryan Blaney":        { apt:5,  starts:3, top20:2, top10:1, top5:0, top3:0, wins:0, avg:15.3 },
  },

  // ── KANSAS SPEEDWAY ───────────────────────────────────────────────────────
  "kansas": {
    "Tyler Reddick":      { apt:9,  starts:5, top20:5, top10:4, top5:3, top3:2, wins:1, avg:7.4 },
    "Kyle Larson":        { apt:9,  starts:5, top20:5, top10:4, top5:3, top3:2, wins:1, avg:7.9 },
    "Denny Hamlin":       { apt:8,  starts:5, top20:5, top10:4, top5:2, top3:1, wins:1, avg:8.8 },
    "William Byron":      { apt:8,  starts:5, top20:4, top10:3, top5:2, top3:1, wins:1, avg:9.6 },
    "Chase Elliott":      { apt:7,  starts:5, top20:4, top10:3, top5:1, top3:0, wins:0, avg:11.8 },
    "Carson Hocevar":     { apt:6,  starts:3, top20:3, top10:2, top5:1, top3:0, wins:0, avg:11.9 },
    "Ryan Blaney":        { apt:6,  starts:5, top20:3, top10:2, top5:1, top3:0, wins:0, avg:14.2 },
    "Christopher Bell":   { apt:6,  starts:5, top20:3, top10:2, top5:1, top3:0, wins:0, avg:13.6 },
    "Ty Gibbs":           { apt:6,  starts:3, top20:2, top10:2, top5:1, top3:0, wins:0, avg:12.4 },
    "Brad Keselowski":    { apt:5,  starts:5, top20:3, top10:1, top5:0, top3:0, wins:0, avg:16.4 },
  },

  // ── TEXAS MOTOR SPEEDWAY ──────────────────────────────────────────────────
  "texas": {
    "Chase Elliott":      { apt:8,  starts:5, top20:5, top10:3, top5:2, top3:1, wins:1, avg:8.6 },
    "Kyle Larson":        { apt:8,  starts:5, top20:4, top10:3, top5:2, top3:1, wins:1, avg:9.2 },
    "Denny Hamlin":       { apt:7,  starts:5, top20:4, top10:3, top5:2, top3:1, wins:0, avg:10.4 },
    "Tyler Reddick":      { apt:7,  starts:5, top20:4, top10:3, top5:1, top3:1, wins:0, avg:11.2 },
    "William Byron":      { apt:7,  starts:5, top20:4, top10:2, top5:1, top3:0, wins:0, avg:12.6 },
    "Ryan Blaney":        { apt:6,  starts:5, top20:3, top10:2, top5:1, top3:0, wins:0, avg:13.8 },
    "Ty Gibbs":           { apt:6,  starts:3, top20:2, top10:1, top5:1, top3:0, wins:0, avg:13.4 },
    "Christopher Bell":   { apt:5,  starts:5, top20:3, top10:1, top5:0, top3:0, wins:0, avg:15.8 },
  },

  // ── WATKINS GLEN INTERNATIONAL ────────────────────────────────────────────
  "watkins_glen": {
    "Shane van Gisbergen":{ apt:10, starts:3, top20:3, top10:3, top5:3, top3:2, wins:1, avg:4.6 },
    "Chase Elliott":      { apt:9,  starts:5, top20:5, top10:4, top5:3, top3:2, wins:2, avg:6.2 },
    "Kyle Larson":        { apt:8,  starts:5, top20:5, top10:4, top5:2, top3:1, wins:0, avg:8.6 },
    "Christopher Bell":   { apt:7,  starts:5, top20:4, top10:3, top5:1, top3:1, wins:0, avg:10.4 },
    "Ross Chastain":      { apt:7,  starts:5, top20:4, top10:3, top5:1, top3:0, wins:0, avg:11.2 },
    "Tyler Reddick":      { apt:6,  starts:5, top20:3, top10:2, top5:1, top3:0, wins:0, avg:13.4 },
    "Denny Hamlin":       { apt:5,  starts:5, top20:3, top10:1, top5:0, top3:0, wins:0, avg:17.8 },
    "Ryan Blaney":        { apt:5,  starts:5, top20:3, top10:1, top5:0, top3:0, wins:0, avg:17.2 },
  },

  // ── CORONADO STREET COURSE (new venue, 2026) ──────────────────────────────
  "coronado": {
    "Corey Heim":         { apt:8,  starts:1, top20:1, top10:1, top5:1, top3:1, wins:1, avg:2.0 },
    "Shane van Gisbergen":{ apt:8,  starts:1, top20:1, top10:1, top5:1, top3:0, wins:0, avg:5.0 },
    "Chase Elliott":      { apt:7,  starts:1, top20:1, top10:1, top5:0, top3:0, wins:0, avg:8.0 },
    "Ross Chastain":      { apt:6,  starts:1, top20:1, top10:1, top5:0, top3:0, wins:0, avg:9.0 },
    "Christopher Bell":   { apt:6,  starts:1, top20:1, top10:0, top5:0, top3:0, wins:0, avg:12.0 },
    "Kyle Larson":        { apt:5,  starts:1, top20:1, top10:0, top5:0, top3:0, wins:0, avg:14.0 },
  },

  // ── IOWA SPEEDWAY ────────────────────────────────────────────────────────
  "iowa": {
    "Kyle Larson":        { apt:9,  starts:3, top20:3, top10:3, top5:2, top3:1, wins:1, avg:6.3 },
    "Denny Hamlin":       { apt:8,  starts:3, top20:3, top10:2, top5:2, top3:1, wins:1, avg:7.3 },
    "Tyler Reddick":      { apt:7,  starts:3, top20:3, top10:2, top5:1, top3:0, wins:0, avg:10.7 },
    "Christopher Bell":   { apt:7,  starts:3, top20:3, top10:2, top5:1, top3:0, wins:0, avg:11.3 },
    "Chase Elliott":      { apt:6,  starts:3, top20:2, top10:1, top5:1, top3:0, wins:0, avg:13.7 },
    "William Byron":      { apt:6,  starts:3, top20:2, top10:1, top5:0, top3:0, wins:0, avg:15.3 },
    "Ty Gibbs":           { apt:7,  starts:2, top20:2, top10:2, top5:1, top3:1, wins:0, avg:8.5 },
    "Ryan Blaney":        { apt:5,  starts:3, top20:2, top10:1, top5:0, top3:0, wins:0, avg:16.7 },
  },

  // ── NEW HAMPSHIRE MOTOR SPEEDWAY ─────────────────────────────────────────
  "nh": {
    "Christopher Bell":   { apt:8,  starts:4, top20:4, top10:3, top5:2, top3:1, wins:1, avg:7.8 },
    "Kyle Larson":        { apt:8,  starts:4, top20:4, top10:3, top5:2, top3:1, wins:1, avg:8.2 },
    "Denny Hamlin":       { apt:7,  starts:4, top20:4, top10:3, top5:2, top3:1, wins:0, avg:9.8 },
    "Tyler Reddick":      { apt:6,  starts:4, top20:3, top10:2, top5:1, top3:0, wins:0, avg:12.8 },
    "Ryan Blaney":        { apt:6,  starts:4, top20:3, top10:2, top5:1, top3:0, wins:0, avg:13.4 },
    "William Byron":      { apt:5,  starts:4, top20:2, top10:1, top5:0, top3:0, wins:0, avg:17.8 },
    "Chase Elliott":      { apt:6,  starts:4, top20:3, top10:2, top5:1, top3:0, wins:0, avg:13.8 },
    "Brad Keselowski":    { apt:6,  starts:4, top20:3, top10:2, top5:1, top3:0, wins:0, avg:13.2 },
  },

  // ── INDIANAPOLIS MOTOR SPEEDWAY ──────────────────────────────────────────
  "indy": {
    "Tyler Reddick":      { apt:8,  starts:4, top20:4, top10:3, top5:2, top3:2, wins:1, avg:7.8 },
    "Kyle Larson":        { apt:7,  starts:4, top20:3, top10:2, top5:1, top3:1, wins:0, avg:11.5 },
    "Chase Elliott":      { apt:7,  starts:4, top20:3, top10:2, top5:1, top3:0, wins:0, avg:12.3 },
    "Ryan Blaney":        { apt:6,  starts:4, top20:3, top10:2, top5:1, top3:0, wins:0, avg:13.8 },
    "Denny Hamlin":       { apt:6,  starts:4, top20:3, top10:1, top5:1, top3:0, wins:0, avg:14.2 },
    "Shane van Gisbergen":{ apt:7,  starts:2, top20:2, top10:2, top5:1, top3:0, wins:0, avg:9.5 },
    "William Byron":      { apt:5,  starts:4, top20:2, top10:1, top5:0, top3:0, wins:0, avg:17.3 },
  },

  // ── DAYTONA (summer race) reuses daytona2 ─────────────────────────────
  // ── TALLADEGA (fall) reuses talladega2 ────────────────────────────────
};

// Second-visit races at the same physical track reuse that track's history table
TRACK_HISTORY.atlanta2 = TRACK_HISTORY.atlanta;
TRACK_HISTORY.darlington2 = TRACK_HISTORY.darlington;
TRACK_HISTORY.las_vegas2 = TRACK_HISTORY.las_vegas;
TRACK_HISTORY.kansas2 = TRACK_HISTORY.kansas;

// -- MANUFACTURER LOOKUP ---------------------------------------------------------
// Live standings (api/standings.js) don't carry manufacturer, so the cron scorecard
// job needs this to apply manufacturerBonus() the same way the browser's
// FALLBACK_DRIVERS-derived roster does. Cup only for now -- Xfinity/Truck
// predictions from the cron job will simply get 0 manufacturer bonus until this
// is extended, which is a known, acceptable gap (small additive term).
export const DRIVER_MANUFACTURERS = {
  "Denny Hamlin":"Toyota", "Tyler Reddick":"Toyota", "Ryan Blaney":"Ford", "Ty Gibbs":"Toyota",
  "Chase Elliott":"Chevrolet", "Kyle Larson":"Chevrolet", "Chris Buescher":"Ford", "Carson Hocevar":"Chevrolet",
  "Christopher Bell":"Toyota", "Chase Briscoe":"Toyota", "Daniel Suárez":"Chevrolet", "William Byron":"Chevrolet",
  "Bubba Wallace":"Toyota", "Austin Cindric":"Ford", "Shane van Gisbergen":"Chevrolet", "Erik Jones":"Toyota",
  "Joey Logano":"Ford", "Ryan Preece":"Ford", "Brad Keselowski":"Ford", "Ross Chastain":"Chevrolet",
  "Michael McDowell":"Ford", "AJ Allmendinger":"Chevrolet", "Zane Smith":"Ford", "Todd Gilliland":"Chevrolet",
  "Riley Herbst":"Toyota",
};

// -- SIMULATION ----------------------------------------------------------------
export function gumbelRandom(mu=0, beta=1){ return mu - beta * Math.log(-Math.log(Math.random())); }

// -- RECENT FORM: last 5 finishes (oldest→newest), most recent weighted 2x the oldest --
// Returns a momentum multiplier centered on 1.0 (0.85-1.15 range).
export function recentFormMultiplier(last5){
  if(!last5 || !last5.length) return 1.0;
  const n = last5.length;
  let weightedSum = 0, weightTotal = 0;
  last5.forEach((fin, i) => {
    const w = 1 + (i/(n-1||1)); // 1x oldest -> 2x most recent
    const finStrength = 1 - Math.max(0, Math.min(1, (fin-1)/35)); // 1=win, 0=35th+
    weightedSum += finStrength * w;
    weightTotal += w;
  });
  return 0.85 + (weightedSum/weightTotal) * 0.3;
}

// -- MANUFACTURER ADVANTAGE BY TRACK TYPE (2026 aero package) — composite point bonus --
export const MANUFACTURER_BONUS = {
  "Superspeedway": { Toyota:2.5, Chevrolet:1.0, Ford:0.5 },
  "Intermediate":  { Toyota:2.0, Chevrolet:1.5, Ford:1.0 },
  "Short Track":   { Toyota:1.0, Chevrolet:1.5, Ford:1.5 },
  "Road Course":   { Toyota:0.5, Chevrolet:1.5, Ford:2.0 },
};
export function manufacturerBonus(manufacturer, trackType){
  return MANUFACTURER_BONUS[trackType]?.[manufacturer] || 0;
}

// -- QUALIFYING POSITION MODIFIER — composite point bonus, only applied if qualifyingPos is set --
export function qualifyingBonus(pos){
  if(!pos) return 0;
  if(pos<=5) return 3;
  if(pos<=10) return 1.5;
  if(pos<=20) return 0;
  return -1.0;
}

export function runSim(race, series, drivers, iters=25000){
  // Key by race.id for per-track history; fall back to geo-based if not found
  const staticHist = TRACK_HISTORY[race.id] || TRACK_HISTORY[race.geo] || {};
  const maxWins = Math.max(...drivers.map(d=>d.wins||0), 1);
  const chaosLevel = race.chaos;
  const trackType = race.type;

  const pool = drivers.map(d=>{
    // _liveHist is injected by the caller when live track-trend data is available
    // It takes priority over the static TRACK_HISTORY table
    const h = d._liveHist || staticHist[d.name] || { apt:3, starts:0, top20:0, top10:0, top5:0, top3:0, wins:0, avg:25 };

    // Composite score: Track History 30% | Momentum+WinRate 20% | Chaos Avoidance 20% | Skill+QualSpeed 15% | Pit/Aero 15%
    const winRate = h.wins / Math.max(h.starts,1);
    const top5Rate = h.top5 / Math.max(h.starts,1);
    const avgScore = Math.max(0, (35 - h.avg) / 35);
    const trackHistScore = (h.apt/10)*40 + winRate*30 + top5Rate*20 + avgScore*10; // 0-100

    const formMult = recentFormMultiplier(d.last5);
    const seasonWinRate = (d.wins||0) / maxWins;
    const seasonScore = Math.min(100, (d.mom||0)*formMult*0.75 + seasonWinRate*100*0.25); // 0-100ish

    const chaosScore = (d.chaosAvoid/10) * 100; // 0-100

    const speedNorm = Math.max(0, Math.min(100, (d.spd-155)/16*100));
    const skillQualScore = d.skill*0.65 + speedNorm*0.35; // 0-100

    const pitAeroScore = (d.aero/10) * 100; // 0-100

    let score = trackHistScore*0.30 + seasonScore*0.20 + chaosScore*0.20 + skillQualScore*0.15 + pitAeroScore*0.15;
    score += manufacturerBonus(d.manufacturer, trackType);
    score += qualifyingBonus(d.qualifyingPos);
    if(d.rookie) score -= 3;
    if(d.sub || d.parttime) score -= 2;

    // Chaos bonus (display only): this driver's actual chaos-avoidance contribution to the
    // composite score above, relative to a neutral (5.5/10) driver -- scales with track chaos level
    const chaosBonus = (d.chaosAvoid*2 - 11) * (0.6 + chaosLevel*0.4);
    return { ...d, score, hist: h, chaosBonus: parseFloat(chaosBonus.toFixed(2)), histSource: d._liveHist ? "live" : "static", formMultiplier: parseFloat(formMult.toFixed(2)) };
  });

  const wins={}, top5={}, top10={}, dnfCount={};
  pool.forEach(d=>{ wins[d.name]=0; top5[d.name]=0; top10[d.name]=0; dnfCount[d.name]=0; });

  for(let i=0;i<iters;i++){
    // Per-iteration: each driver rolls a chaos incident check
    // Low chaosAvoid + high chaos track = higher DNF probability
    const run = pool.map(d=>{
      // DNF probability: base = chaos * (1 - chaosAvoid/10) * 0.18
      const dnfProb = chaosLevel * (1 - d.chaosAvoid/10) * 0.18;
      const isDNF = Math.random() < dnfProb;
      if(isDNF){ dnfCount[d.name]++; return { name:d.name, s: -99 - Math.random()*10 }; }
      return { name:d.name, s: d.score + gumbelRandom(0, chaosLevel*6) + (Math.random()-.5)*9 };
    }).sort((a,b)=>b.s-a.s);
    wins[run[0].name]++;
    run.slice(0,5).forEach(d=>top5[d.name]++);
    run.slice(0,10).forEach(d=>top10[d.name]++);
  }

  return pool.map(d=>({
    ...d,
    winPct:   ((wins[d.name]/iters)*100).toFixed(1),
    top5Pct:  ((top5[d.name]/iters)*100).toFixed(1),
    top10Pct: ((top10[d.name]/iters)*100).toFixed(1),
    dnfPct:   ((dnfCount[d.name]/iters)*100).toFixed(1),
  })).sort((a,b)=>parseFloat(b.winPct)-parseFloat(a.winPct));
}

export function genChart(race, results){
  const top8 = results.slice(0,8);
  const LAPS = race.id?.includes("martin") ? 400 : race.id?.includes("talladega") ? 188 : 300;
  const STEPS = 30; const step = Math.floor(LAPS/STEPS);

  // Race events: caution window at 40-60% distance, restart immediately after,
  // fuel window at 75-85% distance
  const cautionStep = Math.round(STEPS*(0.40 + Math.random()*0.20));
  const restartStep = Math.min(STEPS, cautionStep+1);
  const fuelStep = Math.round(STEPS*(0.75 + Math.random()*0.10));
  const events = {
    caution: { lap: cautionStep*step, label: "CAUTION" },
    restart: { lap: restartStep*step, label: "RESTART" },
    fuel:    { lap: fuelStep*step, label: "FUEL" },
  };

  const data = []; let probs = {};
  top8.forEach(d=>{ probs[d.name]=parseFloat(d.winPct); });
  for(let i=0;i<=STEPS;i++){
    const snap = { lap:i*step };
    const fieldAvg = top8.reduce((s,d)=>s+probs[d.name],0) / top8.length;
    top8.forEach(d=>{
      const drift = (Math.random()-.48)*race.chaos*13*(1+(i/STEPS)*.6);
      const tb = (d.hist?.apt||3)/10*Math.random()*4;
      const late = i>STEPS*.7 ? d.mom/100*5 : 0;

      // CAUTION: field bunches up, probabilities flatten toward the mean
      const cautionPull = i===cautionStep ? (fieldAvg-probs[d.name])*0.5 : 0;
      // RESTART: clean racers with strong track position get a temporary surge
      const restartSurge = i===restartStep && d.chaosAvoid>=8 && (d.hist?.apt||0)>=7 ? 6 + Math.random()*4 : 0;
      // FUEL WINDOW: drivers whose track history suggests fuel-mileage ability (low avg finish
      // at this track) get a probability spike if they're plausibly on a long-run strategy
      const fuelSpike = i===fuelStep && (d.hist?.avg||99)<=12 ? 4 + Math.random()*5 : 0;

      probs[d.name] = Math.max(0.3, Math.min(85, probs[d.name]+drift+tb-2+late+cautionPull+restartSurge+fuelSpike));
      snap[d.name] = parseFloat(probs[d.name].toFixed(1));
    });
    const tot = top8.reduce((s,d)=>s+(snap[d.name]||0),0);
    top8.forEach(d=>{ snap[d.name]=parseFloat(((snap[d.name]||0)/tot*100).toFixed(1)); });
    data.push(snap);
  }
  return { data, drivers:top8, laps:LAPS, events };
}
