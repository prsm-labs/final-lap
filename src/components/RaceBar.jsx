import { dayLabel, useJson } from '../lib/data.js'
import { isF1, raceStore } from '../lib/stores.js'

// 📅 Race picker (2026-10-24, user: Final Lap jumps to next week's race once this week's finishes -- pick any race week like the
// other apps' date pickers). Next race by default; a past race swaps Race Card / Projections / Weekend to that race's card as it
// was frozen before the green flag (or the labelled 2026 replay for races before Final Lap 2.0 went live) with the real finishes.
const short = (r, f1) => (f1
  ? String(r.name || r.track).replace(/ Grand Prix$/, ' GP')
  : String(r.track || r.name).replace(/ (International )?(Motor )?(Super)?[Ss]peedway$| (International )?Raceway$| Motor Speedway$| Circuit$/, ''))

export default function RaceBar({ series, card }) {
  const sel = raceStore.use()
  const idx = useJson(`results/${series}/index.json`)
  const f1 = isF1(series)
  const races = idx?.races || []
  const cur = races.find((r) => String(r.race_id) === String(sel))
  const pick = (v) => { raceStore.set(v || null); try { window.scrollTo({ top: 0 }) } catch { /* ignore */ } }
  const next = card?.race && !card.error ? card.race : null
  if (!races.length && !next) return null
  return (
    <div className={`date-bar ${sel ? 'past' : ''}`}>
      <label className="date-pick">
        <span aria-hidden="true">📅</span>
        <select value={sel || ''} onChange={(e) => pick(e.target.value)} aria-label="Pick a race">
          <option value="">{next ? `Next · ${dayLabel(next.date)} · ${short(next, f1)}` : 'Next race'}</option>
          {races.map((r) => <option key={r.race_id} value={r.race_id}>{dayLabel(r.date)} · {short(r, f1)}</option>)}
        </select>
      </label>
      {sel && (
        <span className="date-note">
          Viewing <b>{cur ? `${cur.name} · ${dayLabel(cur.date)}` : 'a past race'}</b> — {cur?.source === 'live'
            ? 'our card as frozen before the green flag'
            : 'replayed: the model run on earlier races only (Final Lap 2.0 wasn\'t live yet), not a pick we posted'}, with the real finishes.
          <button className="link" onClick={() => pick(null)}>Back to the next race ✕</button>
        </span>
      )}
    </div>
  )
}
