import { fx, pct, useJson } from '../lib/data.js'
import { Section } from '../components/ui.jsx'

// 📌 About -- how Final Lap 2.0 works, in plain words, with the real tested numbers. F1 has its own page (2026-10-20).
function F1About() {
  const m = useJson('f1/model.json')
  const bt = m?.backtest?.post || {}
  const pre = m?.backtest?.pre || {}
  return (
    <div className="about">
      <Section title="📌 About Final Lap · F1" sub="Formula 1 projections for every Grand Prix — a PRISM Labs app" />
      <div className="card">
        <b>What it does</b>
        <ul>
          <li>For every driver in this weekend's Grand Prix: chance to win, finish 2nd, finish 3rd, podium (top 3), top 5, points (top 10), and an average projected finish.</li>
          <li>Each race is simulated 20,000 times. Chances update after practice and again after qualifying, when the grid is known.</li>
          <li>Picks are frozen at lights out and graded against the official results on the Track Record page.</li>
          <li>💎 PRISM Picks (Race Card, top of the cheat sheets): up to 3 top-3 / top-5 / top-10 finishes at a 70%+ chance that the driver hit in 80% or fewer of his last 10 races, with the model at least 5 points above that. 2024-26, each race predicted from earlier races only: 239 of 274 hit (87%). The big number is the track record at that chance, not the raw chance.</li>
        </ul>
      </div>
      <div className="card">
        <b>What goes in (tested on 2024-2026 races, each season predicted from earlier seasons only)</b>
        <ul>
          <li><b>Starting grid</b> after qualifying: by far the strongest single input in F1.</li>
          <li><b>Car rating</b>: the team's qualifying pace against the field, recent races weighted most. Last season counts for only ~10% once a new season starts, and the 2026 rule change cut it further — carrying old form over made every test season worse.</li>
          <li><b>Driver rating</b>: where he qualified and finished against the field, recent races weighted most.</li>
          <li><b>Practice pace</b>: best practice lap of the weekend, ranked against the field (before qualifying).</li>
          <li>Tested inputs that didn't earn a place are listed in the Track Record notes and left out.</li>
        </ul>
      </div>
      <div className="card">
        <b>How it has done (each season predicted from earlier seasons only, after qualifying)</b>
        <ul>
          {Object.entries(bt).map(([y, b]) => (
            <li key={y}><b>{y}</b>: favorite won {pct(b.fav_won)} of {b.races} races (we gave him {pct(b.fav_said)} on average); podium picks {fx(b.top3_hits, 1)} of 3 on the podium; top-10 picks {fx(b.top10_hits, 1)} of 10 scored points{pre[y] ? ` · before qualifying: favorite won ${pct(pre[y].fav_won)}, top-10 picks ${fx(pre[y].top10_hits, 1)} of 10` : ''}.</li>
          ))}
        </ul>
        <div className="muted small">F1 is more predictable at the front than NASCAR (the fastest car usually starts and stays ahead), so favorites carry bigger chances here. The chances are meant to be honest: when we say 40%, that driver should win about 2 races in 5.</div>
      </div>
      <div className="card">
        <b>Sources</b>
        <ul>
          <li>Calendar, results, qualifying and sprints: Jolpica (the open successor to the Ergast F1 database). Practice and qualifying lap times, driver numbers and photos: OpenF1. Live running order: ESPN.</li>
          <li>No sportsbook odds are used anywhere.</li>
        </ul>
      </div>
    </div>
  )
}

export default function About({ series }) {
  const m = useJson('model.json')
  if (series === 'f1') return <F1About />
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
          <li>💎 PRISM Picks (Race Card, top of the cheat sheets): up to 3 top-3 / top-5 / top-10 finishes at a 70%+ chance that the driver hit in 80% or fewer of his last 10 races in the series, with the model at least 5 points above that. 2024-26 across all three series, each race predicted from earlier races only: 320 of 446 hit (72%) — the model said 84% on those picks, so the number shown is the track record at that chance, not the raw chance. Many weekends (superspeedways, before qualifying) have none.</li>
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
          <li><b>Practice speed</b>: each driver's best lap in final practice, ranked against the field (all three series; added Oct 2026 after it improved the 2024-26 backtest). Chances update once practice is run.</li>
          <li><b>Crew chief</b> (Cup only): how the crew chief's cars have been running compared with the driver's own form.</li>
          <li>Tested and <b>left out</b> because they added nothing on top of the above: hot / cold streaks, laps-led history, wreck (DNF) rate, fastest-lap counts, quality passes, closing position, laps run in the top 15, practice 10-lap averages, and qualifying speed beyond the starting spot.</li>
          <li><b>Chaos tag</b> (context only): drivers who finish well above drivers at their level in chaos races (the series' top third by cautions + cars out in accidents, 2022-26) compared with calm races. Tested as a model input: no help in Cup or Truck (most chaos races are superspeedways, which the track-type rating already covers), a small consistent help in O'Reilly — so for now it's shown, not counted.</li>
          <li>Aero / horsepower packages aren't in NASCAR's data feed by name; they follow the track type (superspeedway package at Daytona / Talladega / Atlanta, short-track / road package elsewhere), which the model already rates separately.</li>
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
          <li>No sportsbook odds are used anywhere.</li>
        </ul>
      </div>
    </div>
  )
}
