'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import TemplateToggleButton from './TemplateToggleButton'

interface Quote {
  id: string
  reference_code: string
  client_name: string | null
  status: string
  created_at: string
  final_price_chf: number | null
  client_price_chf: number | null
  output_currency_code: string
  creator_email: string | null
  creator_name: string | null
  is_template: boolean
  template_name: string | null
  user_id: string
}

type SortKey = 'created_at' | 'client_name' | 'creator_name'
type SortDir = 'asc' | 'desc'

export default function QuotesList({ quotes, currentUserId }: { quotes: Quote[]; currentUserId: string }) {
  const [query, setQuery]   = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'created_at' ? 'desc' : 'asc')
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q
      ? quotes.filter(r =>
          (r.reference_code ?? '').toLowerCase().includes(q) ||
          (r.client_name   ?? '').toLowerCase().includes(q) ||
          (r.creator_name  ?? '').toLowerCase().includes(q) ||
          (r.creator_email ?? '').toLowerCase().includes(q)
        )
      : quotes

    return [...list].sort((a, b) => {
      let av: string
      let bv: string
      if (sortKey === 'created_at') {
        av = a.created_at
        bv = b.created_at
      } else if (sortKey === 'client_name') {
        av = (a.client_name ?? '').toLowerCase()
        bv = (b.client_name ?? '').toLowerCase()
      } else {
        av = (a.creator_name ?? a.creator_email ?? '').toLowerCase()
        bv = (b.creator_name ?? b.creator_email ?? '').toLowerCase()
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [quotes, query, sortKey, sortDir])

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span className="ml-1 text-gray-600">↕</span>
    return <span className="ml-1 text-blue-400">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  function ColHeader({ col, label }: { col: SortKey; label: string }) {
    return (
      <th
        className="text-left px-5 py-3 font-medium text-gray-400 cursor-pointer select-none hover:text-gray-200 whitespace-nowrap"
        onClick={() => toggleSort(col)}
      >
        {label}<SortIcon col={col} />
      </th>
    )
  }

  return (
    <div>
      {/* Search */}
      <div className="mb-4">
        <input
          type="search"
          placeholder="Search by reference, client or author…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full sm:w-80 bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-gray-800 rounded-lg border border-gray-700 px-6 py-10 text-center">
          <p className="text-gray-500 text-sm">No quotes match your search.</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700 bg-gray-700/50">
                    <th className="text-left px-5 py-3 font-medium text-gray-400">Reference</th>
                    <ColHeader col="client_name" label="Client" />
                    <th className="text-left px-5 py-3 font-medium text-gray-400">Status</th>
                    <ColHeader col="creator_name" label="Author" />
                    <th className="text-left px-5 py-3 font-medium text-gray-400">Monthly price</th>
                    <ColHeader col="created_at" label="Created" />
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(q => {
                    const dt = new Date(q.created_at)
                    const dateStr = dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                    const timeStr = dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
                    const authorLabel = q.creator_name && q.creator_name !== q.creator_email
                      ? q.creator_name
                      : (q.creator_email ?? '—')
                    return (
                      <tr key={q.id} className="border-b border-gray-700 hover:bg-gray-700/30">
                        <td className="px-5 py-3.5 font-medium text-gray-200">{q.reference_code}</td>
                        <td className="px-5 py-3.5 text-gray-400">{q.client_name ?? '—'}</td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            q.status === 'finalized'
                              ? 'bg-green-900/40 text-green-400'
                              : 'bg-yellow-900/30 text-yellow-400'
                          }`}>
                            {q.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-gray-400 text-xs">{authorLabel}</td>
                        <td className="px-5 py-3.5 text-gray-200">
                          {(q.client_price_chf ?? q.final_price_chf)
                            ? `CHF ${Number(q.client_price_chf ?? q.final_price_chf).toLocaleString('de-CH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                            : '—'}
                        </td>
                        <td className="px-5 py-3.5 text-gray-500">
                          <span>{dateStr}</span>
                          <span className="ml-1.5 text-gray-600 text-xs">{timeStr}</span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-3">
                            {q.user_id === currentUserId && (
                              <TemplateToggleButton quoteId={q.id} isTemplate={false} />
                            )}
                            <Link href={`/quotes/new?clone=${q.id}`} className="text-gray-500 hover:text-gray-300 text-xs">
                              Clone
                            </Link>
                            <Link href={`/quotes/${q.id}`} className="text-blue-400 hover:underline text-sm">
                              Open
                            </Link>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile card list */}
          <div className="sm:hidden space-y-3">
            {filtered.map(q => {
              const dt = new Date(q.created_at)
              const dateStr = dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
              const authorLabel = q.creator_name && q.creator_name !== q.creator_email
                ? q.creator_name
                : (q.creator_email ?? '')
              return (
                <div key={q.id} className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="text-sm font-medium text-gray-200">{q.reference_code}</p>
                      {q.client_name && <p className="text-xs text-gray-500 mt-0.5">{q.client_name}</p>}
                      {authorLabel && <p className="text-xs text-gray-600 mt-0.5">{authorLabel}</p>}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium flex-shrink-0 ${
                      q.status === 'finalized'
                        ? 'bg-green-900/40 text-green-400'
                        : 'bg-yellow-900/30 text-yellow-400'
                    }`}>
                      {q.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-100">
                        {(q.client_price_chf ?? q.final_price_chf)
                          ? `CHF ${Number(q.client_price_chf ?? q.final_price_chf).toLocaleString('de-CH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                          : '—'}
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5">{dateStr}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {q.user_id === currentUserId && (
                        <TemplateToggleButton quoteId={q.id} isTemplate={false} />
                      )}
                      <Link href={`/quotes/new?clone=${q.id}`} className="text-gray-500 text-xs">Clone</Link>
                      <Link href={`/quotes/${q.id}`} className="text-blue-400 text-sm">Open</Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
