import { fx } from '../lib/data.js'
import { downloadCsv, slug } from '../lib/csv.js'
import { Th, useSort } from '../lib/useSort.jsx'
import { DriverCell, Prob } from './ui.jsx'

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

// 2026-10-23 (user: the entry list with our projections, sortable, before qualifying sets the lineup): pass `proj` (the
// race card's drivers) and every row gets our Win / Top 3 / Top 5 / Top 10 / average finish from the 20,000-race sim,
// matched by NASCAR driver id (name as a fallback); every column sorts. Before qualifying it opens sorted by Win, after by
// starting spot. Book odds aren't shown: The Odds API carries no NASCAR or F1 markets (checked 2026-10-23, 181 sports).
const PROJ_COLS = [['Win %', (r) => r.win], ['Top 3 %', (r) => r.top3], ['Top 5 %', (r) => r.top5], ['Top 10 %', (r) => r.top10], ['Avg finish (sim)', (r) => r.avg]]
const CAR_NUM = { car: (r) => (r.car == null ? null : Number(String(r.car).replace(/\D/g, '')) || 0) }
const nameKey = (n) => String(n || '').toLowerCase().replace(/[^a-z]/g, '')

export function Lineup({ rows, status, race, title = '📋 Starting lineup', proj }) {
  const official = status === 'official starting lineup'
  const byId = new Map((proj || []).map((d) => [String(d.driver_id), d]))
  const byName = new Map((proj || []).map((d) => [nameKey(d.name), d]))
  const merged = (rows || []).map((r) => {
    const d = proj ? byId.get(String(r.driver_id)) || byName.get(nameKey(r.driver)) : null
    return d ? { ...r, _d: d, name: r.driver, win: d.win, top3: d.top3, top5: d.top5, top10: d.top10, avg: d.avg } : { ...r, name: r.driver }
  })
  const hasProj = merged.some((r) => r._d)
  const sort = useSort(merged, official || !hasProj ? 'start' : 'win', official || !hasProj ? 'asc' : 'desc', CAR_NUM)
  if (!rows?.length) return null
  const hasCc = rows.some((r) => r.crew_chief)
  const hasMake = rows.some((r) => r.make)
  const hasSpeed = rows.some((r) => r.qual_speed)
  const hasQ = rows.some((r) => r.q1)          // F1: Q1 / Q2 / Q3 times
  const cols = hasProj ? [...LINEUP_COLS, ...PROJ_COLS.map(([l, f]) => [l, (r) => (f(r) == null ? '' : l.includes('%') ? Math.round(f(r) * 1000) / 10 : Math.round(f(r) * 10) / 10)])] : LINEUP_COLS
  return (
    <div className="card">
      <div className="cat-head">
        <span>{official ? title : status === 'entry list' ? '📋 Entry list' : '📋 Projected field'}</span>
        <span className={`chip ${official ? 'ok' : ''}`}>{official ? (hasQ ? 'Qualifying order (grid penalties apply at the race)' : 'Official (NASCAR)') : status === 'entry list' ? 'Official entry list · lineup after qualifying' : 'Not posted yet'}</span>
        <CsvButton name={slug(race?.date, race?.track, official ? 'starting lineup' : 'entry list')} rows={sort.sorted} cols={cols} />
      </div>
      {hasProj && <p className="muted small" style={{ margin: '0 0 6px' }}>Our chances from 20,000 simulated races{official ? '' : ' -- before qualifying they lean on driver, car and track form; they update once the starting spots are in'}. Tap a header to sort, a driver for the full breakdown.</p>}
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr>
            <Th k="start" label="Start" sort={sort} /><Th k="car" label="Car" sort={sort} /><Th k="name" label="Driver" sort={sort} className="sticky" />
            {hasProj && <><Th k="win" label="Win" sort={sort} /><Th k="top3" label="Top 3" sort={sort} /><Th k="top5" label="Top 5" sort={sort} /><Th k="top10" label="Top 10" sort={sort} /><Th k="avg" label="Avg fin" sort={sort} title="Average finish across the simulated races (lower is better)" /></>}
            <Th k="team" label="Team" sort={sort} />{hasMake && <Th k="make" label="Make" sort={sort} />}{hasCc && <Th k="crew_chief" label="Crew chief" sort={sort} />}{hasSpeed && <Th k="qual_speed" label="Qual speed" sort={sort} />}{hasQ && <><th>Q1</th><th>Q2</th><th>Q3</th></>}
          </tr></thead>
          <tbody>
            {sort.sorted.map((r) => (
              <tr key={`${r.driver_id}-${r.car}`}>
                <td className="num b">{r.start || '—'}</td><td className="num">#{r.car}</td>
                <td className="sticky">{r._d ? <DriverCell d={r._d} sub={false} /> : r.driver}</td>
                {hasProj && <>
                  <td className="num"><Prob v={r.win} strong={0.15} /></td><td className="num"><Prob v={r.top3} /></td>
                  <td className="num"><Prob v={r.top5} /></td><td className="num"><Prob v={r.top10} strong={0.6} /></td>
                  <td className="num">{r.avg != null ? fx(r.avg) : '—'}</td>
                </>}
                <td className="small">{r.team || '—'}</td>{hasMake && <td className="small">{r.make || '—'}</td>}{hasCc && <td className="small">{r.crew_chief || '—'}</td>}
                {hasSpeed && <td className="num">{r.qual_speed ? fx(r.qual_speed, 3) : '—'}</td>}
                {hasQ && <><td className="num">{r.q1 || '—'}</td><td className="num">{r.q2 || '—'}</td><td className="num">{r.q3 || '—'}</td></>}
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
    const hasSpeed = s.rows.some((r) => r.speed)
    const hasGap = s.rows.some((r) => r.gap != null)     // F1 (OpenF1): gap to the fastest
    const hasQ = s.rows.some((r) => r.q1)
    return (
      <div key={s.name} className="card">
        <div className="cat-head">
          <span>{practice ? '🔧' : '⏱️'} {s.name}</span>
          <span className="muted small">{s.date ? new Date(s.date).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''} ET</span>
          <CsvButton name={slug(race?.date, race?.track, s.name)} rows={s.rows} cols={sessionCols(practice)} />
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Pos</th><th>Car</th><th className="sticky">Driver</th><th>Best lap</th>{hasSpeed && <th>Speed</th>}{hasGap && <th>Gap</th>}{hasQ && <><th>Q1</th><th>Q2</th><th>Q3</th></>}<th>Laps</th>
              {long && <><th title="Fastest 5 laps in a row">5-lap</th><th title="Fastest 10 laps in a row: long-run speed">10-lap</th><th title="Average of every lap run">Overall</th></>}</tr></thead>
            <tbody>
              {s.rows.map((r) => (
                <tr key={`${r.driver_id}-${r.car}`}>
                  <td className="num b">{r.pos}</td><td className="num">#{r.car}</td><td className="sticky">{r.driver}</td>
                  <td className="num">{r.best ? fx(r.best, 3) : '—'}</td>{hasSpeed && <td className="num">{r.speed ? fx(r.speed, 3) : '—'}</td>}
                  {hasGap && <td className="num">{r.gap ? `+${fx(r.gap, 3)}` : r.pos === 1 ? '—' : r.status || '—'}</td>}
                  {hasQ && <><td className="num">{r.q1 ? fx(r.q1, 3) : '—'}</td><td className="num">{r.q2 ? fx(r.q2, 3) : '—'}</td><td className="num">{r.q3 ? fx(r.q3, 3) : '—'}</td></>}
                  <td className="num">{r.laps ?? '—'}</td>
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

// 2026-10-21 (user): every practice / qualifying / race start for the weekend, listed before they run (NASCAR's posted
// weekend schedule; OpenF1's session list for F1). Times in ET like the rest of the app, plus the viewer's own time when
// they aren't on Eastern.
const ET_FMT = { weekday: 'short', month: 'short', day: 'numeric' }
const TIME_FMT = { hour: 'numeric', minute: '2-digit' }
const inWords = (ms) => {
  const h = Math.round(ms / 3.6e6)
  return h < 1 ? 'under an hour' : h < 48 ? `${h} h` : `${Math.round(h / 24)} days`
}
export function Schedule({ events, sessions, series }) {
  if (!events?.length) return <p className="muted">{series === 'f1' ? 'No session times posted for this weekend yet.' : "NASCAR hasn't posted this weekend's schedule yet."}</p>
  const now = Date.now()
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  const local = tz && tz !== 'America/New_York'
  const posted = new Set((sessions || []).map((s) => s.name))
  const next = events.find((e) => Date.parse(e.utc) > now)
  const noPractice = series !== 'f1' && !events.some((e) => e.type === 'Practice')
  const status = (e) => {
    if (posted.has(e.name)) return <span className="chip ok">Results below</span>
    const t = Date.parse(e.utc)
    // 2026-10-24: a started session only reads "under way" for its usual length; after that it's finished and its
    // results land with the next update (they were showing "Under way" for a day)
    const runs = { Practice: 75, Qualifying: 90, Race: series === 'f1' ? 150 : 240 }[e.type] ?? 120
    if (t <= now && now - t > runs * 60e3) return <span className="chip">Finished · results next update</span>
    if (t <= now) return <span className="chip ok">{e.type === 'Race' ? 'Green flag · Live tab' : 'Under way · Live tab'}</span>
    return <span className={`chip ${e === next ? 'ok' : ''}`}>{e === next ? `Next · in ${inWords(t - now)}` : 'Upcoming'}</span>
  }
  return (
    <div className="card">
      <div className="cat-head"><span>🗓️ Weekend schedule</span><span className="muted small">times ET{local ? ' · your time below' : ''}</span></div>
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th className="sticky">Session</th><th>When (ET)</th><th>Notes</th></tr></thead>
          <tbody>
            {events.map((e) => {
              const et = new Date(e.start), u = new Date(e.utc)
              return (
                <tr key={e.utc + e.name} className={e.type === 'Race' ? 'b' : ''}>
                  <td className="sticky">{e.type === 'Practice' ? '🔧' : e.type === 'Qualifying' ? '⏱️' : '🏁'} {e.name}<div style={{ marginTop: 3 }}>{status(e)}</div></td>
                  <td style={{ whiteSpace: 'nowrap' }}>{et.toLocaleDateString([], ET_FMT)} · {et.toLocaleTimeString([], TIME_FMT)}
                    {local && <div className="muted small">your time {u.toLocaleString([], { weekday: 'short', ...TIME_FMT })}</div>}</td>
                  <td className="small muted">{e.notes || ''}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {noPractice && <p className="muted small">No practice on this weekend's schedule (NASCAR runs some tracks, like superspeedways, with qualifying only), so the model has no practice speeds to use.</p>}
    </div>
  )
}
