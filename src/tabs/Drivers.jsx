import { fx, useJson } from '../lib/data.js'
import { isF1, matches, openDriver, searchStore } from '../lib/stores.js'
import { Th, useSort } from '../lib/useSort.jsx'
import { Avatar, Section } from '../components/ui.jsx'

// 🔍 Drivers -- this season's numbers for every driver in the series, plus loop-data rating by track type (last 3 seasons).
const NASCAR_TYPES = [['ss', 'SS', 'Superspeedways (Daytona, Talladega, Atlanta)'], ['int', 'Int', 'Intermediate ovals (1.3-2.5 mi)'],
  ['short', 'Short', 'Short tracks (under ~1.1 mi)'], ['road', 'Road', 'Road and street courses']]
const F1_TYPES = [['street', 'Street', 'Street and semi-street circuits'], ['fast', 'Fast', 'High-speed, low-downforce circuits'],
  ['tech', 'Downforce', 'Twisty, high-downforce circuits'], ['perm', 'Balanced', 'Balanced permanent circuits']]

export default function Drivers({ series, card }) {
  const f1 = isF1(series)
  const TYPES = f1 ? F1_TYPES : NASCAR_TYPES
  const t = useJson(`${series}/drivers.json`)
  const q = searchStore.use()
  const rows = (t?.drivers || []).filter((d) => matches(d, q))
  const getters = Object.fromEntries(TYPES.map(([k]) => [k, (d) => d.types?.[k]]))
  const sort = useSort(rows, 'points', 'desc', getters)
  if (!t) return <p className="muted">Loading drivers…</p>
  const inField = new Map((card?.drivers || []).map((d) => [d.driver_id, d]))
  return (
    <div>
      <Section title={`🔍 ${t.season} ${t.label} drivers`} sub="Season results plus driver rating by track type. Click a driver for the full card." />
      <div className="filters-row card filters">
        <input className="search" placeholder="Search driver, team, make or #car" value={q} onChange={(e) => searchStore.set(e.target.value)} />
        <span className="muted small">{rows.length} drivers</span>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <Th k="name" label="Driver" sort={sort} className="sticky" />
              <Th k="points" label="Pts" sort={sort} title={f1 ? "Championship points from this season's races (sprints included)" : "Points earned in this season's races (includes stage points; playoff resets not applied)"} />
              <Th k="starts" label="Starts" sort={sort} />
              <Th k="wins" label="Wins" sort={sort} />
              {f1 && <Th k="top3" label="Podiums" sort={sort} />}
              <Th k="top5" label="Top 5" sort={sort} />
              <Th k="top10" label="Top 10" sort={sort} />
              <Th k="avg_finish" label="Avg fin" sort={sort} />
              <Th k="avg_start" label="Avg start" sort={sort} />
              <Th k="rating" label="Rating" sort={sort} title={f1 ? 'Average race rating this season (qualifying + finish against the field, 0-100)' : 'Average driver rating this season'} />
              {!f1 && <Th k="led" label="Led" sort={sort} title="Laps led" />}
              <Th k="dnf" label="DNF" sort={sort} />
              {TYPES.map(([k, l, title]) => <Th key={k} k={k} label={l} sort={sort} title={`Rating: ${title}`} />)}
            </tr>
          </thead>
          <tbody>
            {sort.sorted.map((d) => (
              <tr key={d.driver_id}>
                <td className="sticky">
                  <div className="player-cell" onClick={() => openDriver(inField.get(d.driver_id) || d)}>
                    <Avatar d={d} />
                    <div className="player-cell-main"><div className="player-name">{d.name}</div><div className="sub">#{d.car} · {d.team}{d.make ? ` · ${d.make}` : ''}</div></div>
                  </div>
                </td>
                <td className="num">{d.points}</td><td className="num">{d.starts}</td><td className="num">{d.wins}</td>
                {f1 && <td className="num">{d.top3}</td>}<td className="num">{d.top5}</td><td className="num">{d.top10}</td><td className="num">{fx(d.avg_finish)}</td>
                <td className="num">{fx(d.avg_start)}</td><td className="num">{fx(d.rating, 0)}</td>{!f1 && <td className="num">{d.led}</td>}<td className="num">{d.dnf}</td>
                {TYPES.map(([k]) => <td key={k} className="num">{fx(d.types?.[k], 0)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
