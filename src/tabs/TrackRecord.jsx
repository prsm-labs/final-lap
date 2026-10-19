import { useState } from 'react'
import { dayLabel, fx, pct, useJson } from '../lib/data.js'
import { Finish, Pills, Section } from '../components/ui.jsx'

// 📈 Track Record -- how Final Lap 2.0 has actually done. "Live" = picks frozen before the green flag; "Replay" = the 2026
// races before launch, re-predicted with only what was known before each race. Never mixed.
function Summary({ s }) {
  if (!s) return <p className="muted">Nothing graded yet — the first live race is graded the morning after it runs.</p>
  const tiles = [
    ['Races', s.races], ['Favorite won', pct(s.fav_won)], ['Favorite\'s avg chance', pct(s.fav_said)],
    ['Favorite top 5', pct(s.fav_top5)], ['Top-3 picks in top 3', `${fx(s.top3_hits, 2)} / 3`],
    ['Top-5 picks in top 5', `${fx(s.top5_hits, 2)} / 5`], ['Top-10 picks in top 10', `${fx(s.top10_hits, 2)} / 10`],
    ['Winner in our top 5', pct(s.winner_in_top5_picks)],
  ]
  return (
    <>
      <div className="tile-grid">{tiles.map(([l, v]) => <div key={l} className="tile"><b>{v}</b><span>{l}</span></div>)}</div>
      {s.calibration_win && (
        <div className="grid-cards">
          <div className="card"><div className="cheat-title">Win chances: what we said vs. what happened</div>
            <table className="mini"><thead><tr><th>We said</th><th>They won</th><th>Driver-races</th></tr></thead>
              <tbody>{s.calibration_win.map((c, i) => <tr key={i}><td>{pct(c.said, 1)}</td><td>{pct(c.won, 1)}</td><td>{c.n}</td></tr>)}</tbody></table>
          </div>
          <div className="card"><div className="cheat-title">Top-10 chances: what we said vs. what happened</div>
            <table className="mini"><thead><tr><th>We said</th><th>Top 10</th><th>Driver-races</th></tr></thead>
              <tbody>{s.calibration_top10.map((c, i) => <tr key={i}><td>{pct(c.said)}</td><td>{pct(c.won)}</td><td>{c.n}</td></tr>)}</tbody></table>
          </div>
        </div>
      )}
    </>
  )
}

function Races({ races }) {
  if (!races?.length) return null
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead><tr><th>Date</th><th className="sticky">Race</th><th>Our pick</th><th>Fin</th><th>Winner</th><th title="Our win chance for the winner, and where he ranked in our list">Winner's % (rank)</th><th>Top 5</th><th>Top 10</th></tr></thead>
        <tbody>
          {races.map((r) => (
            <tr key={r.race_id}>
              <td className="num">{dayLabel(r.date)}</td>
              <td className="sticky">{r.track}<div className="muted small">{r.name}</div></td>
              <td>{r.pick} <span className="muted small">{pct(r.pick_win)}</span></td>
              <td><Finish n={r.pick_finish} /></td>
              <td>{r.winner}</td>
              <td className="num">{pct(r.winner_win, 1)} <span className="muted small">(#{r.winner_rank})</span></td>
              <td className="num" title={r.top5_picks?.map((p) => `${p.name}: ${p.finish}`).join('\n')}>{r.top5_hits}/5</td>
              <td className="num">{r.top10_hits}/10</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function TrackRecord({ series }) {
  const tr = useJson(`${series}/track_record.json`)
  const [view, setView] = useState('replay')
  if (!tr) return <p className="muted">Loading track record…</p>
  const v = view === 'live' ? tr.live : tr.replay
  const bt = tr.backtest?.post || {}
  return (
    <div>
      <Section title={`📈 ${tr.label} Track Record`} sub="Every number here is graded against official NASCAR results." />
      <Pills value={view} onChange={setView} options={[
        ['live', `Live (${tr.live?.races?.length || 0})`, 'Picks frozen before the green flag, graded after the race'],
        ['replay', `2026 replay (${tr.replay?.races?.length || 0})`, 'Races before launch, re-predicted using only what was known before each race'],
      ]} />
      <p className="note">{view === 'live'
        ? 'Live: the picks you saw on the site, frozen at the green flag. Drivers who raced but weren\'t in our field count as 0%.'
        : 'Replay: Final Lap 2.0 launched Oct 2026. For earlier 2026 races, the model was fit only on 2023-2025 and given only what was known before each race (after qualifying). It shows how the model would have done — it is not a record of picks shown at the time.'}</p>
      <Summary s={v?.summary} />
      <Races races={v?.races} />
      {Object.keys(bt).length > 0 && (
        <div className="card">
          <div className="cheat-title">Backtest by season (after qualifying, each season predicted from earlier seasons only)</div>
          <div className="mini-scroll">
            <table className="mini">
              <thead><tr><th>Season</th><th>Races</th><th>Fav won</th><th>Fav said</th><th>Top 3</th><th>Top 5</th><th>Top 10</th><th>Win AUC</th><th>Top-10 AUC</th></tr></thead>
              <tbody>{Object.entries(bt).map(([y, b]) => (
                <tr key={y}><td>{y}</td><td>{b.races}</td><td>{pct(b.fav_won)}</td><td>{pct(b.fav_said)}</td><td>{fx(b.top3_hits, 2)}/3</td><td>{fx(b.top5_hits, 2)}/5</td><td>{fx(b.top10_hits, 2)}/10</td><td>{fx(b.auc_win, 3)}</td><td>{fx(b.auc_top10, 3)}</td></tr>
              ))}</tbody>
            </table>
          </div>
          <div className="muted small">AUC: how well the order of our chances matches what happened (0.5 = coin flip, 1.0 = perfect).</div>
        </div>
      )}
    </div>
  )
}
