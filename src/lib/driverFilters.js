import { useSyncExternalStore } from 'react'

// 2026-10-25 (user: the same filter panel in every app -- tags, listed Top / PRISM Pick, open / close): Projections' driver
// filters, drawn by components/FilterPanel.jsx. Within a group a driver needs any of the options chosen; tags match all (or
// any); across groups he has to pass every one. The driver search stays the shared searchStore.
const DEFAULTS = { minWin: null, minTop10: null, top: [], prism: [], tags: [], tagsNot: [], tagsMode: 'all', make: [] }
let state = { ...DEFAULTS }
const listeners = new Set()
export const setDriverFilter = (k, v) => { state = { ...state, [k]: v }; listeners.forEach((fn) => fn()) }
export const clearDriverFilters = () => { state = { ...DEFAULTS }; listeners.forEach((fn) => fn()) }
export const useDriverFilters = () => useSyncExternalStore((fn) => { listeners.add(fn); return () => listeners.delete(fn) }, () => state, () => state)

// card: the race on screen (next or a past race from the 📅 picker); prism: prism_picks.json
export function driverGroups(card, prism, series) {
  const f1 = series === 'f1'
  const top = new Map()
  for (const t of card?.picks || []) for (const d of t.drivers || []) top.set(d.driver_id, [...(top.get(d.driver_id) || []), t.tier])
  const rid = card?.race?.race_id ?? card?.race?.id
  const race = prism?.races?.find((r) => r.series === series && r.race_id === rid)
  const pr = new Map()
  const addP = (id, lv) => pr.set(id, [...(pr.get(id) || []), lv])
  for (const c of race?.picks || []) addP(c.driver_id, 'safe')
  for (const lv of ['mid', 'long']) for (const c of race?.tiers?.[lv] || []) addP(c.driver_id, lv)
  const tagOpts = []
  for (const d of card?.drivers || []) for (const t of d.tags || []) if (!tagOpts.some((o) => o.v === t.key)) tagOpts.push({ v: t.key, label: t.label, title: t.title?.split(':')[0] })
  const makes = [...new Set((card?.drivers || []).map((d) => (f1 ? d.team : d.make)).filter(Boolean))].sort()
  return [
    { key: 'minWin', label: 'Win %', chip: '', type: 'one', test: (d, v) => (d.win ?? 0) * 100 >= v, anyLabel: 'Any win %',
      options: [5, 10, 20].map((v) => ({ v, label: `Win ${v}%+` })) },
    { key: 'minTop10', label: 'Top 10 %', chip: '', type: 'one', test: (d, v) => (d.top10 ?? 0) * 100 >= v, anyLabel: 'Any top 10 %',
      options: [25, 50, 75].map((v) => ({ v, label: `Top 10 ${v}%+` })) },
    { key: 'top', label: 'Top Picks', chip: 'Top Pick', type: 'multi', get: (d) => { const t = top.get(d.driver_id) || []; return t.length ? [...t, '*'] : t },
      options: [{ v: '*', label: '🏆 Any Top Pick' }, ...(card?.picks || []).map((t) => ({ v: t.tier, label: t.tier }))], hint: "Drivers listed on this race's Top Picks" },
    { key: 'prism', label: 'PRISM Picks', chip: 'PRISM', type: 'multi', get: (d) => pr.get(d.driver_id) || [],
      options: [{ v: 'safe', label: '💎 PRISM Pick' }, ...(f1 ? [] : [{ v: 'mid', label: '⚖️ Mid-range' }, { v: 'long', label: '🌠 Long shot' }])] },
    { key: 'tags', label: 'Tags', chip: '', type: 'tags', get: (d) => (d.tags || []).map((t) => t.key), options: tagOpts },
    { key: 'make', label: f1 ? 'Team' : 'Make', chip: '', type: 'multi', get: (d) => (f1 ? d.team : d.make), options: makes.map((m) => ({ v: m, label: m })) },
  ]
}
