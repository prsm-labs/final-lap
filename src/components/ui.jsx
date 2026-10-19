import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { pct } from '../lib/data.js'
import { PICK_TYPE, PICK_TYPES, pickId, removePick, setPick, usePicks } from '../lib/picks.js'
import { betLine, gamblyUrl } from '../lib/gambly.js'
import { openDriver } from '../lib/stores.js'

// Shared Final Lap pieces (Slap Shot / CourtIQ components, NASCAR versions).
export const RaceCtx = createContext(null)       // { series, raceId, race, track, date } of the card on screen

export function Avatar({ d, size = 30 }) {
  const [bad, setBad] = useState(false)
  if (bad || !d?.photo) {
    return <span className="avatar fallback" style={{ width: size, height: size }}>{d?.car ? `#${d.car}` : '?'}</span>
  }
  return <img className="avatar photo" src={d.photo} alt="" width={size} height={size} loading="lazy" onError={() => setBad(true)} />
}

export function Tags({ d }) {
  return (
    <span className="tags">
      {(d.tags || []).map((t) => <span key={t.key} className={`tag tag-${t.key}`} title={t.title}>{t.label}</span>)}
    </span>
  )
}

export function DriverCell({ d, prop = 'win', sub = true }) {
  return (
    <div className="player-cell" onClick={() => openDriver(d)}>
      <Avatar d={d} />
      <div className="player-cell-main">
        <div className="player-name"><span>{d.name}</span> <PickButton d={d} prop={prop} /></div>
        {sub && <div className="sub">#{d.car || '—'} · {d.team || '—'}{d.make ? ` · ${d.make}` : ''} <Tags d={d} /></div>}
      </div>
    </div>
  )
}

export function Prob({ v, strong = 0.5 }) {
  if (v == null) return <span className="muted">—</span>
  return <span className={`prob ${v >= strong ? 'strong' : ''}`} style={{ '--w': `${Math.min(100, Math.round(v * 100))}%` }}>{pct(v)}</span>
}

export function GamblyButton({ text, compact = true, label = 'Gambly' }) {
  const [done, setDone] = useState(false)
  if (!text) return null
  const go = async (e) => {
    e.stopPropagation()
    e.preventDefault()
    try {
      await navigator.clipboard.writeText(text)
      setDone(true)
      setTimeout(() => setDone(false), 2000)
    } catch { /* clipboard blocked: still typed into Gambly */ }
    window.open(gamblyUrl(text), '_blank', 'noopener,noreferrer')
  }
  return (
    <button type="button" className={`gambly-btn ${compact ? 'compact' : ''}`} onClick={go} title={`Gambly: copies "${text.split('\n').join(' · ')}" and opens Gambly with it typed in`}>
      <img src="/brand/gambly.png" alt="" width={compact ? 12 : 14} height={compact ? 12 : 14} />
      {done ? '✓' : compact ? null : label}
    </button>
  )
}

const MENU_W = 180
export function PickButton({ d, prop = 'win' }) {
  const ctx = useContext(RaceCtx)
  const picks = usePicks()
  const btn = useRef(null)
  const menu = useRef(null)
  const [pos, setPos] = useState(null)
  useEffect(() => {
    if (!pos) return undefined
    const close = (e) => { if (!menu.current?.contains(e.target) && !btn.current?.contains(e.target)) setPos(null) }
    const off = () => setPos(null)
    document.addEventListener('mousedown', close)
    window.addEventListener('scroll', off, true)
    window.addEventListener('resize', off)
    return () => { document.removeEventListener('mousedown', close); window.removeEventListener('scroll', off, true); window.removeEventListener('resize', off) }
  }, [pos])
  if (!ctx) return null
  const id = pickId(ctx.series, ctx.raceId, d.driver_id)
  const cur = picks[id]
  const type = cur ? PICK_TYPE[cur.type] : null
  const toggle = (e) => {
    e.stopPropagation()
    if (pos) return setPos(null)
    const r = btn.current.getBoundingClientRect()
    const h = (PICK_TYPES.length + (cur ? 2 : 1)) * 30 + 12
    setPos({ left: Math.min(Math.max(8, r.left), window.innerWidth - MENU_W - 8), top: r.bottom + 4 + h <= window.innerHeight ? r.bottom + 4 : Math.max(8, r.top - 4 - h) })
  }
  return (
    <span className="pick-wrap" onClick={(e) => e.stopPropagation()}>
      <button ref={btn} className={`pick-btn ${type ? 'picked' : ''}`} onClick={toggle} title={type ? `My pick: ${type.label}` : 'Add to My Picks'}>
        {type ? type.emoji : '＋'}
      </button>
      <GamblyButton text={betLine(d, prop, ctx.race)} />
      {pos && createPortal(
        <div ref={menu} className="pick-menu" style={{ left: pos.left, top: pos.top, width: MENU_W }}>
          <div className="pick-menu-title">{d.name}</div>
          {PICK_TYPES.map((t) => (
            <button key={t.key} className={cur?.type === t.key ? 'active' : ''} onClick={() => { setPick(d, t.key, ctx); setPos(null) }}>
              {t.emoji} {t.label}{cur?.type === t.key ? ' ✓' : ''}
            </button>
          ))}
          {cur && <button className="pick-remove" onClick={() => { removePick(id); setPos(null) }}>✕ Remove</button>}
        </div>,
        document.body,
      )}
    </span>
  )
}

export function Section({ title, sub, children }) {
  return (
    <div className="section-head">
      <h2>{title}</h2>
      {sub && <p className="muted">{sub}</p>}
      {children}
    </div>
  )
}

export function Pills({ options, value, onChange }) {
  return (
    <div className="pill-row">
      {options.map(([k, label, title]) => (
        <button key={String(k)} title={title} className={`pill ${value === k ? 'active' : ''}`} onClick={() => onChange(k)}>{label}</button>
      ))}
    </div>
  )
}

export function Finish({ n }) {
  if (n == null) return <span className="muted">—</span>
  return <span className={`fin ${n === 1 ? 'f1' : n <= 5 ? 'f5' : n <= 10 ? 'f10' : n >= 30 ? 'fbad' : ''}`}>{n}</span>
}
