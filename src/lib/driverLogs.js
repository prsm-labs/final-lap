import { useMemo } from 'react'
import { useJson } from './data.js'

// 2026-11-13 (user: Final Lap's driver slideout set up like CourtIQ / Slap Shot / Six Points). One driver's race log from
// <series>/driver_logs.json (build_driver_logs.py: this season + last), races before `before` (the race being viewed) only.
//   rows  -> oldest first, for the per-prop charts: { date, season, trk, tt, st, fin, led, pts, n, dnf, gain }
//   games -> the Hit rates card's shape (components/HitRateCard.jsx): v = { FIN, ST, GAIN, LED, PTS }, opp = track,
//            tt / st / prevFin for the racing splits
export function useDriverLogs(series, driverId, before) {
  const L = useJson(series ? `${series}/driver_logs.json` : null)
  return useMemo(() => {
    if (!L || L.error) return { rows: [], games: [], ready: !!L }
    const ix = Object.fromEntries((L.cols || []).map((c, i) => [c, i]))
    const raw = driverId != null ? L.drivers?.[String(driverId)] || [] : []
    const cur = L.seasons?.[1]
    const rows = raw.map((r) => {
      const g = { date: r[ix.d], season: r[ix.s], trk: r[ix.trk], tt: r[ix.tt], st: r[ix.st], fin: r[ix.fin], led: ix.led != null ? r[ix.led] : 0,
        pts: r[ix.pts], n: r[ix.n], dnf: r[ix.dnf], lab: ix.lab != null ? r[ix.lab] : null }
      g.gain = g.st - g.fin
      return g
    }).filter((g) => !before || g.date < before)
    const games = rows.map((g, i) => ({
      date: g.date, season: g.season === cur ? 'cur' : 'prev', opp: g.trk, home: null, played: null,
      v: { FIN: g.fin, ST: g.st, GAIN: g.gain, LED: g.led, PTS: g.pts }, tt: g.tt, st: g.st, prevFin: i > 0 ? rows[i - 1].fin : null,
    }))
    return { rows, games, ready: true }
  }, [L, driverId, before])
}
