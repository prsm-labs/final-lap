import { useState } from 'react'
import { dayLabel, fx, ord, pct, SOURCE, TYPE_ICON, useJson, useLive } from '../lib/data.js'
import { isF1, openDriver } from '../lib/stores.js'
import { Th, useSort } from '../lib/useSort.jsx'
import { Avatar, Finish, Pills, Section } from '../components/ui.jsx'
import { CsvButton, Lineup, Sessions } from '../components/weekend.jsx'
import { slug } from '../lib/csv.js'

// 🔴 Live -- NASCAR's live timing for whatever race is on track, next to our pre-race chances when it's this card's race.
// The race picker opens any finished race this season: official results, loop data, stages, and our pre-race numbers
// (the frozen live snapshot, or the labelled 2026 replay for races before launch). Built by build_results.py.
function Vs({ proj, fin }) {
  if (proj == null || fin == null) return <span className="muted">—</span>
  const d = proj - fin
  return <span className={d > 0 ? 'soft' : d < 0 ? 'tough' : ''}>{d > 0 ? `▲${d}` : d < 0 ? `▼${-d}` : '='}</span>
}

const LIVE_RACE_COLS = [['Pos', (v) => v.pos], ['Car', (v) => v.car], ['Driver', (v) => v.name], ['Start', (v) => v.start], ['Laps', (v) => v.laps],
  ['Led', (v) => v.led], ['Avg pos', (v) => v.avgPos], ['Pits', (v) => v.pits], ['Fast laps', (v) => v.fast]]
const LIVE_SESSION_COLS = [['Pos', (v) => v.pos], ['Car', (v) => v.car], ['Driver', (v) => v.name], ['Best lap (s)', (v) => v.best],
  ['Speed (mph)', (v) => v.bestSpeed], ['Last lap (s)', (v) => v.lastLap], ['Laps', (v) => v.laps]]
const RESULT_COLS = [['Fin', (d) => d.finish], ['Start', (d) => d.start], ['Car', (d) => d.car], ['Driver', (d) => d.name], ['Team', (d) => d.team],
  ['Make', (d) => d.make], ['Status', (d) => d.status], ['Laps', (d) => d.laps], ['Led', (d) => d.led], ['Points', (d) => d.points],
  ['Driver rating', (d) => d.rating], ['Avg pos', (d) => d.avg_ps], ['Fast laps', (d) => d.fast], ['Pass diff', (d) => d.pass_diff],
  ['Our win %', (d) => (d.win != null ? +(d.win * 100).toFixed(1) : null)], ['Our proj finish', (d) => d.proj]]

const fold = (s) => String(s || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

function LiveTiming({ card, series }) {
  const f1 = isF1(series)
  const live = useLive(true, 15000, f1 ? '/api/f1live' : '/api/live')
  if (!live) return <p className="muted">Loading live timing…</p>
  if (live.error || !live.vehicles?.length) return <p className="muted">No live timing right now. This page fills in automatically once cars are on track. Pick a finished race above to see its results.</p>
  // F1 (ESPN) has no driver ids: match our card by name; the session is ours when it's on this weekend
  const ours = f1 ? !!card?.race && Math.abs(new Date(`${card.race.date}T12:00:00`) - Date.now()) < 4 * 86400e3 : live.race_id === card?.race?.race_id
  const proj = new Map((card?.drivers || []).map((d) => [f1 ? fold(d.name) : d.driver_id, d]))
  const projOf = (v) => proj.get(f1 ? fold(v.name) : v.driver_id)
  const done = live.flag_state === 9 || live.flag_state === 4
  const isRace = live.run_type === 3
  return (
    <div>
      <Section title={`🔴 ${live.name || 'Live'}`} sub={`${live.track || ''} · ${isRace ? (live.laps ? `Lap ${live.lap} of ${live.laps}` : live.lap ? `Lap ${live.lap}` : 'Race') : 'Practice / qualifying'} · ${live.flag}${live.stage?.stage_num ? ` · Stage ${live.stage.stage_num}` : ''}`} />
      <div className="race-meta">
        <span className={`chip flag-${String(live.flag).toLowerCase()}`}>{done ? '🏁 Finished' : `🚩 ${live.flag}`}</span>
        {isRace && !f1 && <span className="chip">{live.cautions ?? 0} cautions · {live.lead_changes ?? 0} lead changes · {live.leaders ?? 0} leaders</span>}
        {!ours && <span className="muted small">This is a different race from the card you're viewing — switch series at the top to see our picks for it.</span>}
      </div>
      <div className="pill-row">
        <CsvButton name={slug(live.track, live.name, 'live')} rows={live.vehicles} cols={isRace ? LIVE_RACE_COLS : LIVE_SESSION_COLS} />
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Pos</th><th className="sticky">Driver</th>
              {f1 ? null : isRace
                ? <><th>Start</th><th>Led</th><th>Avg pos</th><th>Pits</th></>
                : <><th title="Best lap time this session">Best lap</th><th>Speed</th><th title="Most recent lap">Last lap</th><th>Laps</th></>}
              {ours && <><th title="Our pre-race win chance">Our win %</th><th title="Our projected finish">Proj</th>{isRace && <th title="Running position vs our projection">vs proj</th>}</>}
            </tr>
          </thead>
          <tbody>
            {live.vehicles.map((v) => {
              const p = projOf(v)
              return (
                <tr key={v.driver_id || v.car || v.name} className={p && p.rank <= 5 ? 'hl' : ''}>
                  <td className="num b">{v.pos}</td>
                  <td className="sticky">
                    <div className="player-cell" onClick={() => p && openDriver(p)}>
                      <Avatar d={p || { car: v.car }} size={24} />
                      <span>{v.name} {(v.car || p?.car) && <span className="muted small">#{v.car || p.car}</span>}{v.onTrack === false && <span className="tag tag-status">off track</span>}</span>
                    </div>
                  </td>
                  {f1 ? null : isRace ? <>
                    <td className="num">{v.start || '—'}</td>
                    <td className="num">{v.led || 0}</td>
                    <td className="num">{fx(v.avgPos)}</td>
                    <td className="num">{v.pits}</td>
                  </> : <>
                    <td className="num">{v.best ? fx(v.best, 3) : '—'}</td>
                    <td className="num">{v.bestSpeed ? fx(v.bestSpeed, 3) : '—'}</td>
                    <td className="num">{v.lastLap ? fx(v.lastLap, 3) : '—'}</td>
                    <td className="num">{v.laps ?? '—'}</td>
                  </>}
                  {ours && <>
                    <td className="num">{p ? pct(p.win, 1) : '—'}</td>
                    <td className="num">{p ? ord(p.proj_finish) : '—'}</td>
                    {isRace && <td className="num"><Vs proj={p?.proj_finish} fin={v.pos} /></td>}
                  </>}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="muted small">{f1 ? 'Live running order from ESPN (practice, qualifying, sprint and the Grand Prix), refreshed every 15 seconds. Lap times land on the Weekend tab after each session (OpenF1).' : 'Live timing from NASCAR (races, practice and qualifying), refreshed every 15 seconds.'}{isRace ? ' ▲ = running better than we projected.' : f1 ? '' : ' Official session results land on the Weekend tab after each session.'}</p>
    </div>
  )
}

function Results({ series, raceId, card }) {
  const f1 = isF1(series)
  const r = useJson(`results/${series}/${raceId}.json`)
  const field = new Map((card?.drivers || []).map((d) => [d.driver_id, d]))   // this week's card: full slideout with charts
  const sort = useSort(r?.drivers, 'finish', 'asc')
  const [view, setView] = useState('race')
  if (!r) return <p className="muted">Loading results…</p>
  if (r.error) return <p className="muted">No results file for this race.</p>
  const x = r.race
  const g = r.grade
  const nSt = x.stage_winners?.length || 0
  const rows = sort.sorted || []
  const facts = [
    `${x.laps} laps`, x.cautions != null && `${x.cautions} cautions (${x.caution_laps} laps)`, x.lead_changes != null && `${x.lead_changes} lead changes`,
    x.leaders != null && `${x.leaders} leaders`, x.margin && `won by ${x.margin}s`, x.avg_speed && `avg ${fx(x.avg_speed, 1)} mph`,
  ].filter(Boolean)
  return (
    <div>
      <div className="race-head card">
        <div className="race-title">{TYPE_ICON[x.ttype]} {x.name}</div>
        <div className="race-sub">{x.track} · {x.type} · {new Date(`${x.date}T12:00:00`).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}{x.playoff ? ' · Playoffs' : ''}</div>
        <div className="race-sub muted">{facts.join(' · ')}</div>
        <div className="race-meta">
          <span className="chip ok">🏆 {x.winner}</span>
          {x.stage_winners?.map((w, i) => w && <span key={i} className="chip">Stage {i + 1}: {w}</span>)}
        </div>
      </div>
      {g && (
        <div className="card">
          <div className="cheat-title">How we did {r.source === 'replay' ? <span className="chip" title="Raced before Final Lap 2.0 launched: re-predicted using only what was known before the race (after qualifying)">replay</span> : <span className="chip ok" title="The picks shown on the site, frozen at the green flag">live pick</span>}</div>
          <div className="small">
            Our pick <b>{g.pick}</b> ({pct(g.pick_win)} to win) finished <b>{ord(g.pick_finish)}</b>.
            {' '}Winner {g.winner} was our #{g.winner_rank} ({pct(g.winner_win, 1)}).
            {' '}Top-3 picks in the top 3: <b>{g.top3_hits}/3</b> · top 5: <b>{g.top5_hits}/5</b> · top 10: <b>{g.top10_hits}/10</b>.
          </div>
        </div>
      )}
      <div className="pill-row">
        <Pills value={view} onChange={setView} options={[
          ['race', '🏁 Race results'], ['lineup', '📋 Starting lineup'], ['sessions', `⏱️ Practice & qualifying (${r.sessions?.length || 0})`],
        ]} />
        {view === 'race' && <CsvButton name={slug(x.date, x.track, 'results')} rows={r.drivers} cols={RESULT_COLS} />}
      </div>
      {view === 'lineup' && <Lineup rows={r.lineup} status="official starting lineup" race={x} />}
      {view === 'sessions' && <Sessions sessions={r.sessions} race={x} />}
      {view === 'race' && <>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <Th k="finish" label="Fin" sort={sort} />
              <Th k="name" label="Driver" sort={sort} className="sticky" />
              <Th k="start" label="Start" sort={sort} />
              {Array.from({ length: nSt }, (_, i) => <th key={i} title={`Stage ${i + 1} finish`}>S{i + 1}</th>)}
              {f1 ? <>
                <Th k="q_pos" label="Qual" sort={sort} title="Qualifying position" />
                {x.sprint ? <Th k="sprint" label="Sprint" sort={sort} title="Sprint finish" /> : null}
                <Th k="points" label="Pts" sort={sort} title="Championship points" />
              </> : <>
                <Th k="led" label="Led" sort={sort} title="Laps led" />
                <Th k="rating" label="Rating" sort={sort} title="NASCAR driver rating (loop data, max 150)" />
                <Th k="avg_ps" label="Avg pos" sort={sort} title="Average running position" />
                <Th k="fast" label="Fast laps" sort={sort} title="Laps as the fastest car on track" />
              </>}
              <Th k="win" label="Our win %" sort={sort} title="Our pre-race win chance" />
              <Th k="proj" label="Proj" sort={sort} title="Our projected finish" />
              <th title="Finish vs our projection">vs proj</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.driver_id} className={d.proj && d.proj <= 5 ? 'hl' : ''}>
                <td className="num"><Finish n={d.finish} /></td>
                <td className="sticky">
                  <div className="player-cell" onClick={() => openDriver(field.get(d.driver_id) || { ...d, win: undefined })}>
                    <Avatar d={d} size={24} />
                    <span>{d.name} <span className="muted small">#{d.car}</span></span>
                  </div>
                </td>
                <td className="num">{d.start || '—'}</td>
                {Array.from({ length: nSt }, (_, i) => <td key={i} className="num">{d.stages?.[i] ?? '—'}</td>)}
                {f1 ? <>
                  <td className="num">{d.q_pos ?? '—'}</td>
                  {x.sprint ? <td className="num">{d.sprint ?? '—'}</td> : null}
                  <td className="num">{d.points ?? 0}</td>
                </> : <>
                  <td className="num">{d.led || 0}</td>
                  <td className="num">{fx(d.rating, 1)}</td>
                  <td className="num">{fx(d.avg_ps, 1)}</td>
                  <td className="num">{d.fast ?? '—'}</td>
                </>}
                <td className="num">{d.win != null ? pct(d.win, 1) : '—'}</td>
                <td className="num">{d.proj ? ord(d.proj) : '—'}</td>
                <td className="num"><Vs proj={d.proj} fin={d.finish} /></td>
                <td className={d.status === 'Running' || d.status === 'Finished' || /^\+\d+ Laps?$/.test(d.status || '') ? 'muted small' : 'small'}>{d.status}{d.status !== 'Running' && d.status !== 'Finished' ? ` (${d.laps})` : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted small">{f1 ? 'Official results from Jolpica (F1).' : 'Official results and loop data from NASCAR.'} Highlighted rows = our top 5 projected finishers. ▲ = finished better than we projected. {r.source === 'replay' ? '"Replay" chances were never shown on the site — see Track Record.' : ''}</p>
      </>}
    </div>
  )
}

export default function Live({ card, series }) {
  const idx = useJson(`results/${series}/index.json`)
  const [pick, setPick] = useState({})            // per series: 'live' or a race_id
  const cur = pick[series] ?? 'live'
  const races = idx?.races || []
  return (
    <div>
      <div className="filters-row card filters race-picker">
        <label className="small muted" htmlFor="race-pick">Race</label>
        <select id="race-pick" value={cur} onChange={(e) => setPick({ ...pick, [series]: e.target.value === 'live' ? 'live' : Number(e.target.value) })}>
          <option value="live">🔴 Live timing{card?.race ? ` · next: ${card.race.track}` : ''}</option>
          {races.map((r) => <option key={r.race_id} value={r.race_id}>{dayLabel(r.date)} · {r.track} — {r.winner}</option>)}
        </select>
        {cur !== 'live' && <button className="pill" onClick={() => setPick({ ...pick, [series]: 'live' })}>Back to live</button>}
      </div>
      {cur === 'live' ? <LiveTiming card={card} series={series} /> : <Results key={`${series}:${cur}`} series={series} raceId={cur} card={card} />}
    </div>
  )
}
