import { useMemo } from 'react'
import { fx, pct, useJson } from '../lib/data.js'
import { isF1, openDriver } from '../lib/stores.js'
import { Th, useSort } from '../lib/useSort.jsx'
import { Section } from '../components/ui.jsx'
import RaceSimReplay from '../components/RaceSimReplay.jsx'

// 🎬 Race Sim (2026-10-30, user: "Even final lap could benefit from a race sim.. one that adjusts to starting lineups as well"):
// the next race of the series on screen run 15,000 times lap by lap (scripts/build_race_sims.mjs + src/sim/raceSim.js), tuned to
// Final Lap's own chances: the most typical race as a replay, then the 15,000-race averages.
export default function RaceSim({ card, series }) {
  const f1 = isF1(series)
  const sim = useJson(`racesim/${series}.json`)
  const full = useMemo(() => new Map((card?.drivers || []).map((d) => [d.driver_id, d])), [card])
  const rows = useMemo(() => (sim?.drivers || []).map((d) => ({ ...d, s_win: d.sim.win, s_top5: d.sim.top5, s_top10: d.sim.top10, s_avg: d.sim.avg,
    s_led: d.sim.led, s_dnf: d.sim.dnf, s_stage: d.sim.stageWin })), [sim])
  const sort = useSort(rows, 's_win')
  const nf = (sim?.n || 15000).toLocaleString('en-US')
  const stages = sim?.params?.stages || []
  return (
    <div>
      <Section title="🎬 Race Sim" sub={`The next race, run ${nf} times lap by lap`} />
      <p className="note">The next race is run 15,000 times, lap by lap: the field starts from the official starting lineup once qualifying
        has set it (before that, each race runs its own qualifying from the cars' pace), every car gets a "car today" draw around its pace,
        cars pass the one ahead at a rate set by the gap between them (more on restarts), and cautions{f1 ? ' (safety cars)' : ''} come at
        this track's own rate from the last five seasons -- wrecks involve one to four cars (some retire, the rest lose spots), pit stops
        under yellow shuffle the order a little{f1 ? ', every car makes one stop' : ', the stage breaks fall on the real stage laps'}, and
        mechanical failures come at the series' rate. Each driver's pace is tuned so his top-5 / top-10 chances over the sims match
        Final Lap's own projections (the official numbers), the day-to-day spread so the favorites' win chances match, and the passing rate
        so lead changes match this track's history -- so the sim adds the race itself, not new picks. The replay is the most typical of the
        15,000: won by the driver who wins most of them, closest to the average finishing order and the usual number of cautions. Win chances
        during the replay come from 200 more races run from that point. Simulated races, not predictions; the file locks at the green flag.</p>
      {!sim && <p className="muted">Loading…</p>}
      {sim?.error && <p className="muted">No race sim for the next {f1 ? 'F1' : ''} race yet -- it's built with each pipeline run and locks at the green flag.</p>}
      {sim && !sim.error && (
        <>
          <div className="slate-status">
            <span><b>{nf} races:</b> {sim.race.name} · {sim.race.track} · {sim.params.laps} laps{stages.length > 1 ? ` (stages ${stages.join(' / ')})` : ''}</span>
            <span>{sim.grid ? '🏁 Official starting lineup' : '⏳ Starting lineup not set yet -- each race simulates qualifying; rebuilt once the lineup is posted'}</span>
            <span>Per race: {fx(sim.summary.cautions)} {f1 ? 'safety cars' : 'cautions'}{sim.summary.hist.cautions != null ? ` (track history ${fx(sim.summary.hist.cautions)} plus stage breaks)` : ''}
              {' '}· {fx(sim.summary.leadChanges)} lead changes{sim.summary.hist.leadChanges != null ? ` (history ${fx(sim.summary.hist.leadChanges)})` : ''}
              {' '}· {fx(sim.summary.dnfs)} cars out (history {fx(sim.summary.hist.dnfs)}) · rates from {sim.params.src}</span>
            {sim.frozen && <span>🔒 Locked at the green flag -- this is the pre-race simulation.</span>}
          </div>
          <RaceSimReplay sim={sim} />
          <h3>📊 {nf}-race results (averages)</h3>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <Th k="name" label="Driver" sort={sort} className="sticky" />
                  <Th k="start" label="Start" sort={sort} />
                  <Th k="s_win" label="Win" sort={sort} title="Share of the 15,000 races he won" />
                  <Th k="s_top5" label="Top 5" sort={sort} />
                  <Th k="s_top10" label="Top 10" sort={sort} />
                  <Th k="s_avg" label="Avg finish" sort={sort} />
                  <Th k="s_led" label="Laps led" sort={sort} title="Average laps led" />
                  {!f1 && <Th k="s_stage" label="Stage wins" sort={sort} title="Average stage wins per race" />}
                  <Th k="s_dnf" label="Out" sort={sort} title="Share of races he didn't finish" />
                  <Th k="win" label="Model win" sort={sort} title="Final Lap's projection (the official number)" />
                  <Th k="top10" label="Model top 10" sort={sort} title="Final Lap's projection (the official number)" />
                </tr>
              </thead>
              <tbody>
                {sort.sorted.map((d) => (
                  <tr key={d.id}>
                    <td className="sticky"><span className="link" onClick={() => full.get(d.id) && openDriver(full.get(d.id))}>{d.name}</span>
                      {' '}<span className="muted small">#{d.car}{d.team ? ` · ${d.team}` : ''}</span></td>
                    <td>{d.start || '—'}</td>
                    <td><b>{pct(d.s_win)}</b></td><td>{pct(d.s_top5)}</td><td>{pct(d.s_top10)}</td><td>{fx(d.s_avg)}</td><td>{fx(d.s_led)}</td>
                    {!f1 && <td>{fx(d.s_stage, 2)}</td>}
                    <td>{pct(d.s_dnf)}</td><td className="muted">{pct(d.win)}</td><td className="muted">{pct(d.top10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted small">Averages over all {nf} races. The chances on the Race Card and Projections are the official numbers -- these are
            tuned to match them (top 5 / top 10 within a few points, the favorites' win chances within a point or two). Built{' '}
            {new Date(sim.generated_at).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' })}.</p>
        </>
      )}
    </div>
  )
}
