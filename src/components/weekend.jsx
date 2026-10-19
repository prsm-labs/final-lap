import { fx } from '../lib/data.js'
import { downloadCsv, slug } from '../lib/csv.js'

// Official lineup + practice / qualifying tables (NASCAR weekend feed, weekend.py), each with a CSV download.
// Shared by the Weekend tab (this week's race) and the Live tab's past-race results.
export function CsvButton({ name, rows, cols }) {
  if (!rows?.length) return null
  return <button className="pill" onClick={() => downloadCsv(`${name}.csv`, rows, cols)} title="Download this table as a CSV file (opens in Excel / Sheets)">⬇ CSV</button>
}

const LINEUP_COLS = [
  ['Start', (r) => r.start], ['Qual pos', (r) => r.qual], ['Car', (r) => r.car], ['Driver', (r) => r.driver], ['Team', (r) => r.team],
  ['Make', (r) => r.make], ['Crew chief', (r) => r.crew_chief], ['Qual speed (mph)', (r) => r.qual_speed], ['Sponsor', (r) => r.sponsor],
]

export function Lineup({ rows, status, race, title = '📋 Starting lineup' }) {
  if (!rows?.length) return null
  const official = status === 'official starting lineup'
  const hasCc = rows.some((r) => r.crew_chief)
  return (
    <div className="card">
      <div className="cat-head">
        <span>{official ? title : status === 'entry list' ? '📋 Entry list' : '📋 Projected field'}</span>
        <span className={`chip ${official ? 'ok' : ''}`}>{official ? 'Official (NASCAR)' : status === 'entry list' ? 'Official entry list · lineup after qualifying' : 'Not posted by NASCAR yet'}</span>
        <CsvButton name={slug(race?.date, race?.track, official ? 'starting lineup' : 'entry list')} rows={rows} cols={LINEUP_COLS} />
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Start</th><th>Car</th><th className="sticky">Driver</th><th>Team</th><th>Make</th>{hasCc && <th>Crew chief</th>}<th>Qual speed</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.driver_id}-${r.car}`}>
                <td className="num b">{r.start || '—'}</td><td className="num">#{r.car}</td><td className="sticky">{r.driver}</td>
                <td className="small">{r.team || '—'}</td><td className="small">{r.make || '—'}</td>{hasCc && <td className="small">{r.crew_chief || '—'}</td>}
                <td className="num">{r.qual_speed ? fx(r.qual_speed, 3) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const sessionCols = (practice) => [
  ['Pos', (r) => r.pos], ['Car', (r) => r.car], ['Driver', (r) => r.driver], ['Make', (r) => r.make],
  ['Best lap (s)', (r) => r.best], ['Speed (mph)', (r) => r.speed], ['Best on lap', (r) => r.best_lap], ['Laps', (r) => r.laps],
  ...(practice ? [['5-lap avg (s)', (r) => r.avg5], ['10-lap avg (s)', (r) => r.avg10], ['15-lap avg (s)', (r) => r.avg15], ['Overall avg (s)', (r) => r.avg_all]] : []),
]

export function Sessions({ sessions, race }) {
  if (!sessions?.length) return <p className="muted">No practice or qualifying results posted for this weekend yet.</p>
  return sessions.map((s) => {
    const practice = s.type === 'Practice'
    const long = practice && s.rows.some((r) => r.avg10)
    const fastest10 = long ? Math.min(...s.rows.map((r) => r.avg10 || 999)) : null
    return (
      <div key={s.name} className="card">
        <div className="cat-head">
          <span>{practice ? '🔧' : '⏱️'} {s.name}</span>
          <span className="muted small">{s.date ? new Date(s.date).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''} ET</span>
          <CsvButton name={slug(race?.date, race?.track, s.name)} rows={s.rows} cols={sessionCols(practice)} />
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Pos</th><th>Car</th><th className="sticky">Driver</th><th>Best lap</th><th>Speed</th><th>Laps</th>
              {long && <><th title="Fastest 5 laps in a row">5-lap</th><th title="Fastest 10 laps in a row: long-run speed">10-lap</th><th title="Average of every lap run">Overall</th></>}</tr></thead>
            <tbody>
              {s.rows.map((r) => (
                <tr key={`${r.driver_id}-${r.car}`}>
                  <td className="num b">{r.pos}</td><td className="num">#{r.car}</td><td className="sticky">{r.driver}</td>
                  <td className="num">{r.best ? fx(r.best, 3) : '—'}</td><td className="num">{r.speed ? fx(r.speed, 3) : '—'}</td><td className="num">{r.laps ?? '—'}</td>
                  {long && <>
                    <td className="num">{r.avg5 ? fx(r.avg5, 3) : '—'}</td>
                    <td className={`num ${r.avg10 && r.avg10 === fastest10 ? 'b' : ''}`}>{r.avg10 ? fx(r.avg10, 3) : '—'}</td>
                    <td className="num">{r.avg_all ? fx(r.avg_all, 3) : '—'}</td>
                  </>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  })
}
