import { fx, ord, pct, useLive } from '../lib/data.js'
import { isF1, openDriver } from '../lib/stores.js'
import { PICK_TYPE } from '../lib/picks.js'
import { Avatar } from './ui.jsx'

// 📡 My Picks live (2026-10-26, user: a "my players" box score inside My Picks -- how my picks are doing live, measured
// against OUR projections, not the pick category). One row per picked driver in this card's race, timing-table style:
// running position now vs our projected finish (▲ = running better than projected), plus start, laps led, average running
// position and pits. There is no live race model, so the comparison is pre-race projection vs now (no live projected finish).
// NASCAR / F1 live timing every 15 s, the same feed as the Live tab.
const fold = (s) => String(s || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

function Vs({ proj, now }) {
  if (proj == null || now == null) return <span className="muted">—</span>
  const d = Math.round(proj - now)
  return <span className={d > 0 ? 'soft' : d < 0 ? 'tough' : ''}>{d > 0 ? `▲ ${d}` : d < 0 ? `▼ ${-d}` : '='}</span>
}

export default function PicksLive({ card, series, picks }) {
  const f1 = isF1(series)
  const live = useLive(true, 15000, f1 ? '/api/f1live' : '/api/live')
  const raceId = card?.race?.race_id
  const mine = picks.filter((k) => k.series === series && k.raceId === raceId)
  if (!card?.race) return <p className="muted">No race card loaded.</p>
  if (!mine.length) return <p className="muted">None of your picks are in {card.race.name || card.race.track}. Picks for other races are under By race.</p>
  const ours = live && !live.error && (f1 ? Math.abs(new Date(`${card.race.date}T12:00:00`) - Date.now()) < 4 * 86400e3 : live.race_id === raceId)
  const isRace = ours && live.run_type === 3
  const done = ours && (live.flag_state === 9 || live.flag_state === 4)
  const byDriver = new Map((card.drivers || []).map((d) => [d.driver_id, d]))
  const veh = (k) => (ours ? live.vehicles?.find((v) => (f1 ? fold(v.name) === fold(k.name) : v.driver_id === k.driver_id)) : null)
  const rows = mine.map((k) => ({ k, d: byDriver.get(k.driver_id), v: veh(k) }))
    .sort((a, b) => (a.v?.pos ?? 99) - (b.v?.pos ?? 99) || (a.d?.proj_finish ?? 99) - (b.d?.proj_finish ?? 99))
  const withPos = rows.filter((r) => isRace && r.v?.pos != null && r.d?.proj_finish != null)
  const ahead = withPos.filter((r) => r.v.pos < r.d.proj_finish - 2).length
  const behind = withPos.filter((r) => r.v.pos > r.d.proj_finish + 2).length
  const status = !ours ? 'Not on track yet' : done ? '🏁 Finished' : isRace ? `Lap ${live.lap}${live.laps ? ` of ${live.laps}` : ''} · ${live.flag}` : `${live.name || 'Session'} (practice / qualifying)`

  return (
    <div className="card pl-card">
      <div className="pl-summary">
        <span><b>{card.race.name || card.race.track}</b> · {status}</span>
        {withPos.length > 0 && <><span className="soft"><b>{ahead}</b> ▲ ahead</span><span><b>{withPos.length - ahead - behind}</b> on track</span><span className="tough"><b>{behind}</b> ▼ behind</span></>}
      </div>
      <div className="table-wrap">
        <table className="data-table pl-table">
          <thead>
            <tr>
              <th className="sticky">Driver</th>
              <th title="Running position now">{isRace ? 'Pos' : 'Session pos'}</th>
              <th title="Our projected finish (pre-race)">Proj</th>
              <th title="Running position vs our projected finish">vs proj</th>
              {!f1 && <><th>Start</th><th>Led</th><th title="Average running position">Avg pos</th><th>Pits</th></>}
              <th title="Our pre-race chances">Win / Top 5 / Top 10</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ k, d, v }) => {
              const t = PICK_TYPE[k.type]
              return (
                <tr key={k.id}>
                  <td className="sticky">
                    <div className="player-cell" onClick={() => d && openDriver(d)}>
                      <Avatar d={d || { car: k.car }} size={24} />
                      <span className="pl-name">{k.name} <span className="muted small">#{k.car}</span>
                        <span className="pl-sub">{t ? `${t.emoji} ${t.label}` : ''}{v?.onTrack === false ? ' · off track' : ''}</span></span>
                    </div>
                  </td>
                  <td className="num b">{v?.pos ?? '—'}</td>
                  <td className="num">{d?.proj_finish != null ? ord(d.proj_finish) : '—'}</td>
                  <td className="num">{isRace ? <Vs proj={d?.proj_finish} now={v?.pos} /> : <span className="muted">—</span>}</td>
                  {!f1 && <>
                    <td className="num">{v?.start || '—'}</td>
                    <td className="num">{v ? v.led || 0 : '—'}</td>
                    <td className="num">{v?.avgPos != null ? fx(v.avgPos) : '—'}</td>
                    <td className="num">{v?.pits ?? '—'}</td>
                  </>}
                  <td className="num small">{d ? `${pct(d.win, 1)} / ${pct(d.top5)} / ${pct(d.top10)}` : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="muted small">
        Running position now against our projected finish (▲ / ▼ = 3+ places better / worse than projected). There's no live race model,
        so this compares the pre-race projection with where he's running, not a live projected finish. Timing refreshes every 15 seconds.
      </p>
    </div>
  )
}
