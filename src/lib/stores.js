import { useSyncExternalStore } from 'react'

// Tiny app-wide stores (Slap Shot / CourtIQ pattern): one selection shared by every tab.
function makeStore(initial) {
  let state = initial
  const listeners = new Set()
  return {
    get: () => state,
    set: (v) => { state = typeof v === 'function' ? v(state) : v; listeners.forEach((fn) => fn()) },
    use: () => useSyncExternalStore((fn) => { listeners.add(fn); return () => listeners.delete(fn) }, () => state, () => state),
  }
}

export const SERIES = [
  { key: 'cup', label: 'Cup', full: 'NASCAR Cup Series' },
  { key: 'oreilly', label: "O'Reilly", full: "NASCAR O'Reilly Auto Parts Series" },
  { key: 'truck', label: 'Truck', full: 'NASCAR CRAFTSMAN Truck Series' },
]
// 2026-10-20: motorsport toggle. F1 is one more "series" key ('f1') behind a NASCAR | F1 switch; the page always opens on
// NASCAR (the last NASCAR series is remembered, F1 is not), per the user.
export const SPORTS = [{ key: 'nascar', label: 'NASCAR' }, { key: 'f1', label: 'F1' }]
export const isF1 = (series) => series === 'f1'
const saved = (() => { try { return localStorage.getItem('finallap.series') } catch { return null } })()
let lastNascar = SERIES.some((s) => s.key === saved) ? saved : 'cup'
export const seriesStore = makeStore(lastNascar)
// 2026-10-24 📅 race picker: null = the next race, else a past race_id of the series on screen (cleared on a series switch)
export const raceStore = makeStore(null)
export const setSeries = (k) => {
  raceStore.set(null)
  seriesStore.set(k)
  if (k === 'f1') return
  lastNascar = k
  try { localStorage.setItem('finallap.series', k) } catch { /* ignore */ }
}
export const setSport = (sp) => { raceStore.set(null); seriesStore.set(sp === 'f1' ? 'f1' : lastNascar) }

export const slideStore = makeStore(null)          // driver shown in the slideout
export const openDriver = (d) => slideStore.set(d)
export const closeDriver = () => slideStore.set(null)

export const searchStore = makeStore('')           // shared driver / team / car search
export function matches(d, q) {
  if (!q) return true
  const s = q.trim().toLowerCase()
  return [d.name, d.team, d.make, d.code, d.car && `#${d.car}`, d.car].some((v) => String(v || '').toLowerCase().includes(s))
}
