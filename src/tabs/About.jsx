import { fx, pct, useJson } from '../lib/data.js'
import { Section } from '../components/ui.jsx'

// 📌 About -- how Final Lap 2.0 works, in plain words, with the real tested numbers.
export default function About() {
  const m = useJson('model.json')
  const row = (k, l) => {
    const b = m?.backtest?.[k]?.post?.['2026']
    return b ? <li key={k}><b>{l}</b>: favorite won {pct(b.fav_won)} of {b.races} races (we gave him {pct(b.fav_said)} on average); top-5 picks {fx(b.top5_hits, 1)} of 5 finished top 5; top-10 picks {fx(b.top10_hits, 1)} of 10.</li> : null
  }
  return (
    <div className="about">
      <Section title="📌 About Final Lap" sub="NASCAR projections for the Cup, O'Reilly and Truck series — a PRISM Labs app" />
      <div className="card">
        <b>What it does</b>
        <ul>
          <li>For every driver entered in this weekend's race: chance to win, finish 2nd, finish 3rd, top 3, top 5, top 10, and an average projected finish.</li>
          <li>Each race is simulated 20,000 times. Chances update when the entry list posts and again after qualifying.</li>
          <li>Picks are frozen at the green flag and graded against official results on the Track Record page. Nothing is edited after the fact.</li>
        </ul>
      </div>
      <div className="card">
        <b>What goes in (tested on 2022-2026 races, kept only what helped)</b>
        <ul>
          <li><b>Driver rating</b> from NASCAR's loop data (speed, running position, passing, laps led every lap) — a better measure of how good a driver is than finishing position, which wrecks and pit strategy scramble.</li>
          <li><b>Track type</b> (superspeedway, intermediate, short track, road / street): some drivers are much better on one kind of track.</li>
          <li><b>This exact track</b>: a smaller extra nudge.</li>
          <li><b>Team / equipment</b>: how the car owner's entries have run.</li>
          <li><b>Starting spot</b> after qualifying (counts less at Daytona, Talladega and Atlanta, where the pack shuffles everyone).</li>
          <li><b>Cup drivers in O'Reilly races</b> are rated partly from their Cup speed.</li>
          <li>Tested and <b>left out</b> because they added nothing: hot / cold streaks, laps-led history and wreck (DNF) rate.</li>
        </ul>
      </div>
      <div className="card">
        <b>How it has done (2026, each race predicted from earlier seasons only)</b>
        <ul>{row('cup', 'Cup')}{row('oreilly', "O'Reilly")}{row('truck', 'Truck')}</ul>
        <div className="muted small">Racing is unpredictable: even the best favorite usually wins only 1 race in 4. The chances shown are meant to be honest — when we say 20%, that driver should win about 1 in 5.</div>
      </div>
      <div className="card">
        <b>Sources</b>
        <ul>
          <li>Schedule, entry lists, qualifying, results, loop data and live timing: NASCAR's official data feed. Entry lists fall back to ESPN, then to a projected field (labelled) when none is posted yet.</li>
          <li>No sportsbook odds are used anywhere. Gambly buttons only copy a bet description so you don't have to type it.</li>
        </ul>
      </div>
    </div>
  )
}
