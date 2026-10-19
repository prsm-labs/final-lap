import { pct, raceTime, TYPE_ICON } from '../lib/data.js'
import { openDriver } from '../lib/stores.js'
import { Avatar, DriverCell, PickButton, Prob, Section } from '../components/ui.jsx'

// 🏁 Race Card -- this weekend's race, the locked-style Top Picks tiers, and Slap Shot-style cheat sheets.
export function RaceHeader({ card }) {
  const r = card.race
  return (
    <div className="race-head card">
      <div className="race-title">{TYPE_ICON[r.ttype]} {r.name}</div>
      <div className="race-sub">{r.track} · {r.type}{r.length ? ` · ${r.length} mi` : ''}{r.laps ? ` · ${r.laps} laps` : ''}</div>
      <div className="race-sub muted">{raceTime(r.start)} your time{r.tv ? ` · ${r.tv}` : ''}{r.playoff ? ' · Playoffs' : ''}</div>
      <div className="race-meta">
        <span className={`chip ${card.stage === 'post' ? 'ok' : ''}`} title={card.stage === 'post' ? 'Starting spots are in the model' : 'Qualifying not run yet -- chances update once starting spots post'}>
          {card.stage === 'post' ? '✅ After qualifying' : '⏳ Before qualifying'}
        </span>
        <span className="chip" title="Where tonight's field comes from">{card.field_source === 'projected field' ? '📋 Projected field (entry list not out yet)' : `📋 ${card.drivers.length} entered`}</span>
        <span className="muted small">Updated {new Date(card.built).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' })}</span>
      </div>
    </div>
  )
}

function TopPicks({ card }) {
  const byId = new Map(card.drivers.map((d) => [d.driver_id, d]))
  return (
    <div className="grid-cards">
      {card.picks.map((t) => (
        <div key={t.tier} className="card top-pick">
          <div className="top-tier">{t.tier}</div>
          <div className="muted small">{t.title}</div>
          {t.drivers.map((x) => {
            const d = byId.get(x.driver_id) || x
            return (
              <div key={x.driver_id} className="top-head" onClick={() => openDriver(d)}>
                <Avatar d={d} size={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="top-name">{d.name} <PickButton d={d} prop={t.key === 'win' ? 'win' : t.key} /></div>
                  <div className="muted small">#{d.car} · {d.team} · win {pct(d.win, 1)}</div>
                </div>
                <div className="top-chance">{pct(x.chance)}</div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function Sheet({ title, sub, rows, stat, label, prop = 'win' }) {
  if (!rows.length) return null
  return (
    <div className="card">
      <div className="cheat-title">{title}</div>
      <div className="muted small">{sub}</div>
      {rows.map((d) => (
        <div key={d.driver_id} className="cheat-row">
          <div className="cheat-main"><DriverCell d={d} prop={prop} /></div>
          <div className="cheat-stat" title={label}><Prob v={d[stat]} strong={stat === 'win' ? 0.15 : 0.5} /></div>
        </div>
      ))}
    </div>
  )
}

export default function RaceCard({ card }) {
  const ds = card.drivers
  const by = (k) => [...ds].sort((a, b) => b[k] - a[k])
  const ss = card.race.ttype === 'ss'
  return (
    <div>
      <RaceHeader card={card} />
      {ss && <p className="note">🌪️ Superspeedway: pack racing and big wrecks make these the most random races of the year — even the favorite rarely tops ~10%. Top-10 chances are the steadier play here.</p>}
      <Section title="🏆 Top Picks" sub="One driver per tier. The win pick is the highest win chance; the rest are the best remaining drivers for each finish." />
      <TopPicks card={card} />
      <Section title="📋 Cheat Sheets" sub="Quick reads from the full projections" />
      <div className="grid-cards">
        <Sheet title="🏁 Most likely winners" sub="Highest win chance" rows={by('win').slice(0, 8)} stat="win" label="Win chance" />
        <Sheet title="🥉 Podium chances" sub="Best chance of a top-3 finish" rows={by('top3').slice(0, 8)} stat="top3" label="Top-3 chance" prop="top3" />
        <Sheet title="🔟 Top-10 locks" sub="Top-10 chance of 60% or better" rows={by('top10').filter((d) => d.top10 >= 0.6).slice(0, 10)} stat="top10" label="Top-10 chance" prop="top10" />
        <Sheet title="📍 Track aces" sub="Run much better at this track than their usual level" rows={by('top10').filter((d) => d.tags?.some((t) => t.key === 'track')).slice(0, 8)} stat="top10" label="Top-10 chance" prop="top10" />
        <Sheet title="🛣️ Track-type specialists" sub={`Rate well above their usual on ${card.race.type.toLowerCase()} tracks`} rows={by('top10').filter((d) => d.tags?.some((t) => t.key === 'type')).slice(0, 8)} stat="top10" label="Top-10 chance" prop="top10" />
        <Sheet title="🐎 Darkhorses" sub="Best win chance outside the top 8 favorites" rows={by('win').slice(8, 14)} stat="win" label="Win chance" />
      </div>
    </div>
  )
}
