// CSV export: cols = [[header, row => value], ...]. Excel-friendly (BOM, quoted text, CRLF).
const cell = (v) => {
  if (v == null) return ''
  const s = String(v)
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(rows, cols) {
  return [cols.map(([h]) => cell(h)).join(','), ...rows.map((r) => cols.map(([, f]) => cell(f(r))).join(','))].join('\r\n')
}

export function downloadCsv(filename, rows, cols) {
  const blob = new Blob(['﻿', toCsv(rows, cols)], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename.replace(/[^\w.-]+/g, '_')
  document.body.appendChild(a)
  a.click()
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove() }, 1000)
}

export const slug = (...parts) => parts.filter(Boolean).join(' ').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
