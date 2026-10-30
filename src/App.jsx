import { useEffect, useMemo, useState } from 'react'
import { useJson } from './lib/data.js'
import { SERIES, SPORTS, isF1, raceStore, seriesStore, setSeries, setSport } from './lib/stores.js'
import { pastCard } from './lib/past.js'
import { RaceCtx } from './components/ui.jsx'
import DriverSlideout from './components/DriverSlideout.jsx'
import RaceCard from './tabs/RaceCard.jsx'
import Projections from './tabs/Projections.jsx'
import RaceSim from './tabs/RaceSim.jsx'
import Weekend from './tabs/Weekend.jsx'
import Live from './tabs/Live.jsx'
import MyPicks from './tabs/MyPicks.jsx'
import Schedule from './tabs/Schedule.jsx'
import Drivers from './tabs/Drivers.jsx'
import TrackRecord from './tabs/TrackRecord.jsx'
import About from './tabs/About.jsx'
import TabMenu from './components/TabMenu.jsx'
import AppRefresh from './components/AppRefresh.jsx'
import RaceBar from './components/RaceBar.jsx'

// Final Lap 2.0 -- Slap Shot / CourtIQ layout for NASCAR: a series switcher, then Race Card (Top Picks + cheat sheets),
// Projections, Weekend (lineup / practice / qualifying), Live, My Picks, Schedule, Drivers, Track Record, About.
const TABS = [
  { key: 'card', label: '🏁 Race Card', C: RaceCard, needsCard: true },
  { key: 'proj', label: '🔮 Projections', C: Projections, needsCard: true },
  { key: 'racesim', label: '🎬 Race Sim', C: RaceSim },  // 2026-10-30: 15,000 lap-by-lap races + replay
  { key: 'weekend', label: '📋 Weekend', C: Weekend, needsCard: true },
  { key: 'live', label: '🔴 Live', C: Live },
  { key: 'picks', label: '⭐ My Picks', C: MyPicks },
  { key: 'schedule', label: '📅 Schedule', C: Schedule },
  { key: 'drivers', label: '🔍 Drivers', C: Drivers },
  { key: 'track', label: '📈 Track Record', C: TrackRecord },
  { key: 'about', label: '📌 About', C: About },
]

export default function App() {
  const series = seriesStore.use()
  const next = useJson(`${series}/next.json`)
  // 2026-10-24 📅 race picker: a past race swaps every card tab to that race's frozen (or replayed) card + real finishes
  const raceSel = raceStore.use()
  const res = useJson(raceSel ? `results/${series}/${raceSel}.json` : null)
  const snap = useJson(raceSel && res && res.source === 'live' ? `races/${series}/${raceSel}.json` : null)
  const past = useMemo(() => (raceSel && res && !res.error && res.drivers && (res.source !== 'live' || snap) ? pastCard(res, snap) : null), [raceSel, res, snap])
  const card = raceSel ? (past || (res?.error ? res : null)) : next
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
            {/* 2026-10-23 new logo (waving flag): dark tile, accent tile in light mode */}<picture><source media="(prefers-color-scheme: light)" srcSet="/logo-accent.svg" /><img src="/logo-dark.svg" alt="" className="brand-logo" /></picture>
            <span className="brand-name">Final <b>Lap</b></span>
          </div>
          {/* 2026-10-25 (user): app refresh button -- reloads the page with fresh data */}
          <div className="hdr-right"><AppRefresh /><span className="badge">PRISM LABS</span></div>
        </header>
        {/* 2026-10-24 (user prototype): ☰ page menu first in the row under the logo, beside the NASCAR | F1 switch */}
        <div className="master-bar tm-row">
          <TabMenu tabs={TABS} tab={tab} setTab={setTab} />
          <RaceBar series={series} card={next} />
          <div className="sport-switch" role="tablist" aria-label="Motorsport">
            {SPORTS.map((s) => {
              const on = (s.key === 'f1') === isF1(series)
              return <button key={s.key} role="tab" aria-selected={on} className={on ? 'active' : ''} onClick={() => setSport(s.key)}>{s.label}</button>
            })}
          </div>
        </div>
        {!isF1(series) && (
          <div className="series-switch" role="tablist" aria-label="Series">
            {SERIES.map((s) => (
              <button key={s.key} role="tab" aria-selected={series === s.key} className={series === s.key ? 'active' : ''} onClick={() => setSeries(s.key)} title={s.full}>{s.label}</button>
            ))}
          </div>
        )}
        <main className="content">
          {!card && <p className="muted">Loading…</p>}
          {card && T.needsCard && !hasCard && raceSel && <p className="muted">Couldn't load that race. Pick another one, or go back to the next race.</p>}
          {card && T.needsCard && !hasCard && !raceSel && <p className="muted">No upcoming {isF1(series) ? 'F1' : SERIES.find((s) => s.key === series)?.label} race on the schedule — the season is over. See the Schedule and Track Record tabs.</p>}
          {card && (!T.needsCard || hasCard) && <T.C card={hasCard ? card : null} series={series} />}
        </main>
        <footer className="footer">Final Lap · a PRISM Labs app · projections, not guarantees · data: {isF1(series) ? 'Jolpica / OpenF1 / ESPN' : 'NASCAR'} · no sportsbook odds</footer>
        <DriverSlideout />
      </div>
    </RaceCtx.Provider>
  )
}
