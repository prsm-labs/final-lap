// 2026-10-24 (user: pick a past race week like the other apps' date pickers). A past race's card = the frozen pre-green
// snapshot (races/<series>/<id>.json) when Final Lap 2.0 published one ("live"), otherwise the labelled walk-forward 2026
// replay chances carried in results/<series>/<id>.json -- either way with every driver's real finish attached.
const TOP = { win: 1, top3: 3, top5: 5, top10: 10 }
export const hit = (key, finish) => (finish == null || !TOP[key] ? null : finish <= TOP[key])

// same tiers as build_races.top_picks: one driver per tier, a driver can't appear twice
export function topPicks(drivers) {
  const used = new Set()
  const out = []
  const take = (tier, key, n, title, cond = () => true) => {
    const pool = drivers.filter((d) => d[key] != null && !used.has(d.driver_id) && cond(d)).sort((a, b) => b[key] - a[key]).slice(0, n)
    pool.forEach((d) => used.add(d.driver_id))
    if (pool.length) out.push({ tier, key, title, drivers: pool.map((d) => ({ driver_id: d.driver_id, name: d.name, car: d.car, chance: d[key], win: d.win })) })
  }
  take('Pick to Win', 'win', 1, 'Highest chance to win')
  take('Podium', 'top3', 2, 'Next-best chances of a top-3 finish')
  take('Top 5', 'top5', 2, 'Next-best top-5 chances')
  take('Top 10 Sleeper', 'top10', 2, 'Best top-10 chance among drivers projected outside the top 12', (d) => d.proj_finish > 12)
  take('Darkhorse', 'win', 1, 'Best win chance outside the top 8 favorites', (d) => d.rank > 8)
  return out
}

export function pastCard(res, snap) {
  const fin = new Map(res.drivers.map((r) => [String(r.driver_id), r]))
  const withFinish = (d) => { const r = fin.get(String(d.driver_id)); return { ...d, finish: r?.finish ?? null, status: r?.status ?? null, led: r?.led ?? null } }
  const past = { source: res.source, race: res.race, lineup: res.lineup, sessions: res.sessions, snapshotAt: snap?.snapshotAt || null }
  if (snap && !snap.error && snap.drivers) return { ...snap, drivers: snap.drivers.map(withFinish), past }
  const drivers = res.drivers.filter((r) => r.win != null).map((r) => ({
    driver_id: r.driver_id, name: r.name, car: r.car, team: r.team, make: r.make, start: r.start, photo: r.photo,
    win: r.win, top3: r.top3 ?? null, top5: r.top5 ?? null, top10: r.top10 ?? null, proj_finish: r.proj, finish: r.finish, status: r.status, led: r.led ?? null,
  })).sort((a, b) => b.win - a.win)
  drivers.forEach((d, i) => { d.rank = i + 1 })
  return { series: res.series, stage: 'post', field_source: 'replay', race: res.race, drivers, picks: topPicks(drivers), past }
}
