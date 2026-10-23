// 🤝 Pairs (Race Card; Slap Shot / CourtIQ pattern, 2026-10-23) -- auto-built 2-driver pairs from this weekend's NASCAR
// card. Legs: top 3, top 5 and top 10 finishes (win legs left out: two drivers can't both win one race, and win chances are
// small enough that pairs of them are lottery tickets). Pair chance = leg A x leg B x how two finishes in ONE race move
// together. Measured walk-forward on 2024-26 (every Cup / O'Reilly / Truck race, each season predicted by a model fit on
// earlier seasons; each race's top 8 top-3 legs, top 10 top-5 legs, top 15 top-10 legs; scratch pairs/fl_corr.py) as
// actual both-hit / product of the chances:
//   both top 3   0.71 (0.63 / 0.80 / 0.71 by season -- only 3 podium spots)   top 3 + top 5 0.92   top 3 + top 10 0.92
//   both top 5   1.07 (strong cars run up front together)   top 5 + top 10 1.08   both top 10 1.00 (no steady link)
// Teammates: no different from other pairs. Held out (factors fit on earlier seasons), these factors beat treating the legs as
// independent in 5 of 6 series-seasons, and beat the race simulation's own joint chances in 6 of 6 (the simulation makes
// every pair compete for spots; real top-5 / top-10 pairs don't). Different races (across series) are independent.
// Frozen with the pre-green snapshot (scripts/lock_pairs.mjs -> public/data/pairs/<series>/<race_id>.json), graded in
// Track Record. No odds (Final Lap shows none); fair price only. NASCAR only -- F1 pairs aren't measured.
export const LEGS = {
  top3: { key: 'top3', line: 3, short: 'Top 3', label: 'top-3 finish', emoji: '🥉', k: 8 },
  top5: { key: 'top5', line: 5, short: 'Top 5', label: 'top-5 finish', emoji: '🖐️', k: 10 },
  top10: { key: 'top10', line: 10, short: 'Top 10', label: 'top-10 finish', emoji: '🔟', k: 15 },
}
const LEG_KEYS = Object.keys(LEGS)
export const PAIR_CORR = { 'top3+top3': 0.71, 'top3+top5': 0.92, 'top10+top3': 0.92, 'top5+top5': 1.07, 'top10+top5': 1.08, 'top10+top10': 1 }

export const MAX_PAIRS = 10
export const STAR_TOP = 3
const MIN_CHANCE = 0.08
const MAX_PER_DRIVER = { balanced: 1, default: 2 }

export const MODES = [
  { key: 'balanced', label: '⚖️ Balanced', blurb: 'Safest top-10 pairs, top-5 pairs, a podium pair, a specialist pair and a darkhorse pair' },
  { key: 'safest', label: '🛡️ Safest', blurb: 'Highest chance both legs hit, any finish' },
  { key: 'front', label: '🏆 Front runners', blurb: 'Top-3 and top-5 legs only' },
  { key: 'spec', label: '📍 Specialists', blurb: 'At least one leg is a 📍 track ace or 🛣️ track-type specialist' },
  { key: 'dark', label: '🐎 Darkhorse', blurb: 'At least one leg is outside the 8 win favorites' },
  { key: 'across', label: '🔀 Across series', blurb: "One leg from this race, one from another NASCAR series' race this weekend (different races: independent)" },
]
export const MODE_KEYS = MODES.map((m) => m.key)
export const LEG_FILTERS = [{ key: null, label: 'All finishes' }, ...LEG_KEYS.map((k) => ({ key: k, label: `${LEGS[k].emoji} ${LEGS[k].short}` }))]

export const toAmerican = (dec) => (dec >= 2 ? Math.round((dec - 1) * 100) : Math.round(-100 / (dec - 1)))
export const fmtAmerican = (am) => (am == null ? '—' : am > 0 ? `+${am}` : String(am))

const isSpec = (d) => (d.tags || []).some((t) => t.key === 'track' || t.key === 'type')

// legs of one card: each driver's top 3 / 5 / 10 chance, the top k drivers per finish (the band the factors were measured on)
function legsOf(card, only, extra = () => false) {
  const out = []
  for (const k of LEG_KEYS) {
    if (only && k !== only) continue
    const ds = [...card.drivers].filter((d) => d[k] > 0).sort((a, b) => b[k] - a[k])
    const top = new Set(ds.slice(0, LEGS[k].k).map((d) => d.driver_id))
    for (const d of ds) if (top.has(d.driver_id) || (extra(d) && d[k] >= 0.1)) out.push({ d, leg: k, chance: d[k], series: card.series, race: card.race })
  }
  return out
}

function makePair(a, b) {
  const sameRace = a.series === b.series && a.race?.race_id === b.race?.race_id
  const combo = [a.leg, b.leg].sort().join('+')
  const corr = sameRace ? PAIR_CORR[combo] ?? 1 : 1
  const chance = Math.min(0.99, a.chance * b.chance * corr, Math.min(a.chance, b.chance))
  const id = (l) => `${l.series}:${l.d.driver_id}:${l.leg}`
  const [x, y] = id(a) < id(b) ? [a, b] : [b, a]
  return { key: `${id(x)}|${id(y)}`, legs: [a, b], sameRace, corr, combo, chance, fair: toAmerican(1 / chance) }
}

function allPairs(A, B, filter) {
  const out = []
  const same = A === B
  for (let i = 0; i < A.length; i += 1) {
    for (let j = same ? i + 1 : 0; j < B.length; j += 1) {
      const a = A[i]
      const b = B[j]
      if (a.series === b.series && a.d.driver_id === b.d.driver_id) continue
      if (filter(a, b)) out.push(makePair(a, b))
    }
  }
  return out.sort((p, q) => q.chance - p.chance)
}

function take(sorted, n, state) {
  const got = []
  for (const pr of sorted) {
    if (got.length >= n) break
    if (state.keys.has(pr.key) || pr.chance < MIN_CHANCE) continue
    const ids = pr.legs.map((l) => `${l.series}:${l.d.driver_id}`)
    if (ids.some((id) => (state.uses.get(id) || 0) >= state.cap)) continue
    state.keys.add(pr.key)
    ids.forEach((id) => state.uses.set(id, (state.uses.get(id) || 0) + 1))
    got.push(pr)
  }
  return got
}

// ★ best = percentile of the both-hit chance among every pair tonight with the same two finishes.
function withStars(list, legs) {
  const by = {}
  for (const pr of allPairs(legs, legs, () => true)) (by[pr.combo] = by[pr.combo] || []).push(pr.chance)
  for (const k of Object.keys(by)) by[k].sort((a, b) => a - b)
  const pctl = (pr) => { const v = by[pr.combo] || [pr.chance]; const below = v.filter((x) => x <= pr.chance).length; return v.length > 1 ? (below - 1) / (v.length - 1) : 1 }
  const scored = list.map((pr) => ({ ...pr, star: pr.sameRace ? pctl(pr) : null }))
  const rank = new Map(scored.filter((pr) => pr.star != null).sort((a, b) => b.star - a.star || b.chance - a.chance).slice(0, STAR_TOP).map((pr, i) => [pr.key, i + 1]))
  return scored.map((pr) => ({ ...pr, starRank: rank.get(pr.key) ?? null }))
}

// card: this race's card (next.json / a frozen snapshot); others: other NASCAR series' cards this weekend (for 🔀).
export function buildPairs(card, { mode = 'balanced', leg = null, others = [] } = {}) {
  if (!card?.drivers?.length) return []
  const winRank = new Map([...card.drivers].sort((a, b) => b.win - a.win).map((d, i) => [d.driver_id, i]))
  const dark = (d) => (winRank.get(d.driver_id) ?? 0) >= 8
  const legs = legsOf(card, leg, (d) => isSpec(d) || dark(d))
  const core = legs.filter((l) => [...card.drivers].sort((a, b) => b[l.leg] - a[l.leg]).slice(0, LEGS[l.leg].k).some((d) => d.driver_id === l.d.driver_id))
  const state = { keys: new Set(), uses: new Map(), cap: MAX_PER_DRIVER[mode] ?? MAX_PER_DRIVER.default }
  const tag = (list, section) => list.map((pr) => ({ ...pr, section }))
  const pairs = (f, ls = core) => allPairs(ls, ls, f)
  const combo = (c) => (a, b) => [a.leg, b.leg].sort().join('+') === c
  let out
  if (mode === 'safest') out = tag(take(pairs(() => true), MAX_PAIRS, state), '🛡️ Safest')
  else if (mode === 'front') out = tag(take(pairs((a, b) => a.leg !== 'top10' && b.leg !== 'top10'), MAX_PAIRS, state), '🏆 Front runners')
  else if (mode === 'spec') out = tag(take(pairs((a, b) => isSpec(a.d) || isSpec(b.d), legs), MAX_PAIRS, state), '📍 Specialist')
  else if (mode === 'dark') out = tag(take(pairs((a, b) => dark(a.d) || dark(b.d), legs), MAX_PAIRS, state), '🐎 Darkhorse')
  else if (mode === 'across') {
    const other = others.flatMap((c) => legsOf(c, leg))
    out = tag(take(allPairs(core, other, () => true), MAX_PAIRS, state), '🔀 Across series')
  } else if (leg) out = tag(take(pairs(() => true), MAX_PAIRS, state), `${LEGS[leg].emoji} ${LEGS[leg].short}`)
  else {
    out = [
      ...tag(take(pairs(combo('top10+top10')), 3, state), '🔟 Top 10s'),
      ...tag(take(pairs(combo('top10+top5')), 2, state), '🖐️ Top 5 + top 10'),
      ...tag(take(pairs(combo('top5+top5')), 1, state), '🖐️ Top 5s'),
      ...tag(take(pairs((a, b) => a.leg === 'top3' || b.leg === 'top3'), 1, state), '🥉 Podium'),
      ...tag(take(pairs((a, b) => isSpec(a.d) || isSpec(b.d), legs), 1, state), '📍 Specialist'),
      ...tag(take(pairs((a, b) => dark(a.d) || dark(b.d), legs), 1, state), '🐎 Darkhorse'),
    ]
    if (out.length < MAX_PAIRS) out.push(...tag(take(pairs(() => true), MAX_PAIRS - out.length, state), '🛡️ Safest'))
  }
  return withStars(out, core)
}

// What scripts/lock_pairs.mjs freezes (graded by build_track_record.py).
const r1 = (v) => Math.round(v * 1000) / 10
export const pairRecord = (pr) => ({
  key: pr.key, section: pr.section, corr: pr.corr, chancePct: r1(pr.chance), fair: pr.fair, starRank: pr.starRank ?? null,
  legs: pr.legs.map((l) => ({ series: l.series, race_id: l.race?.race_id, driver_id: l.d.driver_id, name: l.d.name, car: l.d.car, leg: l.leg, line: LEGS[l.leg].line, chancePct: r1(l.chance) })),
})

export const relText = (pr) => {
  if (!pr.sameRace) return 'Different races — independent'
  const pc = Math.round((pr.corr - 1) * 100)
  if (!pc) return 'Same race — no steady link between two top-10 finishes'
  return pc < 0 ? `Same race — ${pc}% vs independent (only ${pr.combo === 'top3+top3' ? 'three podium spots' : 'so many spots up front'})` : `Same race — +${pc}% vs independent (strong cars run up front together)`
}
