import { useEffect, useMemo, useState } from 'react'
import { useJson } from './lib/data.js'
import { SERIES, seriesStore, setSeries } from './lib/stores.js'
import { RaceCtx } from './components/ui.jsx'
import DriverSlideout from './components/DriverSlideout.jsx'
import RaceCard from './tabs/RaceCard.jsx'
import Projections from './tabs/Projections.jsx'
import Live from './tabs/Live.jsx'
import MyPicks from './tabs/MyPicks.jsx'
import Schedule from './tabs/Schedule.jsx'
import Drivers from './tabs/Drivers.jsx'
import TrackRecord from './tabs/TrackRecord.jsx'
import About from './tabs/About.jsx'

// Final Lap 2.0 -- Slap Shot / CourtIQ layout for NASCAR: a series switcher, then Race Card (Top Picks + cheat sheets),
// Projections, Live, My Picks, Schedule, Drivers, Track Record, About.
const TABS = [
  { key: 'card', label: '🏁 Race Card', C: RaceCard, needsCard: true },
  { key: 'proj', label: '🔮 Projections', C: Projections, needsCard: true },
  { key: 'live', label: '🔴 Live', C: Live },
  { key: 'picks', label: '⭐ My Picks', C: MyPicks },
  { key: 'schedule', label: '📅 Schedule', C: Schedule },
  { key: 'drivers', label: '🔍 Drivers', C: Drivers },
  { key: 'track', label: '📈 Track Record', C: TrackRecord },
  { key: 'about', label: '📌 About', C: About },
]

export default function App() {
  const series = seriesStore.use()
  const card = useJson(`${series}/next.json`)
  const [tab, setTab] = useState(() => {
    try { return sessionStorage.getItem('finallap.tab') || 'card' } catch { return 'card' }
  })
  useEffect(() => { try { sessionStorage.setItem('finallap.tab', tab) } catch { /* ignore */ } }, [tab])
  const T = useMemo(() => TABS.find((t) => t.key === tab) || TABS[0], [tab])
  const hasCard = card && !card.error && card.race
  const ctx = useMemo(() => (hasCard ? { series, raceId: card.race.race_id, race: card.race.name, track: card.race.track, date: card.race.date, ttype: card.race.ttype } : null), [hasCard, series, card])
  return (
    <RaceCtx.Provider value={ctx}>
      <div className="app">
        <header className="header">
          <div className="brand">
            <img src="/logo.png" alt="" className="brand-logo" />
            <span className="brand-name">Final <b>Lap</b></span>
          </div>
          <span className="badge">PRISM LABS</span>
        </header>
        <div className="series-switch" role="tablist" aria-label="Series">
          {SERIES.map((s) => (
            <button key={s.key} role="tab" aria-selected={series === s.key} className={series === s.key ? 'active' : ''} onClick={() => setSeries(s.key)} title={s.full}>{s.label}</button>
          ))}
        </div>
        <nav className="tabs">
          {TABS.map((t) => <button key={t.key} className={tab === t.key ? 'active' : ''} onClick={() => setTab(t.key)}>{t.label}</button>)}
        </nav>
        <main className="content">
          {!card && <p className="muted">Loading…</p>}
          {card && T.needsCard && !hasCard && <p className="muted">No upcoming {SERIES.find((s) => s.key === series)?.label} race on the schedule — the season is over. See the Schedule and Track Record tabs.</p>}
          {card && (!T.needsCard || hasCard) && <T.C card={hasCard ? card : null} series={series} />}
        </main>
        <footer className="footer">Final Lap · a PRISM Labs app · projections, not guarantees · data: NASCAR · no sportsbook odds</footer>
        <DriverSlideout />
      </div>
    </RaceCtx.Provider>
  )
}
