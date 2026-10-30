// raceSim.js -- Final Lap 🎬 Race Sim engine (2026-10-30, user: a RotoBot-style race sim that adjusts to the starting lineup).
// Shared by the build script (Node) and nothing else in the page (the page only plays the saved typical race).
// One race, lap by lap:
//   - start from the grid (the official starting lineup once posted; before qualifying a simulated qualifying session from pace)
//   - every driver gets a "car today" draw around his pace (how good the car is that day -- the main source of upsets)
//   - each green lap, each car can pass the one ahead: chance = passBase x 2 x logistic(k x pace gap), higher on restarts
//   - random cautions (NASCAR: accidents / spins / debris; F1: safety cars) at the track's historical rate: 1-4 cars
//     around a running spot (more often back in traffic) are involved (some out, the rest damaged, 3-12 spots lost)
//   - NASCAR stage breaks at the track's stage laps (stage top 10 recorded) with a caution; F1 one pit stop per car
//   - pit stops under caution shuffle the order a little (pit crews / strategy), mechanical failures at the series' rate
//   - finish: running cars in order, then retired cars (later out = better)
// The page's chances stay the model's (the official numbers); the build tunes each driver's pace so his average finish over
// the sims matches the model, the day-to-day spread so the favorites' win chances match, and passBase so lead changes match
// the track's history.

export function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const gauss = (r) => { let u = 0; while (u === 0) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()) }

// R: { n, pace[], grid (driver indices in starting order) | null, laps, stages [lap counts], cautionRate (per green lap),
//      cautionLen, passBase, restartMult, pitSigma, daySd, accOut (chance an involved car retires), mechPerLap, f1, pitLap [lo, hi] }
export function simulateRace(R, r, log = false, state = null) {
  const n = R.n
  const eff = state ? state.day.slice() : R.pace.map((p) => p + R.daySd * gauss(r))
  let order
  if (state) order = state.order.slice()
  else if (R.grid) order = R.grid.slice()
  else order = [...Array(n).keys()].map((i) => [i, R.pace[i] + 0.6 * gauss(r)]).sort((a, b) => b[1] - a[1]).map((x) => x[0])
  const out = state ? state.out.slice() : new Array(n).fill(0)   // 0 = running, else the lap he retired on
  const outWhy = state ? state.outWhy.slice() : new Array(n).fill('')
  const led = state ? state.led.slice() : new Array(n).fill(0)
  const pitted = state ? state.pitted.slice() : new Array(n).fill(0)
  let caution = state ? state.caution : 0
  let restart = false
  let leadChanges = state ? state.leadChanges : 0
  let cautions = state ? state.cautions : 0
  let leader = order[0]
  const stageEnds = []
  { let acc = 0; for (const s of R.stages.slice(0, -1)) { acc += s; stageEnds.push(acc) } }
  const stageRes = state ? state.stageRes.slice() : []
  const ev = log ? [] : null
  const k = 2.2
  const startLap = state ? state.lap + 1 : 1
  const running = () => order.filter((i) => !out[i])

  const snapshot = (lap) => ({ lap, day: eff.slice(), order: order.slice(), out: out.slice(), outWhy: outWhy.slice(), led: led.slice(), pitted: pitted.slice(),
    caution, leadChanges, cautions, stageRes: stageRes.slice() })

  for (let lap = startLap; lap <= R.laps; lap++) {
    let text = null, kind = 'green'
    if (caution > 0) {
      caution--
      kind = 'yellow'
      if (caution === 0) restart = true
    } else {
      // random caution
      if (r() < R.cautionRate && lap < R.laps - 1) {
        const run = running()
        // incidents happen more often back in traffic than up front
        const at = Math.min(run.length - 1, Math.floor(Math.pow(r(), 0.55) * run.length))
        let m = 1
        while (m < 4 && r() < 0.45) m++
        const inv = run.slice(at, at + m)
        const gone = []
        for (const i of inv) {
          if (r() < R.accOut) { out[i] = lap; outWhy[i] = 'accident'; gone.push(i) }
          else { eff[i] -= 0.1 + 0.3 * r() }
        }
        // involved cars that keep going lose 3-12 spots (pit for repairs)
        for (const i of inv.filter((x) => !out[x])) {
          const p = order.indexOf(i)
          order.splice(p, 1)
          order.splice(Math.min(order.length, p + 3 + Math.floor(r() * 10)), 0, i)
        }
        caution = Math.max(2, Math.round(R.cautionLen + gauss(r) * 1.5))
        cautions++
        kind = 'caution'
        if (log) text = { inv, gone }
        // pit stops under the caution: a small shuffle among the running cars
        pitShuffle(order, out, R.pitSigma, r)
        if (R.f1) for (const i of order) if (!out[i] && !pitted[i] && lap > R.laps * 0.2) pitted[i] = 1
      } else {
        // green-flag passing, back to front
        const mult = restart ? R.restartMult : 1
        for (let p = order.length - 1; p > 0; p--) {
          const a = order[p - 1], b = order[p]
          if (out[a] || out[b]) continue
          const d = eff[b] - eff[a]
          const pr = Math.min(0.92, R.passBase * mult * 2 / (1 + Math.exp(-k * d)))
          if (r() < pr) { order[p - 1] = b; order[p] = a }
        }
        restart = false
      }
    }
    // F1: everyone stops once in the window (cars that stopped under a safety car already have)
    if (R.f1 && caution === 0) {
      for (const i of order) {
        if (out[i] || pitted[i]) continue
        if (lap >= R.pitLap[0] && (lap >= R.pitLap[1] || r() < 1 / Math.max(1, R.pitLap[1] - lap))) {
          pitted[i] = 1
          const p = order.indexOf(i)
          const loss = Math.max(0, Math.round(R.pitLoss + gauss(r) * 1.2))
          order.splice(p, 1)
          order.splice(Math.min(order.length, p + loss), 0, i)
          if (log && p < 3) (ev.pits ||= []).push([lap, i])
        }
      }
    }
    // mechanical failures
    for (const i of order) if (!out[i] && r() < R.mechPerLap) { out[i] = lap; outWhy[i] = 'mechanical'; if (log) (text ||= {}).mech = [...(text?.mech || []), i] }
    // keep retired cars at the end of the order
    order = [...order.filter((i) => !out[i]), ...order.filter((i) => out[i]).sort((a, b) => out[b] - out[a])]
    const lead = order[0]
    led[lead]++
    if (lead !== leader && caution === 0) leadChanges++
    const newLeader = lead !== leader
    leader = lead
    // stage break
    let stage = null
    if (stageEnds.includes(lap)) {
      stage = order.filter((i) => !out[i]).slice(0, 10)
      stageRes.push(stage)
      caution = Math.max(caution, Math.max(3, Math.round(R.cautionLen)))
      pitShuffle(order, out, R.pitSigma, r)
    }
    if (log) ev.push({ lap, kind, text, stage, newLeader, order: order.slice(), out: out.filter(Boolean).length, flag: caution > 0 ? 'Y' : 'G' })
    if (log && (lap % 10 === 0 || stage || kind === 'caution' || restart)) (ev.snaps ||= {})[lap] = snapshot(lap)
  }
  const finish = order // running in order, then retired (latest out first)
  return { finish, led, leadChanges, cautions, stageRes, out, outWhy, ev }
}

function pitShuffle(order, out, sd, r) {
  if (sd <= 0) return
  const run = order.filter((i) => !out[i]).map((i, p) => [i, p + sd * gaussR(r)]).sort((a, b) => a[1] - b[1]).map((x) => x[0])
  let j = 0
  for (let p = 0; p < order.length; p++) if (!out[order[p]]) order[p] = run[j++]
}
const gaussR = (r) => gauss(r)

// N races -> per driver: win / top 3 / top 5 / top 10 shares, average finish, laps led, DNF; race-level averages; the typical race.
export function runMany(R, N, seed0, wantTypical = true) {
  const n = R.n
  const pos = new Float64Array(n), win = new Float64Array(n), t3 = new Float64Array(n), t5 = new Float64Array(n), t10 = new Float64Array(n)
  const led = new Float64Array(n), dnf = new Float64Array(n), stageW = new Float64Array(n)
  let lc = 0, ca = 0, outs = 0
  const keep = wantTypical ? [] : null
  for (let s = 0; s < N; s++) {
    const r = rng(seed0 + s * 7919)
    const res = simulateRace(R, r)
    res.finish.forEach((i, p) => {
      pos[i] += p + 1
      if (p === 0) win[i]++
      if (p < 3) t3[i]++
      if (p < 5) t5[i]++
      if (p < 10) t10[i]++
    })
    for (let i = 0; i < n; i++) { led[i] += res.led[i]; if (res.out[i]) { dnf[i]++; outs++ } }
    for (const st of res.stageRes) if (st[0] != null) stageW[st[0]]++
    lc += res.leadChanges; ca += res.cautions
    if (keep) keep.push({ s, w: res.finish[0], top5: res.finish.slice(0, 5), order: res.finish, lc: res.leadChanges, ca: res.cautions })
  }
  const per = (a) => Array.from(a, (v) => v / N)
  const out = { avg: per(pos), win: per(win), top3: per(t3), top5: per(t5), top10: per(t10), led: per(led), dnf: per(dnf), stageWin: per(stageW),
    leadChanges: lc / N, cautions: ca / N, dnfs: outs / N }
  if (keep) {
    // the most typical race: won by the most common winner, then closest to the average finishing order (top 10 weighted) and to the
    // average number of cautions / lead changes
    const modal = out.win.indexOf(Math.max(...out.win))
    let best = null, bestD = Infinity
    for (const k of keep) {
      if (k.w !== modal) continue
      let d = 0
      k.order.forEach((i, p) => { const e = out.avg[i] - 1; d += Math.abs(p - e) * (e < 10 ? 2 : 0.5) })
      d += 3 * Math.abs(k.ca - out.cautions) + 0.5 * Math.abs(k.lc - out.leadChanges)
      if (d < bestD) { bestD = d; best = k }
    }
    out.typicalSeed = seed0 + best.s * 7919
    out.typicalIndex = best.s
  }
  return out
}
