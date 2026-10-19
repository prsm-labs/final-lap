import { useSyncExternalStore } from 'react'

// My Picks -- one shared store for every ＋ button and the My Picks tab. Saved in this browser only; one category per
// driver per race (picking the same again removes it, another replaces it).
export const PICK_TYPES = [
  { key: 'win', label: 'To Win', emoji: '🏆', prop: 'win' },
  { key: 'top3', label: 'Podium', emoji: '🥉', prop: 'top3' },
  { key: 'top5', label: 'Top 5', emoji: '🖐️', prop: 'top5' },
  { key: 'top10', label: 'Top 10', emoji: '🔟', prop: 'top10' },
  { key: 'dark', label: 'Darkhorse', emoji: '🐎', prop: 'win' },
  { key: 'fade', label: 'Fade', emoji: '👎', prop: 'top10' },
]
export const PICK_TYPE = Object.fromEntries(PICK_TYPES.map((t) => [t.key, t]))

const KEY = 'finallap.picks.v1'
const listeners = new Set()
let picks = (() => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '{}')
    return v && typeof v === 'object' ? v : {}
  } catch {
    return {}
  }
})()
const save = () => {
  try { localStorage.setItem(KEY, JSON.stringify(picks)) } catch { /* private window: this visit only */ }
  listeners.forEach((fn) => fn())
}
export const pickId = (series, raceId, driverId) => `${series}:${raceId}:${driverId}`

export function setPick(d, type, ctx) {
  const id = pickId(ctx.series, ctx.raceId, d.driver_id)
  const next = { ...picks }
  if (!type || next[id]?.type === type) delete next[id]
  else next[id] = { id, series: ctx.series, raceId: ctx.raceId, race: ctx.race, track: ctx.track, date: ctx.date, driver_id: d.driver_id,
    name: d.name, car: d.car, type, proj: { win: d.win, top3: d.top3, top5: d.top5, top10: d.top10, avg: d.avg }, ts: new Date().toISOString() }
  picks = next
  save()
}
export function removePick(id) {
  if (!picks[id]) return
  const next = { ...picks }
  delete next[id]
  picks = next
  save()
}
export function clearPicks() { picks = {}; save() }
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      try { picks = JSON.parse(e.newValue || '{}') } catch { picks = {} }
      listeners.forEach((fn) => fn())
    }
  })
}
export function usePicks() {
  return useSyncExternalStore((fn) => { listeners.add(fn); return () => listeners.delete(fn) }, () => picks, () => picks)
}
