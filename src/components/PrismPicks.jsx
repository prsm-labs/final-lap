import { pct, useJson } from '../lib/data.js'
import { openDriver } from '../lib/stores.js'
import { Avatar, PickButton } from './ui.jsx'

// 💎 PRISM Picks (2026-10-20, final-lap-2/build_prism_picks.py -> public/data/prism_picks.json): this race's few finishing
// props with the highest tested hit rates that aren't the obvious ones (drivers who are there every week are left out).
// The big number is the track record -- how often past PRISM Picks at that chance hit -- not the raw model chance.
const RESULT = { hit: '✅', miss: '✗', void: 'void' }
const share = (h, n) => (n ? `${Math.round((h / n) * 100)}%` : '—')

export default function PrismPicks({ card, series }) {
  const d = useJson('prism_picks.json')
  if (!d || d.error || !card) return null
  const g = series === 'f1' ? 'f1' : 'nascar'
  const rid = card.race.race_id ?? card.race.id
  const race = d.races.find((r) => r.series === series && r.race_id === rid)
  const byId = new Map(card.drivers.map((x) => [x.driver_id, x]))
  const picks = race?.picks || []
  const bt = d.backtest[g]
  const live = d.live[g]
  const past = d.races.filter((r) => r.series === series && r.race_id !== rid && r.picks.some((p) => p.result)).reverse()
  return (
    <div className="card prism-card">
      <div className="prism-head">
        <span className="prism-gem" aria-hidden="true">💎</span>
        <div>
          <div className="prism-title">PRISM Picks</div>
          <div className="muted small">This race's highest-hitting finishes that aren't the obvious ones</div>
        </div>
      </div>
      {picks.length === 0 && (
        <div className="muted small">
          None this race{card.stage !== 'post' ? ' yet — chances sharpen once qualifying sets the grid' : ''}. PRISM Picks only shows finishes at a {pct(d.rule.floor)}+ chance that have hit {share(bt.hits, bt.n)} of the time{card.race.ttype === 'ss' ? '; superspeedway packs rarely give anyone that kind of chance' : ''}.
        </div>
      )}
      {picks.map((c, i) => {
        const x = byId.get(c.driver_id) || c
        return (
          <div key={`${c.driver_id}-${c.prop}`} className="prism-row" onClick={() => openDriver(x)}>
            <span className="muted small">{i + 1}.</span>
            <Avatar d={x} size={34} />
            <div className="prism-main">
              <div className="prism-prop">{c.name} <span className="muted small">#{c.car} · {c.team}{c.start ? ` · starts P${c.start}` : ''}</span> {byId.has(c.driver_id) && <PickButton d={x} prop={c.prop} />}</div>
              <div className="prism-line">{c.label}{c.result ? <span className={`prism-result ${c.result}`}> {RESULT[c.result]}{c.actual != null ? ` (P${c.actual})` : ''}</span> : null}</div>
              <div className="muted small">{c.label.toLowerCase().replace(' finish', '')} in {c.last[1]} of his last {c.last[0]} races</div>
            </div>
            <div className="prism-stat" title={`Past PRISM Picks at a ${pct(c.chance)} chance hit ${pct(c.track)} (${c.trackN} picks; small samples lean on the chance itself, trimmed by how far past picks fell short of it). The model alone says ${pct(c.chance)}.`}>
              <b>{pct(c.track)}</b>
              <span className="muted small">track record</span>
              <span className="muted small">model {pct(c.chance)}</span>
            </div>
          </div>
        )
      })}
      <div className="prism-foot muted small">
        Track record ({g === 'f1' ? 'F1' : 'NASCAR, all three series'}): {bt.hits} of {bt.n} hit ({share(bt.hits, bt.n)}) over {bt.races} races, 2024-26, each race predicted from earlier races only
        {live.n ? ` · live: ${live.hits} of ${live.n} (${share(live.hits, live.n)})` : ''}.
        {g === 'nascar' ? ' The model said 84% on those picks — its top-end finishing chances run high — so the number shown is the track record.' : ''}
        {' '}Rule: top 3 / 5 / 10 at a {pct(d.rule.floor)}+ chance that the driver hit in {pct(d.rule.last_max)} or fewer of his last {d.rule.last_n} races (the every-week finishers are left out), with the model at least {Math.round(d.rule.margin * 100)} points above that; up to {d.rule.picks}, one per driver. Picks freeze at the start.
      </div>
      {past.length > 0 && (
        <details className="prism-past">
          <summary>Past races</summary>
          {past.map((r) => {
            const gr = r.picks.filter((p) => p.result === 'hit' || p.result === 'miss')
            return (
              <div key={r.race_id} className="prism-past-row">
                <b>{r.date.slice(5).replace('-', '/')} {r.name}</b> {gr.filter((p) => p.result === 'hit').length}/{gr.length}
                <span className="muted small"> {r.picks.map((p) => `${RESULT[p.result] || '…'} ${p.name} ${p.label}${p.actual != null ? ` (P${p.actual})` : ''}`).join(' · ')}</span>
              </div>
            )
          })}
        </details>
      )}
    </div>
  )
}
