import { useEffect, useState } from 'react'

// Data the pipeline publishes (public/data/<series>/*.json) + NASCAR live timing through /api/live.
const cache = new Map()
export function useJson(path) {
  const [data, setData] = useState(() => cache.get(path) || null)
  useEffect(() => {
    let alive = true
    if (!path) { setData(null); return undefined }   // 2026-10-24: no path = nothing to load
    if (cache.has(path)) { setData(cache.get(path)); return undefined }
    setData(null)
    fetch(`/data/${path}`, { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : { error: r.status }))
      .catch((e) => ({ error: String(e) }))
      .then((d) => { if (!alive) return; if (!d.error) cache.set(path, d); setData(d) })
    return () => { alive = false }
  }, [path])
  return data
}

export function useLive(enabled = true, everyMs = 15000, url = '/api/live') {
  const [live, setLive] = useState(null)
  useEffect(() => {
    if (!enabled) return undefined
    let alive = true
    const load = () => fetch(url).then((r) => (r.ok ? r.json() : null)).catch(() => null).then((d) => alive && setLive(d))
    load()
    const t = setInterval(load, everyMs)
    return () => { alive = false; clearInterval(t) }
  }, [enabled, everyMs, url])
  return live
}

export const pct = (v, d = 0) => (v == null ? '—' : `${(v * 100).toFixed(v > 0 && v < 0.01 ? 1 : d)}%`)
export const fx = (v, d = 1) => (v == null || Number.isNaN(v) ? '—' : Number(v).toFixed(d))
export const ord = (n) => {
  if (n == null) return '—'
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`
}
// feed times are US Eastern wall-clock: daylight time (-04:00) from the 2nd Sunday of March to the 1st Sunday of November
const nthSunday = (y, m, n) => { const d = new Date(Date.UTC(y, m, 1)); return 1 + ((7 - d.getUTCDay()) % 7) + 7 * (n - 1) }
const etOffset = (iso) => {
  const y = +iso.slice(0, 4); const m = +iso.slice(5, 7) - 1; const day = +iso.slice(8, 10)
  const dst = (m > 2 || (m === 2 && day >= nthSunday(y, 2, 2))) && (m < 10 || (m === 10 && day < nthSunday(y, 10, 1)))
  return dst ? '-04:00' : '-05:00'
}
export const etDate = (iso) => new Date(`${iso.slice(0, 19)}${etOffset(iso)}`)
export const raceTime = (iso) => {
  if (!iso) return ''
  const d = etDate(iso)
  return d.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}
export const dayLabel = (date) => new Date(`${date}T12:00:00`).toLocaleDateString([], { month: 'short', day: 'numeric' })
export const TYPE_ICON = { ss: '🌪️', int: '🏁', short: '🔩', road: '↪️', street: '🏙️', fast: '💨', tech: '🌀', perm: '🏎️' }
// where each sport's data comes from (labels on tabs / footer)
export const SOURCE = (series) => (series === 'f1' ? 'F1 results (Jolpica) and session timing (OpenF1)' : "NASCAR's official feed")
