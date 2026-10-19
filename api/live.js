// NASCAR live timing proxy (Final Lap's Live tab). Source: cf.nascar.com/live/feeds/live-feed.json -- whichever race is on
// track right now (any series). Trimmed to what the leaderboard needs; cached 10 s at the edge.
const FLAGS = { 1: 'Green', 2: 'Caution', 3: 'Red', 4: 'Checkered', 8: 'Warm up', 9: 'Finished' }

export default async function handler(req, res) {
  try {
    const r = await fetch('https://cf.nascar.com/live/feeds/live-feed.json', { headers: { 'User-Agent': 'Mozilla/5.0 (FinalLap)' } })
    if (!r.ok) throw new Error(`feed ${r.status}`)
    const d = await r.json()
    const vehicles = (d.vehicles || []).map((v) => ({
      driver_id: v.driver?.driver_id,
      name: String(v.driver?.full_name || '').replace(/\s*\([^)]*\)\s*$/, '').replace(/^\*\s*/, '').trim(),
      car: v.vehicle_number,
      pos: v.running_position,
      start: v.starting_position,
      laps: v.laps_completed,
      led: (v.laps_led || []).reduce((s, x) => s + (x.end_lap - x.start_lap + 1), 0),
      delta: v.delta,
      status: v.status,
      onTrack: v.is_on_track,
      avgPos: v.average_running_position,
      fast: v.fastest_laps_run,
      pits: (v.pit_stops || []).filter((p) => p.pit_in_lap_count > 0).length,
    })).sort((a, b) => a.pos - b.pos)
    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=20')
    res.status(200).json({
      race_id: d.race_id, series_id: d.series_id, name: d.run_name, track: d.track_name, run_type: d.run_type,
      lap: d.lap_number, laps: d.laps_in_race, to_go: d.laps_to_go, flag: FLAGS[d.flag_state] || String(d.flag_state),
      flag_state: d.flag_state, cautions: d.number_of_caution_segments, leaders: d.number_of_leaders,
      lead_changes: d.number_of_lead_changes, stage: d.stage, updated: d.time_of_day_os, vehicles,
    })
  } catch (e) {
    res.status(502).json({ error: String(e) })
  }
}
