import { useContext, useEffect } from 'react'
import { fx, ord, pct, useJson } from '../lib/data.js'
import { closeDriver, seriesStore, slideStore } from '../lib/stores.js'
import { Avatar, PickButton, RaceCtx, Tags } from './ui.jsx'

// Driver slideout (Slap Shot's global slideout): this race's chances, finishing spread, loop-data rating by track type,
// last 10 finishes, this-track history and the season line.
const TYPES = [['ss', 'Superspeedway'], ['int', 'Intermediate'], ['short', 'Short Track'], ['road', 'Road / Street']]

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const md = (s) => `${+s.slice(5, 7)}/${+s.slice(8, 10)}`                    // 2026-10-05 -> 10/5
const monYr = (s) => `${MON[+s.slice(5, 7) - 1]} '${s.slice(2, 4)}`          // 2025-04-27 -> Apr '25
const longDate = (s) => `${MON[+s.slice(5, 7) - 1]} ${+s.slice(8, 10)}, ${s.slice(0, 4)}`

// dates[i] = 'YYYY-MM-DD' or ['YYYY-MM-DD', track] (older data files have no dates: bars show without labels)
function FinishBars({ list, dates, label, title, note }) {
  if (!list?.length) return null
  const at = (i) => { const v = dates?.[i]; return Array.isArray(v) ? v : v ? [v, null] : [null, null] }
  return (
    <div className="stat-chart">
      <div className="stat-chart-head"><b>{title}</b><span className="muted small">{note}</span></div>
      <div className="bars">
        {list.map((f, i) => {
          const [dt, trk] = at(i)
          return (
            <div key={i} className="bar" title={`Finished ${ord(f)}${trk ? ` · ${trk}` : ''}${dt ? ` · ${longDate(dt)}` : ''}`}>
              <span className="bar-v">{f}</span>
              <span className={`bar-fill ${f <= 10 ? 'hit' : ''}`} style={{ height: `${Math.max(4, ((41 - Math.min(f, 40)) / 40) * 80)}%` }} />
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

export default function DriverSlideout() {
  const d = slideStore.use()
  const series = seriesStore.use()
  const ctx = useContext(RaceCtx)
  const table = useJson(`${series}/drivers.json`)
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && closeDriver()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])
  if (!d) return null
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
            <h2>{d.name}</h2>
            <div className="muted">#{d.car || '—'} · {d.team || '—'}{d.make ? ` · ${d.make}` : ''}</div>
            <div className="slide-actions">{d.win != null && <PickButton d={d} />} <Tags d={d} /></div>
          </div>
          <button className="slide-close" onClick={closeDriver} aria-label="Close">×</button>
        </header>
        <div className="slide-body">
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
          <h3>Driver rating by track type <span className="muted small">(NASCAR loop data, last 3 seasons, this series)</span></h3>
          <div className="spread">
            {TYPES.map(([k, l]) => (
              <div key={k} className={`spread-row ${ctx?.ttype === k ? 'b' : ''}`}><span>{l}</span>
                <span className="spread-bar"><span style={{ width: `${types[k] ? (types[k] / maxType) * 100 : 0}%` }} /></span><b>{fx(types[k], 0)}</b></div>
            ))}
          </div>
          <p className="muted small">Driver rating sums speed, running position, laps led and finish every lap (max 150; ~100 = a top-5 car).</p>
          <div className="chart-grid">
            <FinishBars list={d.last10} dates={d.last10_d} label={md} title="Last 10 races"
              note={d.last10?.length ? `${span(d.last10_d)}${d.last10_d ? ' · ' : ''}avg ${fx(d.last10.reduce((a, b) => a + b, 0) / d.last10.length)}` : ''} />
            <FinishBars list={d.trk_fins} dates={d.trk_d} label={monYr} title="This track" note={d.trk_fins?.length ? `${d.trk_fins.length} starts since 2022` : 'no starts here'} />
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
                <thead><tr><th>Starts</th><th>Wins</th><th>Top 5</th><th>Top 10</th><th>Avg fin</th><th>Rating</th><th>Laps led</th><th>Pts rank</th></tr></thead>
                <tbody><tr><td>{row.starts}</td><td>{row.wins}</td><td>{row.top5}</td><td>{row.top10}</td><td>{fx(row.avg_finish)}</td><td>{fx(row.rating, 0)}</td><td>{row.led}</td><td>{row.pts_rank}</td></tr></tbody>
              </table></div>
            </>
          )}
          <p className="muted small">Chances come from a model tested on 2024-2026 races it never saw. Projections, not guarantees. No sportsbook odds are used.</p>
        </div>
      </aside>
    </>
  )
}
