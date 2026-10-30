// build_race_sims.mjs -- Final Lap 🎬 Race Sim (2026-10-30, user: "Even final lap could benefit from a race sim.. one that adjusts to
// starting lineups as well"). Run from final-lap-2 after build_races.py / f1_build.py:  node app/scripts/build_race_sims.mjs
// For each series' next race (Cup / O'Reilly / Truck / F1): the field from next.json (the model's chances), the official starting
// lineup once qualifying has set it (before that a simulated qualifying from pace each race), the track's stage lengths, caution
// rate, caution length, DNF rates and lead changes from race_sim_params.json (build_race_sim_params.py). Short calibration passes
// tune each driver's pace until his average finish over the sims matches the model, the day-to-day spread until the favorites'
// win chances match, and the passing rate until lead changes match the track's history. 15,000 races are then run
// (src/sim/raceSim.js); the most typical one is replayed lap by lap with in-race win chances (200 races from each checkpoint).
// Writes public/data/racesim/<series>.json + racesim/index.json. A race that has gone green keeps its pre-race file.
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { rng, simulateRace, runMany } from '../src/sim/raceSim.js'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const DATA = path.resolve(HERE, '../public/data')
const OUTDIR = process.env.SIM_OUT || path.join(DATA, 'racesim')
const N = 15000
const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'))
const P = read(path.join(DATA, 'race_sim_params.json'))
fs.mkdirSync(OUTDIR, { recursive: true })

// next.json start times are Eastern wall time
function etToUtc(s) {
  const guess = Date.parse(s + 'Z')
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(guess))
  const g = Object.fromEntries(parts.map((p) => [p.type, p.value]))
  const asEt = Date.parse(`${g.year}-${g.month}-${g.day}T${g.hour}:${g.minute}:00Z`)
  return guess + (guess - asEt)
}
const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const hash = (s) => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0) % 1000000 }
const r3 = (v) => Math.round(v * 1000) / 1000
const r1 = (v) => Math.round(v * 10) / 10
const gaussN = (r) => { let u = 0; while (u === 0) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()) }

function params(key, race, field) {
  if (key === 'f1') {
    const c = Object.values(P.f1.circuits).find((x) => fold(x.name) === fold(race.track))
    const s = P.f1.series
    const laps = race.laps || c?.laps || 58
    const sc = 0.6 // safety cars per race (assumed: Jolpica has no safety-car data)
    const acc = (c && c.n >= 3 ? c.acc_dnf : s.acc_dnf) || 0.5, mech = (c && c.n >= 3 ? c.mech_dnf : s.mech_dnf) || 2
    return { src: c ? `${race.track}, ${c.n} races` : 'F1 average', laps, stages: [laps], cautionRate: sc / laps, cautionLen: 4,
      accOut: Math.min(0.7, acc / (sc * 1.8)), mechPerLap: Math.max(0, mech - acc * 0) / field / laps, f1: true, pitLap: [Math.round(laps * 0.3), Math.round(laps * 0.62)],
      pitLoss: 2, pitSigma: 0.8, restartMult: 1.6, passBase: 0.035, hist: { cautions: null, leadChanges: null, dnfs: acc + mech } }
  }
  const S = P.nascar[key]
  const t = Object.values(S.tracks).find((x) => fold(x.track) === fold(race.track))
  const ty = S.types[race.ttype] || S.series
  const use = t && t.n >= 3 ? t : ty
  const laps = race.laps || t?.laps || 200
  const stages = t?.stages?.length && t.stages.reduce((a, b) => a + b, 0) === laps ? t.stages : [Math.round(laps * 0.25), Math.round(laps * 0.25), laps - 2 * Math.round(laps * 0.25)]
  const cautions = use.cautions ?? 5
  const cLen = use.caution_laps ?? 6
  // the hazard applies to green laps only: take out the laps run under the random cautions and the stage breaks
  const greenLaps = Math.max(laps * 0.4, laps - (cautions + stages.length - 1) * cLen)
  return { src: t && t.n >= 3 ? `${race.track}, ${t.n} races` : `${race.type || race.ttype} average`, laps, stages, cautionRate: cautions / greenLaps,
    cautionLen: cLen, accOut: Math.min(0.75, Math.max(0.15, (use.acc_dnf ?? 4) / Math.max(1, cautions * 1.8))),
    mechPerLap: (use.mech_dnf ?? 1.5) / field / laps, f1: false, pitSigma: 2.2, restartMult: 2.2, passBase: 0.06,
    hist: { cautions, leadChanges: use.lead_changes, dnfs: (use.acc_dnf ?? 0) + (use.mech_dnf ?? 0) } }
}

function calibrate(R, drv, tgtLc) {
  const tgtH = drv.reduce((a, d) => a + d.win * d.win, 0)
  for (let it = 0; it < 16; it++) {
    const res = runMany(R, 1500, 900 + it * 31, false)
    // each driver's top-10 chance (the model's calibrated number) sets his pace; the win spread is set by the day-to-day draw
    const lg = (p) => Math.log(Math.min(0.995, Math.max(0.005, p)) / (1 - Math.min(0.995, Math.max(0.005, p))))
    drv.forEach((d, i) => { R.pace[i] += 0.2 * (lg(d.top10) - lg(res.top10[i])) + 0.08 * (lg(d.top5) - lg(res.top5[i])) })
    const simH = res.win.reduce((a, w) => a + w * w, 0)
    R.daySd = Math.max(0.05, Math.min(3, R.daySd * Math.pow(simH / tgtH, 0.6)))
    if (tgtLc && res.leadChanges > 0) R.passBase = Math.max(0.004, Math.min(0.4, R.passBase * Math.pow(tgtLc / res.leadChanges, 0.7)))
  }
}

const SERIES = [['cup', 'Cup'], ['oreilly', "O'Reilly"], ['truck', 'Truck'], ['f1', 'F1']]
const now = Date.now()
const index = []
for (const [key, label] of SERIES) {
  const nf = path.join(DATA, key, 'next.json')
  if (!fs.existsSync(nf)) continue
  const card = read(nf)
  const race = card.race
  const file = path.join(OUTDIR, `${key}.json`)
  if (!race || !card.drivers?.length) continue
  const green = etToUtc(race.start)
  if (now >= green) {
    if (fs.existsSync(file)) {
      const old = read(file)
      if (old.race?.race_id === race.race_id) {
        if (!old.frozen) { old.frozen = true; fs.writeFileSync(file, JSON.stringify(old)) }
        index.push(old.indexRow)
      }
    }
    continue
  }
  const drv = card.drivers.map((d) => ({ id: d.driver_id, name: d.name, car: d.car, team: d.team, make: d.make, start: d.start,
    win: d.win, top5: d.top5, top10: d.top10, avg: d.avg }))
  const n = drv.length
  const pr = params(key, race, n)
  const hasGrid = card.stage === 'post' && drv.filter((d) => d.start).length >= n * 0.8
  const grid = hasGrid ? [...drv.keys()].sort((a, b) => (drv[a].start || 99) - (drv[b].start || 99)) : null
  const mAvg = drv.reduce((a, d) => a + d.avg, 0) / n
  const R = { n, pace: drv.map((d) => (mAvg - d.avg) / 8), grid, daySd: 0.6, ...pr }
  calibrate(R, drv, pr.hist.leadChanges)
  const res = runMany(R, N, hash(`${key}${race.race_id}`))
  // the typical race, lap by lap, with win chances from checkpoints
  const tr = simulateRace(R, rng(res.typicalSeed), true)
  const snapLaps = Object.keys(tr.ev.snaps || {}).map(Number).sort((a, b) => a - b)
  const want = Math.min(70, snapLaps.length)
  const pick = [...new Set([...Array(want).keys()].map((i) => snapLaps[Math.round(i * (snapLaps.length - 1) / Math.max(1, want - 1))]))]
  const wp = {}
  {
    const base = runMany(R, 600, 77, false).win
    wp[0] = base.map(r3)
  }
  // the race so far only partly shows how good each car is today: continuations keep a share of the car's hidden draw that grows
  // with the laps run (35% at the green flag -> 95% at the end) and redraw the rest
  for (const lap of pick) {
    const st = tr.ev.snaps[lap]
    const w = new Array(n).fill(0)
    const K = 200
    const rho = Math.min(0.95, 0.35 + 0.6 * lap / R.laps)
    for (let s = 0; s < K; s++) {
      const r = rng(lap * 1000 + s)
      const day = st.day.map((e, i) => R.pace[i] + rho * (e - R.pace[i]) + Math.sqrt(1 - rho * rho) * R.daySd * gaussN(r))
      w[simulateRace(R, r, false, { ...st, day }).finish[0]]++
    }
    wp[lap] = w.map((v) => r3(v / K))
  }
  wp[R.laps] = new Array(n).fill(0).map((_, i) => (i === tr.finish[0] ? 1 : 0))
  // frames: every few laps + every event
  const step = Math.max(1, Math.round(R.laps / 110))
  const nm = (i) => `#${drv[i].car} ${drv[i].name.split(' ').slice(-1)[0]}`
  const frames = []
  let prevFlag = 'G', stageNo = 0
  for (const e of tr.ev) {
    let text = null, kind = null
    if (e.kind === 'caution') {
      const { inv = [], gone = [] } = e.text || {}
      text = R.f1 ? `Safety car: ${inv.map(nm).join(', ')} ${gone.length ? `-- ${gone.map(nm).join(', ')} out` : 'off, back in the race'}`
        : `Caution: ${inv.length > 1 ? 'wreck' : 'spin'} -- ${inv.map(nm).join(', ')}${gone.length ? `; ${gone.map(nm).join(', ')} out` : ''}`
      kind = 'caution'
    } else if (e.stage) {
      stageNo++
      text = `End of Stage ${stageNo}: ${nm(e.stage[0])} wins it`
      kind = 'stage'
    } else if (prevFlag === 'Y' && e.flag === 'G') {
      text = `Green flag -- ${nm(e.order[0])} leads the restart`
      kind = 'restart'
    } else if (e.newLeader && e.lap > 1) {
      text = `${nm(e.order[0])} takes the lead`
      kind = 'lead'
    }
    if (e.text?.mech) { text = `${text ? text + ' · ' : ''}${e.text.mech.map(nm).join(', ')} out (mechanical)`; kind ||= 'out' }
    if (e.lap === R.laps) { text = `🏁 ${nm(e.order[0])} wins!`; kind = 'finish' }
    if (kind || e.lap % step === 0 || e.lap === 1) {
      const w = Math.max(...Object.keys(wp).map(Number).filter((l) => l <= e.lap))
      frames.push({ l: e.lap, f: e.lap === R.laps ? 'C' : e.flag, o: e.order, x: e.out, t: text, k: kind, w })
    }
    prevFlag = e.flag
  }
  const drivers = drv.map((d, i) => ({ ...d, sim: { win: r3(res.win[i]), top3: r3(res.top3[i]), top5: r3(res.top5[i]), top10: r3(res.top10[i]),
    avg: r1(res.avg[i]), led: r1(res.led[i]), dnf: r3(res.dnf[i]), stageWin: r3(res.stageWin[i]) } }))
  const indexRow = { series: key, label, race_id: race.race_id, name: race.name, track: race.track, start: race.start, grid: !!grid,
    winner: drv[tr.finish[0]].name }
  const out = {
    series: key, label, race, generated_at: new Date().toISOString(), n: N, frozen: false, indexRow, stage: card.stage, grid: !!grid,
    params: { src: pr.src, laps: R.laps, stages: R.stages, cautionsPerRace: r1(pr.cautionRate * R.laps), passBase: r3(R.passBase), daySd: r3(R.daySd) },
    summary: { cautions: r1(res.cautions), leadChanges: r1(res.leadChanges), dnfs: r1(res.dnfs), hist: pr.hist },
    drivers,
    typical: { index: res.typicalIndex, finish: tr.finish, led: tr.led, leadChanges: tr.leadChanges, cautions: tr.cautions, stageRes: tr.stageRes,
      outWhy: tr.outWhy, outLap: tr.out, frames, wp },
  }
  fs.writeFileSync(file, JSON.stringify(out))
  index.push(indexRow)
  const top = drivers.slice().sort((a, b) => b.win - a.win).slice(0, 3).map((d) => `${d.name.split(' ').slice(-1)[0]} win ${Math.round(100 * d.sim.win)}/${Math.round(100 * d.win)} t10 ${Math.round(100 * d.sim.top10)}/${Math.round(100 * d.top10)}`).join(', ')
  const err = (k) => r3(drivers.reduce((a, d) => a + Math.abs(d.sim[k] - d[k]), 0) / n)
  console.log(`  mean |sim - model|: win ${err('win')}, top5 ${err('top5')}, top10 ${err('top10')}`)
  console.log(`${label} ${race.name} @ ${race.track}: ${grid ? 'official grid' : 'simulated qualifying'}, ${R.laps} laps, cautions ${r1(res.cautions)} (hist ${pr.hist.cautions == null ? '-' : r1(pr.hist.cautions)}), lead changes ${r1(res.leadChanges)} (hist ${pr.hist.leadChanges == null ? '-' : r1(pr.hist.leadChanges)}), DNFs ${r1(res.dnfs)} (hist ${r1(pr.hist.dnfs)}) | sim/model ${top} | typical: ${drv[tr.finish[0]].name} (${frames.length} frames)`)
}
fs.writeFileSync(path.join(OUTDIR, 'index.json'), JSON.stringify({ generated_at: new Date().toISOString(), races: index }))
console.log(`race sims: ${index.length}`)
