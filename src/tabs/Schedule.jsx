import { dayLabel, pct, raceTime, SOURCE, TYPE_ICON, useJson } from '../lib/data.js'
import { Finish, Section } from '../components/ui.jsx'

// 📅 Schedule -- the full season straight from NASCAR's feed: track, type, date, winner, and our pick and where he finished.
export default function Schedule({ series, card }) {
  const sched = useJson(`${series}/schedule.json`)
  const tr = useJson(`${series}/track_record.json`)
  if (!sched) return <p className="muted">Loading schedule…</p>
  const graded = new Map([...(tr?.replay?.races || []), ...(tr?.live?.races || [])].map((r) => [r.race_id, r]))
  return (
    <div>
      <Section title={`📅 ${sched.season} ${sched.label} schedule`} sub={`${sched.races.length} ${series === 'f1' ? 'Grands Prix' : 'points races'} · from ${SOURCE(series)}`} />
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Date</th><th className="sticky">Race</th><th>Track</th><th>Type</th><th>Winner</th><th title="Our favorite (highest win chance) and where he finished">Our pick</th><th>Fin</th><th title="Our win chance for the actual winner">Winner's %</th></tr></thead>
          <tbody>
            {sched.races.map((r) => {
              const g = graded.get(r.race_id)
              const next = r.race_id === card?.race?.race_id
              return (
                <tr key={r.race_id} className={next ? 'hl' : ''}>
                  <td className="num" title={raceTime(r.start)}>{dayLabel(r.date)}</td>
                  <td className="sticky">{next && <span className="chip ok">NEXT</span>} {r.name}{r.playoff ? <span className="muted small"> · playoffs</span> : ''}{r.sprint ? <span className="muted small"> · sprint</span> : ''}</td>
                  <td>{r.track}</td>
                  <td>{TYPE_ICON[r.ttype]} {r.type}</td>
                  <td>{r.winner || (r.done ? '—' : '')}</td>
                  <td>{g ? <>{g.pick} <span className="muted small">{pct(g.pick_win)}{g.source === 'replay' ? ' · replay' : ''}</span></> : ''}</td>
                  <td>{g ? <Finish n={g.pick_finish} /> : ''}</td>
                  <td className="num">{g ? pct(g.winner_win, 1) : ''}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="muted small">"replay" = races run before Final Lap 2.0 launched, re-predicted using only information available before each race (see Track Record).</p>
    </div>
  )
}
