import { useEffect, useMemo, useRef, useState } from 'react'
import './RaceSimReplay.css'

// 🎬 Race Sim replay (2026-10-30, user: a RotoBot-style race sim for Final Lap): the most typical of the 15,000 simulated races
// (public/data/racesim/<series>.json, built by scripts/build_race_sims.mjs) lap by lap -- lap counter and flag, win chances, the
// running order, a tilted track with every car, the last event -- with the same play / speed / step / scrubber controls as the
// other apps' Game Sim replays.
const MAKE = { chevrolet: '#e2b11b', chv: '#e2b11b', ford: '#3d7be0', frd: '#3d7be0', toyota: '#e5483c', tyt: '#e5483c' }
const F1 = [['mclaren', '#ff8000'], ['ferrari', '#e8002d'], ['red bull', '#4781d7'], ['mercedes', '#27f4d2'], ['aston', '#229971'], ['alpine', '#ff87bc'],
  ['williams', '#64c4ff'], ['racing bulls', '#6c98ff'], ['rb ', '#6c98ff'], ['haas', '#b6babd'], ['sauber', '#52e252'], ['audi', '#52e252'], ['cadillac', '#d9d9d9']]
export function carColor(d, f1) {
  if (f1) { const t = String(d.team || '').toLowerCase(); return (F1.find(([k]) => t.includes(k)) || [0, '#c9ced6'])[1] }
  return MAKE[String(d.make || '').toLowerCase()] || '#c9ced6'
}
const last = (n) => String(n || '').split(' ').slice(-1)[0]

// track centre line, s in [0, 1): a stadium oval (NASCAR) or a wiggly closed circuit (F1), in a 600 x 300 box
function trackPoint(s, f1) {
  const u = ((s % 1) + 1) % 1
  if (f1) {
    const th = u * 2 * Math.PI
    return [300 + 230 * Math.cos(th) + 28 * Math.cos(3 * th + 0.6), 150 + 98 * Math.sin(th) + 22 * Math.sin(2 * th) - 12 * Math.cos(4 * th)]
  }
  const a = 300, rr = 100, P = 2 * a + 2 * Math.PI * rr
  let d = u * P
  if (d < a) return [150 + d, 250]
  d -= a
  if (d < Math.PI * rr) { const th = d / rr; return [450 + rr * Math.sin(th), 150 + rr * Math.cos(th)] }
  d -= Math.PI * rr
  if (d < a) return [450 - d, 50]
  d -= a
  const th = d / rr
  return [150 - rr * Math.sin(th), 150 - rr * Math.cos(th)]
}
const trackPath = (f1) => { const pts = []; for (let i = 0; i <= 240; i++) pts.push(trackPoint(i / 240, f1).map((v) => v.toFixed(1)).join(',')); return `M${pts.join('L')}Z` }

export default function RaceSimReplay({ sim }) {
  const f1 = sim.series === 'f1'
  const drv = sim.drivers
  const T = sim.typical
  const frames = T.frames
  const n = frames.length
  const [idx, setIdx] = useState(0)
  const [t, setT] = useState(1)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(2)
  const raf = useRef(0)
  const lastTs = useRef(0)
  const hold = useRef(0)
  const tRef = useRef(t)
  tRef.current = t
  useEffect(() => { setIdx(0); setT(1); setPlaying(false) }, [sim])
  useEffect(() => {
    if (!playing) return undefined
    lastTs.current = performance.now()
    hold.current = 0
    const tick = (now) => {
      const dt = Math.min(100, now - lastTs.current)
      lastTs.current = now
      const dur = Math.max(250, (frames[idx]?.k ? 1500 : 650) / speed)
      if (tRef.current < 1) { tRef.current = Math.min(1, tRef.current + dt / dur); setT(tRef.current) }
      else {
        hold.current += dt
        if (hold.current > (frames[idx]?.k ? 700 : 60) / speed) {
          if (idx >= n - 1) { setPlaying(false); return }
          tRef.current = 0; setT(0); setIdx(idx + 1); return
        }
      }
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [playing, idx, speed, n, frames])

  const go = (i) => { setPlaying(false); setIdx(Math.max(0, Math.min(n - 1, i))); setT(1) }
  const toggle = () => {
    if (playing) { setPlaying(false); return }
    if (idx >= n - 1 && t >= 1) { setIdx(0); setT(0) } else if (t >= 1) { setIdx((i) => Math.min(n - 1, i + 1)); setT(0) }
    setPlaying(true)
  }
  const nextEvent = () => {
    for (let i = idx + 1; i < n; i++) if (frames[i].k === 'caution' || frames[i].k === 'stage' || frames[i].k === 'finish') { setIdx(i); setT(0); setPlaying(true); return }
    go(n - 1)
  }

  const cur = frames[idx]
  const prev = frames[Math.max(0, idx - 1)]
  const done = t >= 1 ? idx : Math.max(0, idx - 1)
  const shown = frames[done]
  // laps led so far (the leader at each frame holds the laps since the previous frame)
  const ledSoFar = useMemo(() => {
    const out = []
    const acc = new Array(drv.length).fill(0)
    let pl = 0
    for (const f of frames) { acc[f.o[0]] += f.l - pl; pl = f.l; out.push(acc.slice()) }
    return out
  }, [frames, drv.length])
  const wpAt = (f) => T.wp[f.w] || T.wp[0]
  const wpNow = wpAt(shown)
  const contenders = useMemo(() => {
    const first = T.wp[0]
    return [...drv.keys()].sort((a, b) => first[b] - first[a]).slice(0, 4)
  }, [T.wp, drv])
  const checkpoints = useMemo(() => Object.keys(T.wp).map(Number).sort((a, b) => a - b), [T.wp])
  const laps = sim.params.laps

  // car positions on the track: leader's progress through the frame, the field strung out behind (bunched under yellow)
  const order = cur.o
  const run = order.filter((i) => !T.outLap[i] || T.outLap[i] > cur.l)
  const prevIdx = new Map(prev.o.map((i, p) => [i, p]))
  const gap = cur.f === 'Y' || prev.f === 'Y' ? 0.0075 : f1 ? 0.017 : 0.0145
  const lead = (cur.l + (t - 1)) % 1 + 0.02
  const W = 300, H = 56
  const line = (i) => checkpoints.filter((l) => l <= shown.l).map((l) => `${(l / laps * W).toFixed(1)},${((1 - (T.wp[l][i] || 0)) * H).toFixed(1)}`).join(' ')
  const flag = cur.f === 'C' && t >= 1 ? 'CHECKERED' : (t >= 1 ? cur.f : prev.f) === 'Y' ? (f1 ? 'SAFETY CAR' : 'CAUTION') : 'GREEN'
  const stageNo = (() => { let acc = 0; const st = sim.params.stages; for (let i = 0; i < st.length; i++) { acc += st[i]; if (shown.l <= acc) return i + 1 } return st.length })()
  const events = frames.slice(0, done + 1).filter((f) => f.t).slice(-6).reverse()

  return (
    <div className="rs">
      <div className="rs-top">
        <div className="rs-bug">
          <div className="rs-lap"><span>LAP</span><b>{Math.min(laps, shown.l)}</b><span>/ {laps}</span></div>
          <div className={`rs-flag rs-flag-${flag.split(' ')[0].toLowerCase()}`}>{flag}</div>
          <div className="rs-stage">{f1 ? sim.race.name : sim.params.stages.length > 1 ? `Stage ${stageNo} of ${sim.params.stages.length}` : sim.race.track}</div>
        </div>
        <div className="rs-wp">
          <span className="rs-wp-label">WIN CHANCE</span>
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-label="Win chances">
            {contenders.map((i) => <polyline key={i} points={line(i)} fill="none" stroke={carColor(drv[i], f1)} strokeWidth="2" vectorEffect="non-scaling-stroke" />)}
          </svg>
          <div className="rs-wp-keys">
            {[...drv.keys()].sort((a, b) => (wpNow[b] || 0) - (wpNow[a] || 0)).slice(0, 4).map((i) => (
              <span key={i}><i style={{ background: carColor(drv[i], f1) }} />{last(drv[i].name)} <b>{Math.round(100 * (wpNow[i] || 0))}%</b></span>
            ))}
          </div>
        </div>
      </div>

      <div className="rs-mid">
        <div className="rs-board">
          <div className="rs-board-h">Running order</div>
          {shown.o.slice(0, 10).map((i, p) => {
            const was = prevIdx.get(i)
            const ch = t >= 1 && was != null ? was - p : 0
            return (
              <div key={i} className={`rs-row${p === 0 ? ' rs-leader' : ''}`}>
                <span className="rs-pos">{p + 1}</span>
                <span className="rs-car" style={{ background: carColor(drv[i], f1) }}>{drv[i].car}</span>
                <span className="rs-name">{last(drv[i].name)}</span>
                <span className={`rs-ch ${ch > 0 ? 'up' : ch < 0 ? 'dn' : ''}`}>{ch > 0 ? `▲${ch}` : ch < 0 ? `▼${-ch}` : ''}</span>
                <b className="rs-led" title="Laps led so far">{ledSoFar[done][i] || ''}</b>
              </div>
            )
          })}
          <div className="rs-out">{shown.x ? `${shown.x} out` : 'All cars running'} · laps led at right</div>
        </div>
        <div className="rs-surface">
          <div className="rs-tilt">
            <svg viewBox="0 0 600 300" className="rs-track">
              <path d={trackPath(f1)} className="rs-asphalt" />
              <path d={trackPath(f1)} className="rs-lane" />
              {(() => { const [x, y] = trackPoint(0.02, f1); return <line x1={x} x2={x} y1={y - 16} y2={y + 16} className="rs-sf" /> })()}
              {[...run].reverse().map((i) => {
                const p = run.indexOf(i)
                const pp = prevIdx.has(i) ? Math.min(prevIdx.get(i), run.length - 1) : p
                const slot = pp + (p - pp) * t
                const [x, y] = trackPoint(lead - slot * gap, f1)
                return (
                  <g key={i} transform={`translate(${x.toFixed(1)},${y.toFixed(1)})`}>
                    <circle r={7.5} fill={carColor(drv[i], f1)} stroke={p === 0 ? '#fff' : 'rgba(0,0,0,.55)'} strokeWidth={p === 0 ? 2 : 1} />
                    <text y="2.6" className="rs-num">{drv[i].car}</text>
                    {p === 0 && <text y="-12" className="rs-tag">{last(drv[i].name)}</text>}
                  </g>
                )
              })}
            </svg>
          </div>
        </div>
      </div>

      <div className={`rs-play${cur.k && t >= 1 ? ` rs-play-${cur.k}` : ''}`}>
        <span className="rs-chip">L{cur.l}</span>
        <span className="rs-text">{(t >= 1 ? cur.t : null) || `${last(drv[shown.o[0]].name)} leads${shown.o[1] != null ? `, ${last(drv[shown.o[1]].name)} 2nd` : ''}`}</span>
      </div>
      {events.length > 0 && <div className="rs-log">{events.map((f, i) => <div key={i}><b>L{f.l}</b> {f.t}</div>)}</div>}

      <div className="rs-ctrl">
        <button onClick={() => go(0)} aria-label="Back to the start">⏮</button>
        <button onClick={() => go(idx - 1)} aria-label="Previous">◀</button>
        <button className="rs-play-btn" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>{playing ? '❚❚' : '▶'}</button>
        <button onClick={() => go(idx + 1)} aria-label="Next">▶▏</button>
        <button onClick={nextEvent}>{f1 ? 'Next event' : 'Next caution'}</button>
        <button onClick={() => go(n - 1)} aria-label="Jump to the finish">⏭</button>
        <span className="rs-speed">{[1, 2, 4, 8].map((s) => <button key={s} className={speed === s ? 'on' : ''} onClick={() => setSpeed(s)}>{s}x</button>)}</span>
        <input type="range" min={0} max={n - 1} value={idx} onChange={(e) => go(+e.target.value)} aria-label="Scrub through the race" />
        <span className="rs-count">{idx + 1}/{n}</span>
      </div>
      <div className="rs-foot">Simulated race, not a prediction · race {(T.index + 1).toLocaleString('en-US')} of {sim.n.toLocaleString('en-US')}</div>
    </div>
  )
}
