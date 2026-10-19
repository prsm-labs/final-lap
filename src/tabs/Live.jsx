import { fx, ord, pct, useLive } from '../lib/data.js'
import { openDriver } from '../lib/stores.js'
import { Avatar, Section } from '../components/ui.jsx'

// 🔴 Live -- NASCAR's live timing for whatever race is on track, next to our pre-race chances when it's this card's race.
export default function Live({ card }) {
  const live = useLive(true, 15000)
  if (!live) return <p className="muted">Loading live timing…</p>
  if (live.error || !live.vehicles?.length) return <p className="muted">No live timing right now. This page fills in automatically once cars are on track.</p>
  const ours = live.race_id === card.race?.race_id
  const proj = new Map(card.drivers.map((d) => [d.driver_id, d]))
  const done = live.flag_state === 9 || live.flag_state === 4
  const isRace = live.run_type === 3
  return (
    <div>
      <Section title={`🔴 ${live.name || 'Live'}`} sub={`${live.track || ''} · ${isRace ? `Lap ${live.lap} of ${live.laps}` : 'Practice / qualifying'} · ${live.flag}${live.stage?.stage_num ? ` · Stage ${live.stage.stage_num}` : ''}`} />
      <div className="race-meta">
        <span className={`chip flag-${String(live.flag).toLowerCase()}`}>{done ? '🏁 Finished' : `🚩 ${live.flag}`}</span>
        {isRace && <span className="chip">{live.cautions ?? 0} cautions · {live.lead_changes ?? 0} lead changes · {live.leaders ?? 0} leaders</span>}
        {!ours && <span className="muted small">This is a different race from the card you're viewing — switch series at the top to see our picks for it.</span>}
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Pos</th><th className="sticky">Driver</th><th>Start</th><th>Led</th><th>Avg pos</th><th>Pits</th>
              {ours && <><th title="Our pre-race win chance">Our win %</th><th title="Our projected finish">Proj</th><th title="Running position vs our projection">vs proj</th></>}
            </tr>
          </thead>
          <tbody>
            {live.vehicles.map((v) => {
              const p = proj.get(v.driver_id)
              const diff = p ? p.proj_finish - v.pos : null
              return (
                <tr key={v.driver_id || v.car} className={p && p.rank <= 5 ? 'hl' : ''}>
                  <td className="num b">{v.pos}</td>
                  <td className="sticky">
                    <div className="player-cell" onClick={() => p && openDriver(p)}>
                      <Avatar d={p || { car: v.car }} size={24} />
                      <span>{v.name} <span className="muted small">#{v.car}</span>{v.onTrack === false && <span className="tag tag-status">off track</span>}</span>
                    </div>
                  </td>
                  <td className="num">{v.start || '—'}</td>
                  <td className="num">{v.led || 0}</td>
                  <td className="num">{fx(v.avgPos)}</td>
                  <td className="num">{v.pits}</td>
                  {ours && <>
                    <td className="num">{p ? pct(p.win, 1) : '—'}</td>
                    <td className="num">{p ? ord(p.proj_finish) : '—'}</td>
                    <td className={`num ${diff > 0 ? 'soft' : diff < 0 ? 'tough' : ''}`}>{diff == null ? '—' : diff > 0 ? `▲${diff}` : diff < 0 ? `▼${-diff}` : '='}</td>
                  </>}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="muted small">Live timing from NASCAR, refreshed every 15 seconds. ▲ = running better than we projected.</p>
    </div>
  )
}
