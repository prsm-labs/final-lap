import { useMemo, useState } from 'react'

// Sortable tables: click a header to sort, again to flip. Values can be nested via a getter.
export function useSort(rows, defaultKey, defaultDir = 'desc', getters = {}) {
  const [key, setKey] = useState(defaultKey)
  const [dir, setDir] = useState(defaultDir)
  const sorted = useMemo(() => {
    if (!rows) return rows
    const get = getters[key] || ((r) => r[key])
    return [...rows].sort((a, b) => {
      const av = get(a)
      const bv = get(b)
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      if (typeof av === 'string') return dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      return dir === 'asc' ? av - bv : bv - av
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, key, dir])
  const toggle = (k) => {
    if (k === key) setDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setKey(k); setDir(k === 'name' || k === 'team' ? 'asc' : 'desc') }
  }
  return { sorted, sortKey: key, sortDir: dir, toggle }
}

export function Th({ k, label, title, sort, className }) {
  const on = sort.sortKey === k
  return (
    <th className={`sortable ${on ? 'sorted' : ''} ${className || ''}`} title={title} onClick={() => sort.toggle(k)}>
      {label}{on ? (sort.sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
    </th>
  )
}
