// Gambly (gambly.com) builds a bet slip at the user's sportsbook from plain text (Slap Shot / Six Points / CourtIQ pattern):
// copy the text, open gambly.com/chat?q=... with it typed in; nothing is sent until the user sends it. Final Lap shows no odds.
export const GAMBLY_PROPS = { win: 'To Win', top3: 'Top 3 Finish', top5: 'Top 5 Finish', top10: 'Top 10 Finish' }

export const betLine = (d, prop = 'win', race) => `${d.name}${race ? ` (${race})` : ''} — ${GAMBLY_PROPS[prop] || prop}`

export function betText(lines) {
  if (lines.length < 2) return lines.join('')
  return [...lines, `(${lines.length}-leg parlay)`].join('\n')
}

export const gamblyUrl = (text) => `https://gambly.com/chat?q=${encodeURIComponent(text)}`
