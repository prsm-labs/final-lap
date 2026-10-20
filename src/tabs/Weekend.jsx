import { SOURCE, useJson } from '../lib/data.js'
import { Section } from '../components/ui.jsx'
import { Lineup, Sessions } from '../components/weekend.jsx'
import { RaceHeader } from './RaceCard.jsx'

// 📋 Weekend -- this week's official lineup (entry list -> starting lineup once qualifying is in) and every practice /
// qualifying session from NASCAR's feed, each downloadable as CSV. Live practice / qualifying timing is on the Live tab.
export default function Weekend({ card, series }) {
  const w = useJson(`${series}/weekend.json`)
  if (!w) return <p className="muted">Loading weekend…</p>
  if (w.error || !w.race) return <p className="muted">No weekend data yet.</p>
  return (
    <div>
      <RaceHeader card={card} />
      <Section title="📋 Lineup, practice & qualifying" sub={`Straight from ${SOURCE(series)}, refreshed with every update (9 AM, 1 PM, 6 PM ET). During a session, the Live tab shows it${series === 'f1' ? ' (running order)' : ' lap by lap'}.`} />
      <Lineup rows={w.lineup} status={w.lineup_status} race={w.race} />
      <Section title="⏱️ Practice & qualifying" />
      <Sessions sessions={w.sessions} race={w.race} />
    </div>
  )
}
