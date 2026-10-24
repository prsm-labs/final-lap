import { SOURCE, useJson } from '../lib/data.js'
import { Section } from '../components/ui.jsx'
import { Lineup, Schedule, Sessions } from '../components/weekend.jsx'
import { RaceHeader } from './RaceCard.jsx'

// 📋 Weekend -- this week's official lineup (entry list -> starting lineup once qualifying is in) and every practice /
// qualifying session from NASCAR's feed, each downloadable as CSV. Live practice / qualifying timing is on the Live tab.
// 2026-10-21 (user): the weekend's practice / qualifying / race dates + times on top, before they run.
export default function Weekend({ card, series }) {
  // 2026-10-24 past race (📅 picker): that race's lineup + sessions from its results file
  const live = useJson(card?.past ? null : `${series}/weekend.json`)
  const w = card?.past ? { race: card.past.race, lineup: card.past.lineup, sessions: card.past.sessions, lineup_status: 'official starting lineup' } : live
  if (!w) return <p className="muted">Loading weekend…</p>
  if (w.error || !w.race) return <p className="muted">No weekend data yet.</p>
  return (
    <div>
      <RaceHeader card={card} />
      <Section title="📋 Lineup, practice & qualifying" sub={`Straight from ${SOURCE(series)}, refreshed with every update (9 AM, 1 PM, 6 PM ET). During a session, the Live tab shows it${series === 'f1' ? ' (running order)' : ' lap by lap'}.`} />
      {!card?.past && <Schedule events={w.schedule} sessions={w.sessions} series={series} />}
      <Lineup rows={w.lineup} status={w.lineup_status} race={w.race} proj={card?.drivers} />
      <Section title="⏱️ Practice & qualifying" />
      <Sessions sessions={w.sessions} race={w.race} />
    </div>
  )
}
