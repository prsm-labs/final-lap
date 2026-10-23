import { useMemo, useState } from 'react'
import { pct, useJson } from '../lib/data.js'
import { buildPairs, fmtAmerican, LEG_FILTERS, LEGS, MODES, relText, STAR_TOP } from '../lib/pairs.js'
import { openDriver, SERIES } from '../lib/stores.js'
import { Avatar, PickButton, Section, Tags } from './ui.jsx'

// 🤝 Pairs on the Race Card (2026-10-23, user: CourtIQ / Slap Shot / Six Points have a Pairs page) -- lib/pairs.js.
const DAY = 86400000

function Leg({ l, here }) {
  const d = l.d
  const L = LEGS[l.leg]
  const lbl = SERIES.find((s) => s.key === l.series)?.label
  return (
    <div className="pair-leg">
      <Avatar d={d} size={34} />
      <div className="pair-leg-main">
        <div className="pair-leg-name">
          <span className="pair-name" onClick={() => here && openDriver(d)}>{d.name}</span>
          <span className="muted small"> #{d.car || '—'} · {d.team || '—'}</span> {here ? <Tags d={d} /> : <span className="chip small">{lbl} · {l.race?.track}</span>}
        </div>
        <div className="small">{L.emoji} {L.label} <b>{pct(l.chance, 1)}</b> <span className="muted">· win {pct(d.win, 1)}</span></div>
      </div>
      {here && <PickButton d={d} prop={l.leg} />}
    </div>
  )
}

function PairCard({ pr, series }) {
  const [a, b] = pr.legs
  const atLeastOne = 1 - (1 - a.chance) * (1 - b.chance)
  return (
    <div className={`card pair-card ${pr.starRank ? 'star' : ''}`}>
      <div className="pair-head">
        <span className="pair-section">{pr.section}</span>
        {pr.starRank && <span className="pair-star" title={`Among the strongest ${STAR_TOP} same-race pairs on this card for their two finishes`}>★{pr.starRank} BEST</span>}
      </div>
      {pr.legs.map((l) => <Leg key={`${l.series}-${l.d.driver_id}-${l.leg}`} l={l} here={l.series === series} />)}
      <div className="pair-foot">
        <div><b>Both hit {pct(pr.chance, 1)}</b> <span className="muted small">· at least one {pct(atLeastOne, 0)} · fair {fmtAmerican(pr.fair)}</span></div>
        <div className="muted small">{relText(pr)}</div>
      </div>
    </div>
  )
}

export default function Pairs({ card, series }) {
  const [mode, setMode] = useState('balanced')
  const [leg, setLeg] = useState(null)
  const [stars, setStars] = useState(false)
  const cup = useJson('cup/next.json')
  const xfin = useJson('oreilly/next.json')
  const truck = useJson('truck/next.json')
  const t0 = Date.parse(card.race?.date)
  const others = [cup, xfin, truck].filter((c) => c?.race && c.series !== series && Math.abs(Date.parse(c.race.date) - t0) <= 3 * DAY)
  const pairs = useMemo(() => buildPairs(card, { mode, leg, others }), [card, mode, leg, others.length]) // eslint-disable-line react-hooks/exhaustive-deps
  const shown = stars ? pairs.filter((pr) => pr.starRank).sort((x, y) => x.starRank - y.starRank) : pairs
  const modes = MODES.filter((m) => m.key !== 'across' || others.length)
  return (
    <>
      <Section title="🤝 Pairs" sub="Two drivers, both finishing where the leg says" />
      <div className="note">
        🤝 Two-driver pairs from this card's top-3, top-5 and top-10 chances. Both-hit chance = leg × leg × how two finishes in one
        race move together, measured on every 2024-26 NASCAR race with each season predicted by a model fit on earlier seasons:
        two podium legs hit together <b>29% less</b> often than independent (only three spots), a podium + top-5 / top-10 leg 8% less,
        while two top-5 legs (+7%) and a top-5 + top-10 (+8%) hit together <b>more</b> — strong cars run up front together. Two
        top-10s: no steady link. Teammates are no different. Held out, these beat treating the legs as independent in 5 of 6
        series-seasons. Win legs are left out. Pairs freeze with the pre-green snapshot and are graded in Track Record. Not a lock.
      </div>
      <div className="pill-row">{modes.map((m) => <button key={m.key} className={`pill ${mode === m.key ? 'active' : ''}`} onClick={() => setMode(m.key)}>{m.label}</button>)}</div>
      <div className="pill-row">
        {LEG_FILTERS.map((f) => <button key={String(f.key)} className={`pill ${leg === f.key ? 'active' : ''}`} onClick={() => setLeg(f.key)}>{f.label}</button>)}
        <button className={`pill ${stars ? 'active' : ''}`} onClick={() => setStars((v) => !v)}>★ Best {STAR_TOP}</button>
      </div>
      <p className="muted small">{MODES.find((m) => m.key === mode)?.blurb}</p>
      <div className="grid-cards">
        {shown.length === 0 && <p className="muted">No pairs for this mode clear an 8% both-hit chance on this card{card.race?.ttype === 'ss' ? ' — superspeedways spread the top-3 / top-5 chances too thin' : ''}.</p>}
        {shown.map((pr) => <PairCard key={pr.key} pr={pr} series={series} />)}
      </div>
    </>
  )
}
