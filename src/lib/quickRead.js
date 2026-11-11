// 2026-11-11 Quick read (components/QuickRead.jsx, shared with CourtIQ / Slap Shot / Six Points): the driver slideout's short
// "why" box, built only from the model's own walk-forward-tested inputs (REPORT_FinalLap_Audit_2026-10-18.md + 10/19 / 10/20
// entries): track-type rating and this-track rating vs his overall rating, starting spot, final-practice speed. All are
// already inside his chances -- the box just says which way each pushes. Hot streaks / laps led / DNF rate / qualifying speed
// tested as nothing, chaos records as context only -> left out.
import { pickLines } from '../components/QuickRead.jsx'

const ord = (n) => { n = Math.round(n); return `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th'}` }
const pct = (v) => (v == null ? '—' : `${Math.round(v * 100)}%`)

export function quickReadDriver(d, { f1 = false, typeLabel, track } = {}) {
  if (!d || d.win == null) return null
  const c = []
  const back = f1 ? 15 : 25
  if (d.rating != null && d.type_rating != null && typeLabel) {
    const x = d.type_rating - d.rating
    if (Math.abs(x) >= 5) c.push({ dir: x > 0 ? 'up' : 'down', w: Math.min(4, Math.abs(x) / 3), text: `${x > 0 ? 'Better' : 'Weaker'} at ${/circuit/i.test(typeLabel) ? `${typeLabel.toLowerCase()}s` : `${typeLabel.toLowerCase()} tracks`}: rating ${Math.round(d.type_rating)} vs ${Math.round(d.rating)} overall` })
  }
  if (d.rating != null && d.trk_rating != null && (d.trk_fins?.length || 0) >= 2) { // one start isn't a pattern
    const x = d.trk_rating - d.rating
    if (Math.abs(x) >= 8) c.push({ dir: x > 0 ? 'up' : 'down', w: Math.min(3.5, Math.abs(x) / 4), text: `${x > 0 ? 'Runs well' : 'Has struggled'} here: track rating ${Math.round(d.trk_rating)} in ${d.trk_fins.length} starts` })
  }
  if (d.start) {
    if (d.start <= 5) c.push({ dir: 'up', w: 6 - d.start, text: `Starts ${ord(d.start)}` })
    else if (d.start >= back) c.push({ dir: 'down', w: 2, text: `Starts ${ord(d.start)}: a long way to the front` })
  }
  if (d.prac) {
    if (d.prac <= 5) c.push({ dir: 'up', w: 4 - d.prac / 2, text: `${ord(d.prac)} fastest in final practice` })
    else if (d.prac >= back) c.push({ dir: 'down', w: 1.5, text: `${ord(d.prac)} in final practice` })
  }
  return {
    title: `Quick read${track ? ` · ${track}` : ''}`,
    lines: pickLines(c),
    chances: `Win ${pct(d.win)} · ${f1 ? `Top 3 ${pct(d.top3)}` : `Top 5 ${pct(d.top5)}`} · Top 10 ${pct(d.top10)}`,
    note: 'Each line is already in his chances; this shows which way it pushes.',
    empty: 'Nothing stands out: his chances follow his overall rating.',
  }
}
