import { useContext, useEffect } from 'react'
import ProfileLinks from './ProfileLinks.jsx'
import { fx, ord, pct, useJson, useLive } from '../lib/data.js'
import { closeDriver, isF1, seriesStore, slideStore } from '../lib/stores.js'
import { Avatar, PickButton, RaceCtx, Tags } from './ui.jsx'

// Driver slideout (Slap Shot's global slideout): this race's chances, finishing spread, loop-data rating by track type,
// last 10 finishes, this-track history and the season line.
const NASCAR_TYPES = [['ss', 'Superspeedway'], ['int', 'Intermediate'], ['short', 'Short Track'], ['road', 'Road / Street']]
const F1_TYPES = [['street', 'Street circuit'], ['fast', 'High-speed'], ['tech', 'High-downforce'], ['perm', 'Balanced']]

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const md = (s) => `${+s.slice(5, 7)}/${+s.slice(8, 10)}`                    // 2026-10-05 -> 10/5
const monYr = (s) => `${MON[+s.slice(5, 7) - 1]} '${s.slice(2, 4)}`          // 2025-04-27 -> Apr '25
const longDate = (s) => `${MON[+s.slice(5, 7) - 1]} ${+s.slice(8, 10)}, ${s.slice(0, 4)}`

// dates[i] = 'YYYY-MM-DD' or ['YYYY-MM-DD', track] (older data files have no dates: bars show without labels)
function FinishBars({ list, dates, label, title, note, floor = 40, liveLast = null }) {
  if (!list?.length) return null
  const at = (i) => { const v = dates?.[i]; return Array.isArray(v) ? v : v ? [v, null] : [null, null] }
  return (
    <div className="stat-chart">
      <div className="stat-chart-head"><b>{title}</b><span className="muted small">{note}</span></div>
      <div className="bars">
        {list.map((f, i) => {
          const [dt, trk] = at(i)
          return (
            <div key={i} className="bar" title={`${liveLast && i === list.length - 1 ? (liveLast === 'live' ? 'Running' : 'Finished') : 'Finished'} ${ord(f)}${trk ? ` · ${trk}` : ''}${dt ? ` · ${longDate(dt)}` : ''}`}>
              <span className={`bar-v ${liveLast && i === list.length - 1 ? 'today' : ''}`}>{f}</span>
              <span className={`bar-fill ${f <= 10 ? 'hit' : ''} ${liveLast && i === list.length - 1 ? `today ${liveLast}` : ''}`} style={{ height: `${Math.max(4, ((floor + 1 - Math.min(f, floor)) / floor) * 80)}%` }} />
            </div>
          )
        })}
      </div>
      {dates?.length === list.length && (
        <div className="bar-dates">{list.map((_, i) => <span key={i}>{at(i)[0] ? label(at(i)[0]) : ''}</span>)}</div>
      )}
    </div>
  )
}

const span = (dates) => {   // "Apr – Oct 2026" / "Sep 2025 – Oct 2026"
  const ds = (dates || []).map((v) => (Array.isArray(v) ? v[0] : v)).filter(Boolean)
  if (!ds.length) return ''
  const [a, b] = [ds[0], ds[ds.length - 1]]
  return a.slice(0, 4) === b.slice(0, 4)
    ? `${MON[+a.slice(5, 7) - 1]} – ${MON[+b.slice(5, 7) - 1]} ${b.slice(0, 4)}`
    : `${MON[+a.slice(5, 7) - 1]} ${a.slice(0, 4)} – ${MON[+b.slice(5, 7) - 1]} ${b.slice(0, 4)}`
}

// 2026-10-20 live slideout: while this race weekend's session is on track (NASCAR live feed / ESPN F1, 15 s), the driver's
// running position, laps led, pit stops (practice / qualifying: best lap and speed); after the checkered flag his finish,
// which also joins the Last 10 chart until the pipeline adds it. Polls only with the slideout open on race weekend.
const foldName = (s) => String(s || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
function useLiveRun(d, ctx, f1) {
  const weekend = !!(d && ctx?.date && Math.abs(new Date(`${ctx.date}T12:00:00`) - Date.now()) < 3 * 86400e3)
  const live = useLive(weekend, 15000, f1 ? '/api/f1live' : '/api/live')
  if (!weekend || !live || live.error || !live.vehicles?.length) return null
  const ours = f1 ? true : live.race_id === ctx.raceId
  if (!ours) return null
  const v = live.vehicles.find((x) => (f1 ? foldName(x.name) === foldName(d.name) : x.driver_id === d.driver_id))
  if (!v) return null
  const done = live.flag_state === 9 || live.flag_state === 4 || live.flag === 'Finished'
  return { live, v, done, isRace: live.run_type === 3, field: live.vehicles.length }
}
function LiveRun({ r, d, f1 }) {
  const { live, v, done, isRace } = r
  const delta = isRace && d.proj_finish ? d.proj_finish - v.pos : null
  const tiles = isRace
    ? [[done ? 'FINISH' : 'RUNNING', ord(v.pos)], ['PROJ', ord(d.proj_finish)], ...(f1 ? [] : [['START', ord(v.start)], ['LED', v.led ?? 0], ['PITS', v.pits ?? 0], ['AVG POS', fx(v.avgPos)]])]
    : [['POS', ord(v.pos)], ...(f1 ? [] : [['BEST LAP', v.best ? fx(v.best, 3) : '—'], ['SPEED', v.bestSpeed ? fx(v.bestSpeed, 2) : '—'], ['LAPS', v.laps ?? 0]])]
  return (
    <div className={`today-card ${done ? '' : 'live'}`}>
      <div className="today-head">
        {done ? <span className="final-tag">{isRace ? '🏁 FINAL' : 'SESSION OVER'}</span> : <span className="live-tag"><span className="court-dot" />LIVE</span>}
        <b>{live.name}</b>
        {!done && <span className="muted small">{isRace ? (live.laps ? `Lap ${live.lap}/${live.laps}` : live.lap ? `Lap ${live.lap}` : '') : 'Practice / qualifying'} · {live.flag}</span>}
      </div>
      <div className="stat-tiles">
        {tiles.map(([l, val]) => <div key={l} className={`tile ${l === 'RUNNING' || l === 'FINISH' ? (delta > 0 ? 'beat' : '') : ''}`}><b>{val}</b><span>{l}</span></div>)}
      </div>
      <p className="muted small">
        {isRace && delta != null ? `${delta > 0 ? `${fx(delta, 0)} spots better than` : delta < 0 ? `${fx(-delta, 0)} spots worse than` : 'Right on'} our projected finish. ` : ''}
        {!f1 && v.status && v.status !== 0 && v.status !== 1 ? 'Out of the race / off track. ' : ''}
        {done ? (isRace ? 'Final running order from the live feed (official results follow in the pipeline).' : 'Final session order.') : 'Updates every 15 seconds.'}
      </p>
    </div>
  )
}

export default function DriverSlideout() {
  const d = slideStore.use()
  const series = seriesStore.use()
  const ctx = useContext(RaceCtx)
  const run = useLiveRun(d, ctx, isF1(series))
  const table = useJson(`${series}/drivers.json`)
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && closeDriver()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])
  if (!d) return null
  const f1 = isF1(series)
  const TYPES = f1 ? F1_TYPES : NASCAR_TYPES
  const row = table?.drivers?.find((x) => x.driver_id === d.driver_id)
  const types = row?.types || {}
  const maxType = Math.max(60, ...Object.values(types).filter((v) => v != null))
  const spread = [['Win', d.win], ['2nd', d.p2], ['3rd', d.p3], ['Top 5', d.top5], ['Top 10', d.top10]]
  return (
    <>
      <div className="slide-backdrop" onClick={closeDriver} />
      <aside className="slide" role="dialog" aria-label={d.name}>
        <header className="slide-head">
          <Avatar d={d} size={64} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2>{d.name}<ProfileLinks name={d.name} f1={f1} /></h2>
            <div className="muted">#{d.car || '—'} · {d.team || '—'}{d.make ? ` · ${d.make}` : ''}</div>
            <div className="slide-actions">{d.win != null && <PickButton d={d} />} <Tags d={d} /></div>
          </div>
          <button className="slide-close" onClick={closeDriver} aria-label="Close">×</button>
        </header>
        <div className="slide-body">
          {run && <><h3 style={{ marginTop: 0 }}>{run.isRace ? 'This race' : 'On track now'}</h3><LiveRun r={run} d={d} f1={f1} /><h3>Pre-race projection</h3></>}
          {d.win != null && (
            <>
              <div className="stat-tiles">
                {[['WIN', pct(d.win, 1)], ['TOP 3', pct(d.top3)], ['TOP 5', pct(d.top5)], ['TOP 10', pct(d.top10)], ['PROJ', ord(d.proj_finish)], ['START', d.start ? ord(d.start) : '—']].map(([l, v]) => (
                  <div key={l} className="tile"><b>{v}</b><span>{l}</span></div>
                ))}
              </div>
              <p className="muted small">{ctx ? `${ctx.race} · ${ctx.track}. ` : ''}Average simulated finish {fx(d.avg)} (20,000 simulated races).</p>
              <h3>Finishing chances</h3>
              <div className="spread">
                {spread.map(([l, v]) => (
                  <div key={l} className="spread-row"><span>{l}</span><span className="spread-bar"><span style={{ width: `${Math.min(100, (v || 0) * 100)}%` }} /></span><b>{pct(v, 1)}</b></div>
                ))}
              </div>
            </>
          )}
          <h3>Driver rating by track type <span className="muted small">{f1 ? '(qualifying + finish against the field, last 3 seasons)' : '(NASCAR loop data, last 3 seasons, this series)'}</span></h3>
          <div className="spread">
            {TYPES.map(([k, l]) => (
              <div key={k} className={`spread-row ${ctx?.ttype === k ? 'b' : ''}`}><span>{l}</span>
                <span className="spread-bar"><span style={{ width: `${types[k] ? (types[k] / maxType) * 100 : 0}%` }} /></span><b>{fx(types[k], 0)}</b></div>
            ))}
          </div>
          <p className="muted small">{f1 ? 'Rating 0-100: where he qualified and finished against the field (100 = pole and the win every time).' : 'Driver rating sums speed, running position, laps led and finish every lap (max 150; ~100 = a top-5 car).'}</p>
          <div className="chart-grid">
            {(() => {
              // this race's running / final position joins the chart until the pipeline's results include it
              const lastD = d.last10_d?.length ? (Array.isArray(d.last10_d.at(-1)) ? d.last10_d.at(-1)[0] : d.last10_d.at(-1)) : null
              const add = run?.isRace && ctx?.date && lastD !== ctx.date
              const list = add ? [...(d.last10 || []), run.v.pos].slice(-10) : d.last10
              const dates = add && d.last10_d ? [...d.last10_d, ctx.date].slice(-10) : d.last10_d
              return (
                <FinishBars floor={f1 ? 22 : 40} list={list} dates={dates} label={md} title={add ? 'Last 10 races + this one' : 'Last 10 races'} liveLast={add ? (run.done ? 'final' : 'live') : null}
                  note={list?.length ? `${span(dates)}${dates ? ' · ' : ''}avg ${fx(list.reduce((a, b) => a + b, 0) / list.length)}` : ''} />
              )
            })()}
            <FinishBars floor={f1 ? 22 : 40} list={d.trk_fins} dates={d.trk_d} label={monYr} title="This track" note={d.trk_fins?.length ? `${d.trk_fins.length} starts since ${f1 ? 2021 : 2022}` : 'no starts here'} />
          </div>
          {d.chaos?.n > 0 && d.chaos.calm_n > 0 && (
            <p className="muted small" title="Chaos race = the series' top third of races by cautions + cars out in accidents (2022-26). Context only: tested as a model input and it added nothing.">
              🌪️ Chaos races: avg finish {fx(d.chaos.avg)} in {d.chaos.n} vs {fx(d.chaos.calm_avg)} in {d.chaos.calm_n} calm races ·{' '}
              against drivers at his level, {d.chaos.spots >= 0 ? `${fx(d.chaos.spots)} spots better` : `${fx(-d.chaos.spots)} spots worse`} in chaos races than in calm ones · context only
            </p>
          )}
          {row && (
            <>
              <h3>This season</h3>
              <div className="mini-scroll"><table className="mini">
                <thead><tr><th>Starts</th><th>Wins</th>{f1 && <th>Podiums</th>}<th>Top 5</th><th>Top 10</th><th>Avg fin</th><th>Rating</th>{f1 ? <th>Points</th> : <th>Laps led</th>}<th>Pts rank</th></tr></thead>
                <tbody><tr><td>{row.starts}</td><td>{row.wins}</td>{f1 && <td>{row.top3}</td>}<td>{row.top5}</td><td>{row.top10}</td><td>{fx(row.avg_finish)}</td><td>{fx(row.rating, 0)}</td><td>{f1 ? row.points : row.led}</td><td>{row.pts_rank}</td></tr></tbody>
              </table></div>
            </>
          )}
          <p className="muted small">Chances come from a model tested on 2024-2026 races it never saw. Projections, not guarantees. No sportsbook odds are used.</p>
        </div>
      </aside>
    </>
  )
}
