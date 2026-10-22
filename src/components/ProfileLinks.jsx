// 🪪 📰 📊 profile links for the slideout header.
// 2026-10-22 (user): 🪪 bio · 📰 news · 📊 stats badges next to the name in the slideout; each opens in a new tab.
const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
const q = (s) => encodeURIComponent(fold(s))
const news = (name, league) => `https://news.google.com/search?q=${encodeURIComponent(`"${fold(name)}" ${league}`)}`
const badgeStyle = { textDecoration: 'none', fontSize: 15, lineHeight: 1, padding: '2px 3px', borderRadius: 6 }
function Badges({ links }) {
  return (
    <span className="profile-links" style={{ display: 'inline-flex', gap: 4, marginLeft: 6, verticalAlign: 'middle' }}>
      {links.filter((l) => l.href).map((l) => (
        <a key={l.icon} href={l.href} target="_blank" rel="noopener noreferrer" title={l.title} aria-label={l.title} style={badgeStyle}
          onClick={(e) => e.stopPropagation()}>{l.icon}</a>
      ))}
    </span>
  )
}

// Final Lap: NASCAR -> NASCAR.com driver page, Google News, Racing-Reference; F1 -> Formula1.com, Google News, StatsF1
const slug = (s) => fold(s).toLowerCase().replace(/\./g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
export default function ProfileLinks({ name, f1 }) {
  const rr = fold(name).replace(/\./g, '').trim().split(/\s+/).join('_')
  return <Badges links={f1 ? [
    { icon: '🪪', title: `${name} — bio (Formula1.com)`, href: `https://www.formula1.com/en/drivers/${slug(name)}` },
    { icon: '📰', title: `${name} — latest news`, href: news(name, 'F1') },
    { icon: '📊', title: `${name} — career stats (StatsF1)`, href: `https://www.statsf1.com/en/${slug(name)}.aspx` },
  ] : [
    { icon: '🪪', title: `${name} — bio (NASCAR.com)`, href: `https://www.nascar.com/drivers/${slug(name)}` },
    { icon: '📰', title: `${name} — latest news`, href: news(name, 'NASCAR') },
    { icon: '📊', title: `${name} — career stats (Racing-Reference)`, href: `https://www.racing-reference.info/driver/${rr}/` },
  ]} />
}
