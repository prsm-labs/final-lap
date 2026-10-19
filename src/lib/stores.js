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
const saved = (() => { try { return localStorage.getItem('finallap.series') } catch { return null } })()
export const seriesStore = makeStore(SERIES.some((s) => s.key === saved) ? saved : 'cup')
export const setSeries = (k) => { seriesStore.set(k); try { localStorage.setItem('finallap.series', k) } catch { /* ignore */ } }

export const slideStore = makeStore(null)          // driver shown in the slideout
export const openDriver = (d) => slideStore.set(d)
export const closeDriver = () => slideStore.set(null)

export const searchStore = makeStore('')           // shared driver / team / car search
export function matches(d, q) {
  if (!q) return true
  const s = q.trim().toLowerCase()
  return [d.name, d.team, d.make, d.car && `#${d.car}`, d.car].some((v) => String(v || '').toLowerCase().includes(s))
}
