# Final Lap — Project Notes

NASCAR predictive analytics PWA (React/Vite, deployed on Vercel Pro at lap.prsmlabs.app).
Repo: prsm-labs/final-lap. Single-file frontend (`src/App.jsx`), Vercel edge functions in `api/`.

## Architecture — live data sources

All of these hit `cf.nascar.com/cacher/...` (NASCAR's own JSON feed, undocumented but
reliable and structured — same endpoint family throughout):

| File | Purpose | Series-generic? |
|---|---|---|
| `api/standings.js` | Live points standings | Yes (`series` param) |
| `api/schedule.js` | Schedule + done/next logic (ET-anchored, see below) | Yes |
| `api/entrylist.js` | Confirmed entry list per race | Yes |
| `api/results.js` | Official post-race results + real qualifying (weekend_runs run_type 2) | Yes |
| `api/recentform.js` | Real last-5 finishes per driver (last 5 completed races) | Yes |
| `api/tracktrends.js` | Real per-track driver history, 2023-2026, via `track_id` | Yes |
| `api/trackhistory.js` | **Legacy** — racing-reference.info HTML scraper. Left in place per original instruction not to modify it, but the frontend no longer calls it (superseded by `tracktrends.js`). |  |
| `api/scorecard.js` | Read-only view into the prediction scorecard (Upstash Redis, read-only token) | Yes |
| `api/cron/snapshot.js` | Scheduled job (see `vercel.json`) — generates pre-race prediction snapshots and grades completed races against real results | Yes |

## Prediction scorecard (in progress)

Answers "how close were our predictions to reality" — not a single pre-race snapshot,
but three, so we can tell whether more information actually improves accuracy:
- **post_race** (Monday, day after previous race): momentum-only, roster unconfirmed
- **lineups** (Wednesday): confirmed entry list
- **post_quali** (Saturday): real qualifying positions

`lib/sim.js` holds the simulation engine (`runSim`, `genChart`, `TRACK_HISTORY`,
`DRIVER_MANUFACTURERS`, scoring helpers) extracted out of `App.jsx` so both the browser
and the cron job import the exact same code — previously the sim only existed in
browser React state, so there was no way to generate a prediction independent of a user
loading the page.

Storage is Upstash Redis (user's existing preference, connected via Vercel's Marketplace
integration under the custom prefix `UPSTASH_REDIS_REST`, which surfaces the legacy
Vercel KV variable names). `lib/redis.js` exposes two clients: `redisWrite` (full access,
cron job only) and `redisRead` (read-only token, used by `api/scorecard.js` so that
endpoint can never write). Key scheme: `finallap:pred:{series}:{raceId}:{stage}`,
`finallap:grade:{series}:{raceId}`, `finallap:index:{series}` (sorted set of race IDs by
date). Scoring: winner-hit, top-5-hit, and a Brier score computed over the stored top-10
subset (drivers outside top 10 treated as ~0 predicted probability).

**Required env vars** (Vercel project settings): `UPSTASH_REDIS_REST_KV_REST_API_URL`,
`UPSTASH_REDIS_REST_KV_REST_API_TOKEN`, `UPSTASH_REDIS_REST_KV_REST_API_READ_ONLY_TOKEN`
(all auto-added by the Upstash integration), plus `CRON_SECRET` (a random string you
generate yourself — Vercel automatically sends it as `Authorization: Bearer $CRON_SECRET`
on cron-triggered requests; add it manually, nothing auto-generates this one).

**Not yet done / known gaps:**
- Manufacturer lookup (`DRIVER_MANUFACTURERS` in `lib/sim.js`) is Cup-only; Xfinity/Truck
  cron-generated predictions get 0 manufacturer bonus until extended.
- Rookie/sub/part-time flags aren't available from live standings, so cron predictions
  don't apply the -3/-2 penalties the browser's FALLBACK_DRIVERS-seeded predictions do.
- End-to-end (real cron trigger -> real Redis write -> real grade) has not been tested
  against a live deployment — only the pure logic (stage detection, Brier scoring) has
  been verified locally. First real run will be the first true test.
- Frontend Scorecard tab (`ScorecardView` in `App.jsx`, toggled via the header button)
  will show "no graded races yet" until the cron job has run at least once after a race
  completes and been graded on a subsequent run.

`STATIC_SCHEDULES`/`FALLBACK_DRIVERS` in `App.jsx` and `SCHEDULE_BASE`/`STATIC_RATINGS` in
`api/standings.js` + `api/schedule.js` are the offline fallback baseline, used only when
live fetches fail. They were fully realigned to the real 2026 season as of 2026-07-19/20 —
see changelog below for what that involved.

## Known gotchas (already fixed, don't reintroduce)

- **Done/next date boundary must be anchored to America/New_York**, not raw UTC.
  `new Date().toISOString()` rolls to the next calendar day at 8pm ET / 5pm PT, which
  will mark the current day's race "done" with no winner hours before it actually runs.
  Both `computeSchedule()` (App.jsx) and `api/schedule.js` use an `Intl.DateTimeFormat`
  `America/New_York` anchor for this — keep them identical.
- Driver name spelling must be byte-identical everywhere it's used as an object key
  (`STATIC_DRIVER_RATINGS`, `TRACK_HISTORY`, `FALLBACK_DRIVERS`) — e.g. "Daniel Suárez"
  (accented) vs "Daniel Suarez" silently breaks lookups. One such mismatch caused his
  track history to never apply; already fixed, watch for it when adding new drivers.
- Race IDs must stay unique across cup/xfin/truck combined (79 total as of this writing)
  — verify with a quick regex count before committing schedule changes.
- Vercel edge-caches `api/schedule.js` (1hr) and `api/standings.js` (6hr) — after deploying
  a data fix, the live site can still serve stale cached responses for up to that long.
  Not a bug, just don't panic-debug it as one.

## Simulation engine

`runSim()` in `App.jsx` computes a composite score: Track History 30% / Momentum+Win Rate
20% / Chaos Avoidance 20% / Skill+Qual Speed 15% / Pit-Aero 15%, plus additive bonuses for
manufacturer (by track type) and qualifying position. Recent form (last5) feeds into the
momentum component via an exponential-decay multiplier. DNF probability per iteration:
`chaosLevel * (1 - chaosAvoid/10) * 0.18`, independent of the composite score.

**Honest limitation**: `skill`, `aero`, and `chaosAvoid` in `STATIC_DRIVER_RATINGS` are
hand-typed scout-judgment numbers, not measured data. There is no public data source for
things like brake technique, handling setup, or drafting skill in isolation — this is a
real ceiling on the model's inputs, not a bug to fix. See prediction-accuracy discussion
below for what's realistically improvable vs. permanently subjective.

## Backups

Per `Claude/claude_rules.md` Rules 1 & 8: before editing any tracked file, a timestamped
backup goes to `Claude/archive/` (untracked, never committed). See that folder's README.

## Changelog

**2026-07-19/20 — Full data realignment + Phase 3/4 enhancements + live feed engine**
- Audited and fixed all confirmed bugs from the original audit prompt (wrong next-race
  logic, wrong winners, track history keyed by geometry not track, scout-notes
  ReferenceError, duplicate race IDs, `[W]` placeholder, non-ASCII build breaks).
- Discovered and fixed a much bigger issue: the schedule's back half (from Martinsville
  onward) was a fictional alternate-universe season — wrong tracks, dates, and winners
  vs. the real 2026 NASCAR season. Fully rebuilt Cup/Xfinity/Truck schedules against
  verified real results through the current date, including tracks the app never had
  (Kansas, Texas, Watkins Glen, Coronado St. Course).
- Rewrote the composite scoring formula to actually implement the documented 30/20/20/15/15
  weighting (it previously didn't match either its own on-screen legend or the spec).
  Implemented all of Phase 4: recent-form/HOT badge, manufacturer bonuses, qualifying
  position modifier, live-data-fallback banner, in-race caution/restart/fuel chart
  events, entry-list cross-referencing.
- Found and fixed a real production bug: done/next date logic used raw UTC, which
  incorrectly marked the current day's race "done" with no winner during US evening
  hours (confirmed live via curl against the deployed API).
- Built `api/results.js` — live official post-race results + qualifying, sourced from
  NASCAR's own feed, replacing hand-maintained winner strings.
- Root-caused a real prediction miss (Joey Logano won at North Wilkesboro, wasn't in our
  top 5) to three compounding data gaps: stale momentum, hand-fabricated (fictional)
  recent-form data, and a missing track-history entry for that driver at that track.
  Built `api/recentform.js` and `api/tracktrends.js` to source both from live data
  instead — verified against real results (e.g., Logano's real North Wilkesboro history
  was 10-1-2 across the last three races there, a signal the static table never had).
- In progress: a prediction-accuracy scorecard (save pre-race sim snapshots at three
  stages — post-previous-race, lineups-confirmed, post-qualifying — grade them against
  final results once official). Storage: Upstash Redis (user's existing preference).
  Needs: shared sim module extraction (currently browser-only), a Vercel Cron job,
  `api/scorecard.js` read endpoint. Blocked on confirming whether to use a new or
  existing Upstash instance.

**2026-07-20 (cont'd) — Built the prediction scorecard**
- User created a new dedicated Upstash Redis database via Vercel's Marketplace
  integration (custom env var prefix `UPSTASH_REDIS_REST`).
- Extracted the full simulation engine out of `App.jsx` into `lib/sim.js` (verified
  byte-faithful against the original via difflib, except two genuinely orphaned
  TRACK_HISTORY entries — `richmond2`/`nwilkes2` — dropped as dead code, confirmed via
  grep that no race ID references either anymore).
- Built `lib/redis.js`, `api/cron/snapshot.js` (generates snapshots + grades completed
  races, 3x/week via `vercel.json`), and `api/scorecard.js` (read-only view).
- Added a Scorecard toggle to the header and a `ScorecardView` component to `App.jsx`.
- Pure logic (stage detection, Brier scoring) verified locally with Node; full
  end-to-end has not been exercised against a live deployment yet.

---

Claude User Rules (Portable — Copy This Whole Section Into Any Project's CLAUDE.md)
Everything in this section is how this user wants Claude Code to behave in any project, any session. Copy the section verbatim (between the two === PORTABLE RULES markers) into a new project's CLAUDE.md to get the same behavior there — nothing inside it needs editing except file paths where noted.

=== PORTABLE RULES START ===

1. File update protocol — required for every edit to any tracked file
Never edit a file in place without a real backup first.

Backup by rename, not copy-then-edit. Rename the original to filename_BKUP_YYMMDD_HHMM.ext (24-hour local time). Then recreate a fresh file at the original path by copying the backup back to the original filename. The backup's Created/Modified timestamps are then the real, untouched original dates — proof nothing in it changed.
Reset the new file's Created timestamp. On Windows/NTFS/OneDrive, a plain copy does not reset the destination's Created time — it carries the source's original Created date forward and only updates Modified. Explicitly set it via PowerShell right after the rename+copy, before making the real edit:
(Get-Item "path\to\file").CreationTime = Get-Date
(Bash/cp cannot do this — Created time isn't a POSIX-settable attribute. This step is PowerShell-only.)
Make the actual intended edit to the file now at the original path. Its Modified timestamp updates naturally — no manual step needed for that.
Audit immediately after. Compare the backup (the renamed original) against the updated file:
Zero lines removed from the original, unless the edit intentionally removes something
Hash/diff-verify (not naive line-by-line diff — use something like Python difflib opcodes for large files, since blunt diff tools produce false positives) that all content outside the edited region is byte-identical before and after
Spot-check the specific changed values/lines are correct
Report in this format after every audit:
Lines removed from original:  0  ✓
Lines added:                  [n]
Before-insertion hash match:  IDENTICAL ✓
After-insertion hash match:   IDENTICAL ✓
Changed values verified:      [list key lines/values checked]
Backups stay in the same folder as the source file, unless the project has a dedicated archive folder per Rule 8 — in that case route backups there instead so repo/project folders stay clean. Never delete them.
2. Session resume code — stamp at the bottom of CLAUDE.md on every update
Whenever CLAUDE.md is updated, for any reason (not just session-related edits), stamp/replace a footer at the very bottom of the file:

---
## Session Resume
claude --resume <session-id>
(stamped <YYYY-MM-DD HH:MM local>)
Find the session ID by listing the project's session-transcript folder — ~/.claude/projects/<project-folder-name>/ (Windows: C:\Users\<user>\.claude\projects\<project-folder-name>\) — and taking the most-recently-modified *.jsonl file's name (minus the .jsonl extension). That always matches the currently active session. Don't ask the user for it — look it up directly. Reason: if the app or PC crashes mid-session, this is the only reliable way to recover the exact resume command, and CLAUDE.md is the one file guaranteed to be read at the start of the next session regardless of what happened to the old one.

3. Response style
Short and direct. No trailing "here's what I just did" summaries unless asked for one.
When referencing code, always cite file:line_number.
No emojis unless explicitly requested.
If something critical is unknown or ambiguous, ask one direct clarifying question instead of hedging with caveats or making a silent assumption.
4. Command/push output format
When asked to provide a command (git push, deploy, migration, etc.), give the exact, minimal command block only — no caveats, no "you could also do X instead," no alternate options unless asked. If paths are relative to a specific subfolder (e.g. a repo root that isn't the top-level project folder), state that convention once in the project's own CLAUDE.md section rather than repeating it in every response.

5. Workspace vs. live/deployed copy
If a project has a "workspace" copy (safe to experiment on) separate from a live/deployed copy, always be explicit in responses about which one is being read or edited. Never assume the workspace copy is what's actually running in production — treat that as a per-project fact to confirm, not a default.

6. Destructive actions
Never run destructive operations (force-push, reset --hard, deleting backups, dropping data, overwriting uncommitted work) without explicit confirmation for that specific instance. A prior approval for one destructive action does not carry forward to future, similar-looking asks — confirm every time.

7. Analysis/scratch scripts
One-off analysis or investigation scripts (Python, PowerShell, etc.) used to validate a claim or compute a number for a report are not project deliverables — don't commit them to the repo unless asked. On Windows, wrap stdout with UTF-8 encoding (io.TextIOWrapper(..., encoding='utf-8', errors='replace') in Python) to avoid cp1252 crashes on emoji/special characters in data.

8. Backup archive location for projects with a repo/working folder
Don't drop Rule 1's _BKUP_ files next to the source file if the project has a git repo or other tracked folder structure — that clutters `git status` and the project tree. Instead route backups to a dedicated, untracked archive subfolder (e.g. <project>/Claude/archive/ if the project already has a Claude/ working-notes folder; otherwise agree one with the user once per project). Confirm the archive path the first time a project needs one, then reuse it for every subsequent backup in that project without re-asking.

The first time a project gets an archive folder, drop a short README.md inside it explaining what it's for (backups per Rules 1 & 8, point-in-time, never edit/delete) so it's self-documenting without relying on this rules file being nearby.

=== PORTABLE RULES END ===

---
## Session Resume
claude --resume f7211d5c-8e07-47ae-88c9-df679e52025f
(stamped 2026-07-20 23:23 local)
