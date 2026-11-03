import { pct } from './offline.js'

// 2026-11-02 (user): what Final Lap's 📦 offline snapshot and data download hold (lib/offline.js does the work).
// Snapshot = each series' next race card, schedule, drivers, weekend, Race Sim, Track Record + results index. Download = our chances only.
const j = (u) => fetch(u, { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : null)).catch(() => null)
const SERIES = ['cup', 'oreilly', 'truck', 'f1']
const PER = ['drivers', 'next', 'schedule', 'track_record', 'weekend']
const LEVEL = { safe: 'Safe', mid: 'Mid-range', long: 'Long shot' }

export default {
  app: 'Final Lap',
  league: 'NASCAR + F1',
  url: 'https://auto.degenlabs.app',
  what: 'each series’ next race (Race Card, Projections, Weekend, Race Sim, Track Record)',
  tablesWhat: 'each series’ next-race chances for every driver and the PRISM Picks history',
  async label() {
    const n = await j('/data/cup/next.json')
    return n?.race ? `next Cup race ${n.race.date}` : ''
  },
  async files() {
    const nexts = await Promise.all(SERIES.map((s) => j(`/data/${s}/next.json`)))
    return [
      '/data/model.json', '/data/f1/model.json', '/data/prism_picks.json', '/data/race_sim_params.json',
      ...SERIES.flatMap((s) => [...PER.map((f) => `/data/${s}/${f}.json`), `/data/racesim/${s}.json`, `/data/results/${s}/index.json`]),
      ...SERIES.map((s, i) => (nexts[i]?.race?.race_id ? `/data/pairs/${s}/${nexts[i].race.race_id}.json` : null)).filter(Boolean),
    ]
  },
  async tables() {
    const [picks, ...nexts] = await Promise.all([j('/data/prism_picks.json'), ...SERIES.map((s) => j(`/data/${s}/next.json`))])
    const rows = nexts.flatMap((n) => (n?.drivers || []).map((d) => ({ n, d })))
    const pp = (picks?.races || []).flatMap((r) => [...(r.picks || []).map((k) => ({ r, k, lvl: 'PRISM Pick' })),
      ...Object.entries(r.tiers || {}).flatMap(([t, ks]) => (ks || []).map((k) => ({ r, k, lvl: LEVEL[t] || t })))])
    return [
      {
        name: 'next_races.csv', about: 'every driver in each series’ next race: win / top 3 / top 5 / top 10 chances, projected finish', rows,
        cols: [
          ['Series', (x) => x.n.label], ['Race', (x) => x.n.race?.name], ['Track', (x) => x.n.race?.track], ['Date', (x) => x.n.race?.date], ['Card stage', (x) => x.n.stage],
          ['Driver', (x) => x.d.name], ['Car', (x) => x.d.car], ['Team', (x) => x.d.team], ['Make', (x) => x.d.make], ['Start', (x) => x.d.start],
          ['Win %', (x) => pct(x.d.win)], ['Top 3 %', (x) => pct(x.d.top3)], ['Top 5 %', (x) => pct(x.d.top5)], ['Top 10 %', (x) => pct(x.d.top10)],
          ['Avg finish', (x) => x.d.avg?.toFixed(1)], ['Projected finish', (x) => x.d.proj_finish], ['Rating', (x) => x.d.rating?.toFixed(1)],
        ],
      },
      {
        name: 'prism_picks.csv', about: 'every PRISM Pick (and mid-range / long-shot level) so far with its result', rows: pp,
        cols: [['Series', (x) => x.r.series], ['Race', (x) => x.r.name], ['Date', (x) => x.r.date], ['Level', (x) => x.lvl], ['Driver', (x) => x.k.name], ['Pick', (x) => x.k.label],
          ['Our chance %', (x) => pct(x.k.chance)], ['Done it (recent races)', (x) => x.k.last?.[1]], ['Of races', (x) => x.k.last?.[0]], ['Finish', (x) => x.k.finish ?? x.k.actual], ['Result', (x) => x.k.result]],
      },
    ]
  },
}
