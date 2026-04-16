import { auth } from '@/app/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { db, dec, fromJson } from '@/app/lib/db'
import NavBar from '@/app/components/NavBar'
import Link from 'next/link'
import TemplateToggleButton from '@/app/components/TemplateToggleButton'
import SendEmailForm from '@/app/components/SendEmailForm'


function fmtChf(n: number) {
  return `CHF ${n.toLocaleString('de-CH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function fmtAmt(n: number, symbol: string, code: string) {
  const f = n.toLocaleString('de-CH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  return code === 'CHF' ? `CHF ${f}` : `${symbol} ${f}`
}

function fmtDatetime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

const CRITICALITY_LABELS: Record<number, string> = {
  1: 'Critical',
  2: 'High',
  3: 'Medium',
  4: 'Low',
}

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) redirect('/login')
  const { user } = session

  const quote = await db.quotes.findUnique({
    where: { id },
    include: {
      service_types:      { select: { name: true, slug: true } },
      delivery_locations: { select: { name: true, hourly_rate_chf: true } },
      support_levels:     { select: { name: true, code: true, uplift_decimal: true } },
      coverage_options:   { select: { name: true, code: true, uplift_decimal: true } },
      sla_sizes:          { select: { name: true, code: true, uplift_decimal: true } },
    },
  })
  if (!quote) notFound()

  const [currencyRow, quoteServices, complexityScoresRaw] = await Promise.all([
    db.currencies.findFirst({
      where:  { code: quote.output_currency_code ?? 'CHF' },
      select: { symbol: true },
    }),
    db.quote_services.findMany({
      where:   { quote_id: id },
      include: {
        services: {
          // Cannot mix select + include at same level in Prisma — use nested select only
          select: {
            id:                 true,
            name:               true,
            service_categories: { select: { name: true } },
          },
        },
      },
    }),
    db.complexity_scores.findMany({
      where:   { quote_id: id },
      // orderBy on a relation field is not reliably supported in SQL Server — sort in JS
      include: { complexity_categories: { select: { name: true, weight: true, sort_order: true } } },
    }),
  ])

  // Deserialise JSON snapshot (stored as NVarChar in SQL Server)
  const rates = fromJson<Record<string, number>>(quote.exchange_rate_snapshot, {})

  const outCode   = quote.output_currency_code ?? 'CHF'
  const outSymbol = currencyRow?.symbol ?? outCode
  const exRate    = rates[outCode] ?? 1

  const hasNewPricing    = quote.client_price_chf != null
  const clientMonthChf   = dec(hasNewPricing ? quote.client_price_chf : quote.final_price_chf)
  const internalMonthChf = dec(hasNewPricing ? quote.internal_cost_chf : quote.final_price_chf)
  const marginPct        = dec(quote.margin_pct)
  const discountPct      = dec(quote.discount_pct)
  const contractYears    = quote.contract_duration_years ?? 3

  const monthlyChf = clientMonthChf
  const annualChf  = monthlyChf * 12
  const monthlyOut = monthlyChf * exRate
  const annualOut  = annualChf  * exRate

  const loc     = quote.delivery_locations ? { name: quote.delivery_locations.name, hourly_rate_chf: dec(quote.delivery_locations.hourly_rate_chf) } : null
  const support = quote.support_levels     ? { name: quote.support_levels.name, uplift_decimal: dec(quote.support_levels.uplift_decimal) } : null
  const cov     = quote.coverage_options   ? { name: quote.coverage_options.name, uplift_decimal: dec(quote.coverage_options.uplift_decimal) } : null
  const sla     = quote.sla_sizes          ? { name: quote.sla_sizes.name, uplift_decimal: dec(quote.sla_sizes.uplift_decimal) } : null

  const isOwner     = quote.user_id === user.id
  const isFinalized = quote.status === 'finalized'

  const staffing = [
    { label: 'Service Manager',       fte: dec(quote.service_manager_fte) },
    { label: 'Application Engineer',  fte: dec(quote.app_engineer_fte) },
    { label: 'SRE / DevOps Engineer', fte: dec(quote.sre_devops_fte) },
  ]
  const hasStaffingBreakdown = staffing.some(r => r.fte > 0)
  const totalFte = dec(quote.fte_estimate)

  const complexityScores = complexityScoresRaw
    .sort((a, b) => (a.complexity_categories?.sort_order ?? 0) - (b.complexity_categories?.sort_order ?? 0))
    .map(cs => ({
      score: dec(cs.score),
      complexity_categories: cs.complexity_categories
        ? { name: cs.complexity_categories.name, weight: dec(cs.complexity_categories.weight) }
        : null,
    }))

  return (
    <div className="min-h-screen bg-gray-900">
      <NavBar userEmail={user.email} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-300">← Quotes</Link>
            <div className="flex items-center gap-3 mt-1">
              <h1 className="text-2xl font-semibold text-gray-100">{quote.reference_code}</h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                isFinalized ? 'bg-green-900/40 text-green-400' : 'bg-yellow-900/30 text-yellow-400'
              }`}>
                {quote.status}
              </span>
            </div>
            {quote.client_name && (
              <p className="text-sm text-gray-500 mt-0.5">{quote.client_name}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-1">
            {isOwner && (
              <TemplateToggleButton
                quoteId={quote.id}
                isTemplate={quote.is_template ?? false}
                templateName={quote.template_name}
              />
            )}
            <Link
              href={`/quotes/new?clone=${id}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Clone
            </Link>
            {isFinalized && (
              <SendEmailForm quoteId={quote.id} defaultEmail={user.email ?? undefined} />
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">

            {/* Basic info */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-5">
              <h2 className="text-sm font-semibold text-gray-200 mb-4">Basic Information</h2>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                <div>
                  <p className="text-gray-500">Reference</p>
                  <p className="font-medium text-gray-100 mt-0.5">{quote.reference_code}</p>
                </div>
                <div>
                  <p className="text-gray-500">Client</p>
                  <p className="font-medium text-gray-100 mt-0.5">{quote.client_name || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Service type</p>
                  <p className="font-medium text-gray-100 mt-0.5">
                    {quote.service_types?.name ?? '—'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Created by</p>
                  <p className="font-medium text-gray-100 mt-0.5">{quote.creator_email ?? user.email ?? '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Created at</p>
                  <p className="font-medium text-gray-100 mt-0.5">{fmtDatetime(quote.created_at.toISOString())}</p>
                </div>
                {isFinalized && quote.finalized_at && (
                  <div>
                    <p className="text-gray-500">Finalized at</p>
                    <p className="font-medium text-gray-100 mt-0.5">{fmtDatetime(quote.finalized_at.toISOString())}</p>
                  </div>
                )}
                {isFinalized && (
                  <div className="col-span-2 bg-amber-900/20 border border-amber-700/30 rounded-md px-3 py-2 text-xs text-amber-400">
                    This quote is finalized and cannot be edited. Use <strong>Clone</strong> to create a new editable copy.
                  </div>
                )}
                {quote.notes && (
                  <div className="col-span-2">
                    <p className="text-gray-500">Notes</p>
                    <p className="font-medium text-gray-100 mt-0.5">{quote.notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Assessment */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-5">
              <h2 className="text-sm font-semibold text-gray-200 mb-4">Assessment</h2>
              <div className="grid grid-cols-2 gap-4 text-sm mb-5">
                <div>
                  <p className="text-gray-500">Business criticality</p>
                  <p className="font-medium text-gray-100 mt-0.5">
                    {quote.business_criticality ? CRITICALITY_LABELS[quote.business_criticality] : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">System complexity</p>
                  <p className={`font-medium mt-0.5 capitalize ${
                    quote.system_complexity === 'low'    ? 'text-green-400' :
                    quote.system_complexity === 'medium' ? 'text-yellow-400' :
                    quote.system_complexity === 'high'   ? 'text-red-400' : 'text-gray-100'
                  }`}>
                    {quote.system_complexity ?? '—'}
                  </p>
                </div>
              </div>

              {complexityScores.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Complexity scores</p>
                  <div className="border border-gray-700 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-700/50 border-b border-gray-700">
                          <th className="text-left px-3 py-2 text-xs font-medium text-gray-400">Category</th>
                          <th className="text-center px-3 py-2 text-xs font-medium text-gray-400">Weight</th>
                          <th className="text-center px-3 py-2 text-xs font-medium text-gray-400">Score</th>
                          <th className="text-center px-3 py-2 text-xs font-medium text-gray-400">Weighted</th>
                        </tr>
                      </thead>
                      <tbody>
                        {complexityScores.map((cs, i) => {
                          if (!cs.complexity_categories) return null
                          return (
                            <tr key={i} className={`border-b border-gray-700 ${i % 2 === 0 ? 'bg-gray-800' : 'bg-gray-700/30'}`}>
                              <td className="px-3 py-2 text-gray-300 text-xs">{cs.complexity_categories.name}</td>
                              <td className="px-3 py-2 text-center text-xs text-gray-500">{cs.complexity_categories.weight}</td>
                              <td className="px-3 py-2 text-center text-xs font-medium text-gray-100">{cs.score}</td>
                              <td className="px-3 py-2 text-center text-xs text-gray-400">{(cs.score * cs.complexity_categories.weight).toFixed(2)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Services in scope — grouped by category */}
            {quoteServices.length > 0 && (() => {
              // Group services by category name
              const grouped = quoteServices.reduce<Record<string, string[]>>((acc, qs) => {
                const cat = qs.services.service_categories?.name ?? 'Other'
                if (!acc[cat]) acc[cat] = []
                acc[cat].push(qs.services.name)
                return acc
              }, {})
              return (
                <div className="bg-gray-800 rounded-lg border border-gray-700 p-5">
                  <h2 className="text-sm font-semibold text-gray-200 mb-3">
                    Services in scope
                    <span className="ml-2 text-gray-500 font-normal">({quoteServices.length})</span>
                  </h2>
                  <div className="space-y-3">
                    {Object.entries(grouped).map(([category, services]) => (
                      <div key={category}>
                        <p className="text-xs font-semibold text-blue-400 uppercase tracking-wide mb-1.5">{category}</p>
                        <div className="space-y-1">
                          {services.map((name, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                              <span className="text-gray-300">{name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}
          </div>

          {/* Right column — pricing */}
          <div className="space-y-6">

            {/* Price card */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-5">
              <h2 className="text-sm font-semibold text-gray-200 mb-4">Subscription fee</h2>

              <div className="mb-3">
                <p className="text-xs text-gray-500 mb-0.5">Monthly</p>
                <p className="text-2xl font-bold text-gray-100">
                  {fmtAmt(monthlyOut, outSymbol, outCode)}
                </p>
                {outCode !== 'CHF' && (
                  <p className="text-xs text-gray-500 mt-0.5">{fmtChf(monthlyChf)}</p>
                )}
              </div>

              <div className="bg-gray-700/50 rounded-md px-3 py-2.5 mb-4">
                <p className="text-xs text-gray-500 mb-0.5">Annual</p>
                <p className="text-lg font-semibold text-gray-200">
                  {fmtAmt(annualOut, outSymbol, outCode)}
                </p>
                {outCode !== 'CHF' && (
                  <p className="text-xs text-gray-500 mt-0.5">{fmtChf(annualChf)}</p>
                )}
              </div>

              <div className="border-t border-gray-700 pt-3 space-y-2 text-sm">
                <div className="flex justify-between text-gray-400">
                  <span>Total FTE</span>
                  <span>{totalFte}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Hours/month</span>
                  <span>{quote.working_hours_per_month}</span>
                </div>
                {loc && (
                  <div className="flex justify-between text-gray-400">
                    <span>Rate</span>
                    <span>
                      {outCode === 'CHF'
                        ? `CHF ${loc.hourly_rate_chf}/hr`
                        : `${outSymbol} ${(loc.hourly_rate_chf * exRate).toFixed(0)}/hr`}
                    </span>
                  </div>
                )}
                {hasNewPricing && (
                  <>
                    <div className="border-t border-gray-700 pt-2 flex justify-between text-gray-400">
                      <span>Internal cost / mo</span>
                      <span>{fmtAmt(internalMonthChf * exRate, outSymbol, outCode)}</span>
                    </div>
                    {marginPct > 0 && (
                      <div className="flex justify-between text-green-400">
                        <span>Margin (+{marginPct}%)</span>
                        <span>+{fmtAmt(internalMonthChf * (marginPct / 100) * exRate, outSymbol, outCode)}</span>
                      </div>
                    )}
                    {discountPct > 0 && (
                      <div className="flex justify-between text-orange-400">
                        <span>Discount (−{discountPct}%)</span>
                        <span>−{fmtAmt(internalMonthChf * (1 + marginPct / 100) * (discountPct / 100) * exRate, outSymbol, outCode)}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Staffing breakdown */}
            {hasStaffingBreakdown && (
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-5">
                <h2 className="text-sm font-semibold text-gray-200 mb-3">Service delivery staffing</h2>
                <div className="border border-gray-700 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <tbody>
                      {staffing.map((row, i) => (
                        <tr key={i} className={`border-b border-gray-700 ${i % 2 === 0 ? 'bg-gray-800' : 'bg-gray-700/30'}`}>
                          <td className="px-3 py-2 text-xs text-gray-400">{row.label}</td>
                          <td className="px-3 py-2 text-right text-xs font-medium text-gray-200">{row.fte.toFixed(1)} FTE</td>
                        </tr>
                      ))}
                      <tr className="bg-blue-900/30">
                        <td className="px-3 py-2 text-xs font-semibold text-blue-300">Total</td>
                        <td className="px-3 py-2 text-right text-xs font-bold text-blue-200">{totalFte.toFixed(1)} FTE</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Pricing parameters */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-5">
              <h2 className="text-sm font-semibold text-gray-200 mb-4">Pricing parameters</h2>
              <div className="space-y-3 text-sm">
                {loc && (
                  <div>
                    <p className="text-gray-500">Location</p>
                    <p className="font-medium text-gray-100 mt-0.5">{loc.name} · CHF {loc.hourly_rate_chf}/hr</p>
                  </div>
                )}
                {support && (
                  <div>
                    <p className="text-gray-500">Support level</p>
                    <p className="font-medium text-gray-100 mt-0.5">
                      {support.name} ({support.uplift_decimal > 0 ? '+' : ''}{(support.uplift_decimal * 100).toFixed(0)}%)
                    </p>
                  </div>
                )}
                {cov && (
                  <div>
                    <p className="text-gray-500">Coverage</p>
                    <p className="font-medium text-gray-100 mt-0.5">
                      {cov.name} ({cov.uplift_decimal > 0 ? '+' : ''}{(cov.uplift_decimal * 100).toFixed(0)}%)
                    </p>
                  </div>
                )}
                {sla && (
                  <div>
                    <p className="text-gray-500">SLA size</p>
                    <p className="font-medium text-gray-100 mt-0.5">
                      Size {sla.name} ({sla.uplift_decimal > 0 ? '+' : ''}{(sla.uplift_decimal * 100).toFixed(0)}%)
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-gray-500">Contract duration</p>
                  <p className="font-medium text-gray-100 mt-0.5">
                    {contractYears} {contractYears === 1 ? 'year' : 'years'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Currency</p>
                  <p className="font-medium text-gray-100 mt-0.5">{outCode}</p>
                </div>
              </div>
            </div>

            {/* Exchange rates snapshot */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-5">
              <h2 className="text-sm font-semibold text-gray-200 mb-3">Exchange rates at creation</h2>
              <div className="space-y-1.5 text-sm">
                {Object.entries(rates).map(([code, rate]) => (
                  <div
                    key={code}
                    className={`flex justify-between ${code === outCode ? 'font-semibold text-blue-400' : 'text-gray-400'}`}
                  >
                    <span>CHF → {code}</span>
                    <span>
                      {Number(rate).toFixed(4)}
                      {code === outCode && <span className="ml-1 text-xs font-normal text-blue-500">(applied)</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}
