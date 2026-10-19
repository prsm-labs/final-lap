import { useState } from 'react'
import { dayLabel, pct } from '../lib/data.js'
import { clearPicks, PICK_TYPES, removePick, usePicks } from '../lib/picks.js'
import { openDriver } from '../lib/stores.js'
import { Avatar, Section } from '../components/ui.jsx'

// ⭐ My Picks (Slap Shot / CourtIQ layout): every driver tagged with ＋, grouped by race and category, and the chance we gave
// when picked. Saved in this browser only. (No Gambly: it doesn't take motorsport props yet.)
export default function MyPicks({ card }) {
  const picks = usePicks()
  const [confirm, setConfirm] = useState(false)
  const now = new Map((card?.drivers || []).map((d) => [d.driver_id, d]))
  const list = Object.values(picks).sort((a, b) => (b.date || '').localeCompare(a.date || '') || a.ts.localeCompare(b.ts))
  const races = [...new Map(list.map((k) => [`${k.series}:${k.raceId}`, k])).values()]
  return (
    <div>
      <Section title="⭐ My Picks" sub="Drivers you've tagged with the ＋ button — saved in this browser" />
      {list.length > 0 && (
        <div className="pill-row">
          <button className={`pill ${confirm ? 'danger' : ''}`} onClick={() => { if (confirm) { clearPicks(); setConfirm(false) } else { setConfirm(true); setTimeout(() => setConfirm(false), 4000) } }}>
            {confirm ? `Click again to clear all ${list.length}` : 'Clear all'}
          </button>
        </div>
      )}
      {list.length === 0 && <p className="muted">No picks yet. Tap ＋ next to any driver on the Race Card, Projections or a driver's card.</p>}
      {races.map((r) => {
        const rows = list.filter((k) => k.series === r.series && k.raceId === r.raceId)
        return (
          <div key={`${r.series}:${r.raceId}`} className="card">
            <div className="cat-head"><span>{r.race} <span className="muted small">· {r.track} · {r.date ? dayLabel(r.date) : ''}</span></span></div>
            {PICK_TYPES.map((t) => {
              const sub = rows.filter((k) => k.type === t.key)
              if (!sub.length) return null
              return (
                <div key={t.key}>
                  <div className="cat-head small"><span>{t.emoji} {t.label}</span></div>
                  {sub.map((k) => {
                    const d = card?.race?.race_id === k.raceId ? now.get(k.driver_id) : null
                    return (
                      <div key={k.id} className="pick-row">
                        <div className="pick-main" onClick={() => d && openDriver(d)}>
                          <Avatar d={d || { car: k.car }} />
                          <div>
                            <div>{k.name} <span className="muted small">#{k.car}</span></div>
                            <div className="muted small">When picked: win {pct(k.proj?.win, 1)} · top 5 {pct(k.proj?.top5)} · top 10 {pct(k.proj?.top10)}{d ? ` · now win ${pct(d.win, 1)}` : ''}</div>
                          </div>
                        </div>
                        <button className="link" onClick={() => removePick(k.id)} title="Remove">✕</button>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
