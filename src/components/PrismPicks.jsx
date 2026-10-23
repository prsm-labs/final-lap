import { useState } from 'react'
import { pct, useJson } from '../lib/data.js'
import { openDriver } from '../lib/stores.js'
import { Avatar, PickButton } from './ui.jsx'

// 💎 PRISM Picks (2026-10-20, final-lap-2/build_prism_picks.py -> public/data/prism_picks.json): this race's few finishing
// props with the highest tested hit rates that aren't the obvious ones (drivers who are there every week are left out).
// The big number is the track record -- how often past PRISM Picks at that chance hit -- not the raw model chance.
const RESULT = { hit: '✅', miss: '✗', void: 'void' }
const share = (h, n) => (n ? `${Math.round((h / n) * 100)}%` : '—')
// 2026-10-23 pick levels (user: mid-range + long shots, all data-backed) -- race.tiers.mid / .long (NASCAR) from
// build_prism_picks.py, each with its own rule, walk-forward backtest and live record (d.tiers). Wins enter here.
const LEVELS = [
  { key: 'safe', label: '💎 PRISM Picks', sub: "This race's best looks on real finishes — not the ones a driver gets every week" },
  { key: 'mid', label: '⚖️ Mid-range', sub: 'Not too safe, not too risky' },
  { key: 'long', label: '🌠 Long shots', sub: 'If the stars align — about 1 in 5' },
]
const fair = (p) => (p >= 0.5 ? Math.round((-100 * p) / (1 - p)) : `+${Math.round((100 * (1 - p)) / p)}`)

export default function PrismPicks({ card, series }) {
  const [open, setOpen] = useState(false)
  const [lvl, setLevel] = useState('safe')
  const d = useJson('prism_picks.json')
  if (!d || d.error || !card) return null
  const g = series === 'f1' ? 'f1' : 'nascar'
  const rid = card.race.race_id ?? card.race.id
  const race = d.races.find((r) => r.series === series && r.race_id === rid)
  const byId = new Map(card.drivers.map((x) => [x.driver_id, x]))
  const level = g === 'f1' || !d.tiers ? 'safe' : lvl
  const list = (r) => (level === 'safe' ? r?.picks : r?.tiers?.[level]) || []
  const count = (k) => (k === 'safe' ? race?.picks : race?.tiers?.[k])?.length || 0
  const picks = list(race)
  const tier = level === 'safe' ? null : d.tiers[level]
  const L = LEVELS.find((x) => x.key === level)
  const bt = tier ? tier.backtest : d.backtest[g]
  const live = tier ? tier.live : d.live[g]
  const past = d.races.filter((r) => r.series === series && r.race_id !== rid && list(r).some((p) => p.result)).reverse()
  return (
    <div className={`card prism-card ${open ? 'open' : 'collapsed'}`}>
      <div className="prism-head">
        <span className="prism-gem" aria-hidden="true">💎</span>
        <div>
          <div className="prism-title">PRISM Picks</div>
          <div className="muted small">{L.sub}</div>
        </div>
        {/* 2026-10-22 (user): collapsed by default -- tap to expand */}
        <button type="button" className="prism-toggle" aria-expanded={open} onClick={() => setOpen((v) => !v)}>{open ? '▴ Hide' : `▾ Show${count('safe') + count('mid') + count('long') ? ` ${count('safe') + count('mid') + count('long')} picks` : ''}`}</button>
      </div>
      {g !== 'f1' && d.tiers && (
        <div className="pill-row" style={{ margin: '8px 0 4px' }}>
          {LEVELS.map((x) => <button key={x.key} type="button" className={`pill ${level === x.key ? 'active' : ''}`} onClick={() => setLevel(x.key)}>{x.label}{count(x.key) ? ` · ${count(x.key)}` : ''}</button>)}
        </div>
      )}
      {picks.length === 0 && tier && <div className="muted small">{race && !race.tiers ? 'Pick levels started 10/23/2026.' : `None at this level this race — it only shows looks like the ones that have hit ${share(bt.hits, bt.n)} of the time.`}</div>}
      {picks.length === 0 && !tier && (race?.waiting
        ? <div className="muted small"><b>Waiting for qualifying.</b> F1 picks post once the grid is set — before it, this rule hit only 57% in testing.</div>
        : <div className="muted small">
          None this race{card.stage !== 'post' ? ' yet — chances sharpen once qualifying sets the grid' : ''}. PRISM Picks only shows real finishes (ones the driver gets about half the time or less) at a {pct(d.rule.floor)}-{pct(d.rule.cap)} chance{card.race.ttype === 'ss' ? '; superspeedway packs rarely give anyone that kind of chance' : ''}.
        </div>)}
      {picks.map((c, i) => {
        const x = byId.get(c.driver_id) || c
        return (
          <div key={`${c.driver_id}-${c.prop}`} className="prism-row" onClick={() => openDriver(x)}>
            <span className="muted small">{i + 1}.</span>
            <Avatar d={x} size={34} />
            <div className="prism-main">
              <div className="prism-prop">{c.name} <span className="muted small">#{c.car} · {c.team}{c.start ? ` · starts P${c.start}` : ''}</span> {byId.has(c.driver_id) && <PickButton d={x} prop={c.prop} />}</div>
              <div className="prism-line">{c.label}{c.result ? <span className={`prism-result ${c.result}`}> {RESULT[c.result]}{c.actual != null ? ` (P${c.actual})` : ''}</span> : null}</div>
              <div className="muted small">{c.k === 1 ? 'won' : c.label.toLowerCase().replace(' finish', '')} in {c.last[1]} of his last {c.last[0]} races{tier ? ` · race card ${pct(c.card)} · fair ${fair(c.chance)} · about 1 in ${Math.round(1 / c.track)}` : ''}</div>
            </div>
            <div className="prism-stat" title={`Past ${tier ? tier.label.toLowerCase() : 'PRISM Picks'} at a ${pct(c.chance)} chance hit ${pct(c.track)} (${c.trackN} picks; small samples lean on the chance itself, trimmed by how far past picks fell short of it). The model alone says ${pct(c.chance)}.`}>
              <b>{pct(c.track)}</b>
              <span className="muted small">track record</span>
              <span className="muted small">model {pct(c.chance)}</span>
            </div>
          </div>
        )
      })}
      {tier && (
        <div className="prism-foot muted small">
          Track record (NASCAR, all three series): {bt.hits} of {bt.n} hit ({share(bt.hits, bt.n)}, the model said {pct(bt.said)}) over {bt.races} races, 2024-26, each race predicted from earlier races only
          {live.n ? ` · live: ${live.hits} of ${live.n} (${share(live.hits, live.n)})` : ' · live record starts this weekend'}. On those same finishes the drivers' own last-10 rate was {Math.round(bt.own * 1000) / 10}%.
          {' '}Rule: a win, top 3, top 5 or top 10 the driver got in {pct(tier.rule.real)} or fewer of his last {d.rule.last_n} races, where the model gives him {pct(tier.rule.floor)} to {pct(tier.rule.cap)}; up to {d.rule.picks} a race, one per driver, {tier.rule.stat_cap} per finish, nobody in two levels. The chance is the race card's, recalibrated on past races against how often he got that finish lately (it trims drivers the card likes but who haven't been getting there). No sportsbook prices for motorsport. Picks freeze at the start.
        </div>
      )}
      {!tier && <div className="prism-foot muted small">
        Track record ({g === 'f1' ? 'F1' : 'NASCAR, all three series'}): {bt.hits} of {bt.n} hit ({share(bt.hits, bt.n)}) over {bt.races} races, 2024-26, each race predicted from earlier races only
        {live.n ? ` · live: ${live.hits} of ${live.n} (${share(live.hits, live.n)})` : ''}.
        {' '}Rule: real finishes only — top 3 / 5 / 10 that the driver got in {pct(d.rule.last_max)} or fewer of his last {d.rule.last_n} races — where the model gives him {pct(d.rule.floor)} to {pct(d.rule.cap)}{g === 'f1' ? ', after qualifying' : ''}; up to {d.rule.picks}, one per driver. No sportsbook prices for motorsport in our odds feed. Picks freeze at the start.
      </div>}
      {past.length > 0 && (
        <details className="prism-past">
          <summary>Past races</summary>
          {past.map((r) => {
            const gr = list(r).filter((p) => p.result === 'hit' || p.result === 'miss')
            return (
              <div key={r.race_id} className="prism-past-row">
                <b>{r.date.slice(5).replace('-', '/')} {r.name}</b> {gr.filter((p) => p.result === 'hit').length}/{gr.length}
                <span className="muted small"> {list(r).map((p) => `${RESULT[p.result] || '…'} ${p.name} ${p.label}${p.actual != null ? ` (P${p.actual})` : ''}`).join(' · ')}</span>
              </div>
            )
          })}
        </details>
      )}
    </div>
  )
}
