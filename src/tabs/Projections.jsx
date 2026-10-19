import { fx, ord, pct } from '../lib/data.js'
import { matches, searchStore } from '../lib/stores.js'
import { Th, useSort } from '../lib/useSort.jsx'
import { DriverCell, Finish, Prob, Section } from '../components/ui.jsx'
import { RaceHeader } from './RaceCard.jsx'

// 🔮 Projections -- every driver in the field: win / 2nd / 3rd / top 3 / top 5 / top 10, projected finish, the inputs.
export default function Projections({ card }) {
  const q = searchStore.use()
  const rows = card.drivers.filter((d) => matches(d, q))
  const sort = useSort(rows, 'win')
  const last5 = (d) => (d.last10 || []).slice(-5)
  return (
    <div>
      <RaceHeader card={card} />
      <Section title="🔮 Projections" sub="Every driver, 20,000 simulated races. Click a header to sort, a driver for the full breakdown." />
      <div className="filters-row card filters">
        <input className="search" placeholder="Search driver, team, make or #car" value={q} onChange={(e) => searchStore.set(e.target.value)} />
        <span className="muted small">{rows.length} of {card.drivers.length} drivers</span>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <Th k="name" label="Driver" sort={sort} className="sticky" />
              <Th k="start" label="Start" sort={sort} title="Starting spot (after qualifying)" />
              <Th k="win" label="Win" sort={sort} />
              <Th k="p2" label="2nd" sort={sort} title="Chance of finishing exactly 2nd" />
              <Th k="p3" label="3rd" sort={sort} title="Chance of finishing exactly 3rd" />
              <Th k="top3" label="Top 3" sort={sort} />
              <Th k="top5" label="Top 5" sort={sort} />
              <Th k="top10" label="Top 10" sort={sort} />
              <Th k="avg" label="Avg fin" sort={sort} title="Average finish across the simulated races (lower is better)" />
              <Th k="rating" label="Rating" sort={sort} title="Driver rating (loop data), recent races weighted most" />
              <Th k="type_rating" label="Type" sort={sort} title="Driver rating on this kind of track" />
              <Th k="trk_rating" label="Track" sort={sort} title="Driver rating at this exact track" />
              <Th k="prac" label="Prac" sort={sort} title="Final-practice speed rank (best lap) -- fills in after practice" />
              <th title="Last 5 finishes, oldest to newest">Last 5</th>
            </tr>
          </thead>
          <tbody>
            {sort.sorted.map((d) => (
              <tr key={d.driver_id}>
                <td className="sticky"><DriverCell d={d} /></td>
                <td className="num">{d.start ? ord(d.start) : '—'}</td>
                <td className="num"><Prob v={d.win} strong={0.15} /></td>
                <td className="num">{pct(d.p2, 1)}</td>
                <td className="num">{pct(d.p3, 1)}</td>
                <td className="num"><Prob v={d.top3} /></td>
                <td className="num"><Prob v={d.top5} /></td>
                <td className="num"><Prob v={d.top10} strong={0.6} /></td>
                <td className="num">{fx(d.avg)}</td>
                <td className="num">{fx(d.rating, 0)}</td>
                <td className="num">{fx(d.type_rating, 0)}</td>
                <td className="num">{fx(d.trk_rating, 0)}</td>
                <td className="num">{d.prac ? ord(d.prac) : '—'}</td>
                <td className="fins">{last5(d).map((f, i) => <Finish key={i} n={f} />)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
