import { useEffect, useState } from 'react'
import './Offseason.css'

// 2026-11-10 (user: same offseason pop-up as Going Yard's, for Final Lap's NASCAR side). One-time notice per sport + season and a
// slim banner on every page while that sport is between its finale and the date it comes back. F1 runs to Abu Dhabi (12/06), so it
// stays live until then; its notice switches on by itself after the finale. Change these dates each winter.
export const OFFSEASON = {
  nascar: {
    over: '2026-11-08',          // Cup Championship Race, Homestead-Miami (O'Reilly 11/07, Truck 11/06)
    back: '2027-02-01',          // banner + notice stop from this date (2027 race weeks start with the Clash / Daytona)
    season: 2026, icon: '🏁', name: 'NASCAR', finale: 'Homestead-Miami (Nov 8)', returns: 'Speedweeks at Daytona in February',
    champs: [
      ['Cup Series', 'Kyle Larson', 'back-to-back champion; Ryan Blaney won the finale'],
      ["O'Reilly Series", 'Justin Allgaier', 'his second title'],
      ['Truck Series', 'Kaden Honeycutt', 'won the finale and his first title'],
    ],
  },
  f1: {
    over: '2026-12-06',          // Abu Dhabi Grand Prix
    back: '2027-03-01',
    season: 2026, icon: '🏎️', name: 'F1', finale: 'Abu Dhabi (Dec 6)', returns: 'the 2027 season opener in March',
    champs: [],                  // fill in after Abu Dhabi
  },
}
const etToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
export const offseasonFor = (sport) => { const o = OFFSEASON[sport]; const d = etToday(); return o && d > o.over && d < o.back ? o : null }

export default function OffseasonNotice({ sport, onSwitch }) {
  const o = offseasonFor(sport)
  const other = sport === 'f1' ? 'nascar' : 'f1'
  const otherLive = !offseasonFor(other)
  const key = `flOffseason_${sport}_${o?.season}`
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!o) { setOpen(false); return }
    try { setOpen(!localStorage.getItem(key)) } catch { setOpen(true) }
  }, [key, Boolean(o)])
  if (!o) return null
  const close = () => { setOpen(false); try { localStorage.setItem(key, '1') } catch { /* private mode */ } }
  return (
    <>
      <div className="fl-off-banner" role="status">
        <span>{o.icon} <b>{o.name} offseason</b> · {o.season} is in the books after {o.finale}. Race cards return for {o.returns}.</span>
        <button type="button" onClick={() => setOpen(true)}>What&apos;s here?</button>
      </div>
      {open && (
        <div className="fl-off-back" onClick={(e) => { if (e.target === e.currentTarget) close() }}>
          <div className="fl-off-card" role="dialog" aria-modal="true" aria-labelledby="flOffTitle">
            <div className="fl-off-kicker">{o.icon} {o.season} {o.name} season complete</div>
            <h2 id="flOffTitle">{o.champs.length ? 'Your champions' : `The ${o.season} ${o.name} season is over.`}</h2>
            {o.champs.length > 0 && (
              <ul className="fl-off-champs">
                {o.champs.map(([s, who, note]) => <li key={s}><span>{s}</span><b>{who}</b><em>{note}</em></li>)}
              </ul>
            )}
            <p>Final Lap&apos;s {o.name} side is in <b>offseason mode</b> until {o.returns}. Everything here is frozen at the end of the {o.season} season.</p>
            <div className="fl-off-cols">
              <div><b>Still here</b><ul><li>Track Record: every {o.season} race graded</li><li>📅 race picker: any {o.season} race&apos;s card, results and our chances</li><li>Schedule and Drivers</li></ul></div>
              <div><b>Paused until {o.name === 'F1' ? 'March' : 'February'}</b><ul><li>Race cards, Top Picks and PRISM Picks</li><li>Projections, Pairs and new Race Sims</li><li>Weekend sessions and Live timing</li></ul></div>
            </div>
            {otherLive && onSwitch && (
              <button type="button" className="fl-off-alt" onClick={() => { close(); onSwitch(other) }}>
                {other === 'f1' ? '🏎️ F1 is still racing: switch to F1' : '🏁 NASCAR is racing: switch to NASCAR'}
              </button>
            )}
            <button type="button" className="fl-off-go" onClick={close}>Browse the {o.season} season</button>
          </div>
        </div>
      )}
    </>
  )
}
