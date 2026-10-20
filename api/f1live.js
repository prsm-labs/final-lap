// F1 live running order (Final Lap's Live tab, F1 mode). Source: ESPN's F1 scoreboard -- the session on track now (practice,
// sprint qualifying, sprint, qualifying or the Grand Prix), or one that finished in the last 3 hours. ESPN gives the running
// order and the lap count, not lap times. Cached 15 s at the edge.
export default async function handler(req, res) {
  try {
    const r = await fetch('https://site.api.espn.com/apis/site/v2/sports/racing/f1/scoreboard', { headers: { 'User-Agent': 'Mozilla/5.0 (FinalLap)' } })
    if (!r.ok) throw new Error(`espn ${r.status}`)
    const d = await r.json()
    const now = Date.now()
    let pick = null
    for (const e of d.events || []) {
      for (const c of e.competitions || []) {
        const st = c.status?.type || {}
        const start = Date.parse(c.date || c.startDate || '')
        const recent = st.state === 'post' && start && now - start < 5 * 3600e3
        if (st.state === 'in' || recent) {
          if (!pick || st.state === 'in') pick = { e, c, st }
        }
      }
    }
    res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=30')
    if (!pick) return res.status(200).json({ vehicles: [], sport: 'f1' })
    const { e, c, st } = pick
    const abbr = c.type?.abbreviation || ''
    const isRace = abbr === 'Race' || abbr === 'SR'
    const names = { FP1: 'Practice 1', FP2: 'Practice 2', FP3: 'Practice 3', SS: 'Sprint Qualifying', SR: 'Sprint', Qual: 'Qualifying', Race: 'Grand Prix' }
    const vehicles = (c.competitors || []).map((x) => ({
      pos: x.order,
      name: x.athlete?.displayName || x.athlete?.fullName || '',
      car: null,
      winner: !!x.winner,
    })).sort((a, b) => a.pos - b.pos)
    res.status(200).json({
      sport: 'f1',
      name: `${e.name || 'Grand Prix'} · ${names[abbr] || abbr}`,
      track: e.circuit?.fullName || '',
      run_type: isRace ? 3 : 1,
      lap: isRace ? c.status?.period : null,
      laps: null,
      flag: st.state === 'post' ? 'Finished' : 'Running',
      flag_state: st.state === 'post' ? 9 : 1,
      vehicles,
    })
  } catch (err) {
    res.status(200).json({ error: String(err), vehicles: [], sport: 'f1' })
  }
}
