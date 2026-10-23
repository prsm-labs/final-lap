// Freezes each NASCAR race's Pairs (src/lib/pairs.js, every mode except 🔀 + each finish on Balanced) into
// public/data/pairs/<series>/<race_id>.json once the race has started -- built from the frozen pre-green snapshot
// (public/data/races/<series>/<race_id>.json), so the board is the one the Race Card showed. Never re-locks (--force does).
// Also builds the 2026 replay boards from output/replay_cards.json (written by build_track_record.py from the walk-forward
// replay) into output/pairs_replay.json -- labelled replay in Track Record, never passed off as live.
//   node app/scripts/lock_pairs.mjs [--force]
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildPairs, LEGS, LEVEL_KEYS, MODE_KEYS, pairRecord } from '../src/lib/pairs.js'

const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const force = process.argv.includes('--force')
const SERIES = ['cup', 'oreilly', 'truck']
// race start times are US Eastern wall clock (lib/data.js etDate); a few hours of slack is fine for "has it started"
const startMs = (iso) => Date.parse(`${iso.slice(0, 19)}-05:00`) - 3600000
const boards = (card) => {
  const b = {}
  for (const mode of MODE_KEYS.filter((m) => m !== 'across')) b[mode] = buildPairs(card, { mode }).map(pairRecord)
  for (const leg of Object.keys(LEGS)) b[`balanced:${leg}`] = buildPairs(card, { mode: 'balanced', leg }).map(pairRecord)
  // 2026-10-23 levels: safe / mid-range / long-shot boards for every mode (plain mode keys stay the original "all" board)
  for (const level of LEVEL_KEYS.filter((l) => l !== 'all')) for (const mode of MODE_KEYS.filter((m) => m !== 'across')) b[`${level}:${mode}`] = buildPairs(card, { mode, level }).map(pairRecord)
  return b
}
let n = 0
for (const s of SERIES) {
  const dir = path.join(app, 'public/data/races', s)
  if (!fs.existsSync(dir)) continue
  const out = path.join(app, 'public/data/pairs', s)
  fs.mkdirSync(out, { recursive: true })
  for (const f of fs.readdirSync(dir).filter((x) => /^\d+\.json$/.test(x))) {
    const dest = path.join(out, f)
    if (fs.existsSync(dest) && !force) continue
    const card = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))
    if (!card.race?.start || Date.now() < startMs(card.race.start)) continue
    fs.writeFileSync(dest, JSON.stringify({ series: s, race_id: card.race.race_id, date: card.race.date, track: card.race.track, lockedAt: new Date().toISOString(), snapshotAt: card.snapshotAt ?? null, preGreen: card.preGreen ?? null, boards: boards(card) }))
    n += 1
    console.log(`Locked Pairs ${s} ${card.race.race_id} (${card.race.track})`)
  }
}
const rp = path.resolve(app, '../output/replay_cards.json')
if (fs.existsSync(rp)) {
  const cards = JSON.parse(fs.readFileSync(rp, 'utf8'))
  const outR = cards.map((c) => ({ series: c.series, race_id: c.race.race_id, date: c.race.date, boards: boards(c) }))
  fs.writeFileSync(path.resolve(app, '../output/pairs_replay.json'), JSON.stringify(outR))
  console.log(`Replay Pairs: ${outR.length} races`)
}
console.log(n ? `${n} race(s) locked.` : 'No new races to lock.')
