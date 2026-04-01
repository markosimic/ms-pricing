import { createClient } from '@/app/lib/supabase/server'
import { redirect } from 'next/navigation'
import NavBar from '@/app/components/NavBar'
import Link from 'next/link'
import QuotesList from '@/app/components/QuotesList'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: quotes } = await supabase
    .from('quotes')
    .select('id, reference_code, client_name, status, created_at, final_price_chf, client_price_chf, output_currency_code, creator_email, creator_name, is_template, template_name, user_id')
    .eq('is_template', false)
    .order('created_at', { ascending: false })
    .limit(200)

  const { data: templates } = await supabase
    .from('quotes')
    .select('id, reference_code, client_name, template_name, created_at, client_price_chf, final_price_chf, output_currency_code')
    .eq('is_template', true)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-900">
      <NavBar userEmail={user.email ?? ''} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">

        {/* ── Introduction ─────────────────────────────────────────────── */}
        <div className="mb-10 bg-blue-950/30 border border-blue-800/40 rounded-xl p-6">
          <h2 className="text-base font-semibold text-gray-100 mb-1">MS Pricing Calculator</h2>
          <p className="text-sm text-gray-400 mb-5">
            Estimates the monthly subscription fee for a Zühlke Managed Services engagement.
            Use it during pre-sales to build a pricing proposal or stress-test cost assumptions before presenting to a client.
            The five-step wizard collects the inputs that drive the calculation — complete them in order.
          </p>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Key pricing drivers</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-2">
            {([
              ['Business Criticality', 'Determines the SLA tier and whether 24×7 coverage is needed. Higher criticality = larger, faster-response team.'],
              ['System Complexity', 'From the SDL assessment. Drives FTE estimates needed for stable operations. High complexity = more engineers.'],
              ['FTE Allocation', 'The primary cost variable. Every role and fraction multiplies directly into the base monthly cost.'],
              ['Delivery Location', 'GDC vs onshore rate is the biggest unit-cost lever. Language requirements may restrict GDC use for DACH clients.'],
              ['Support Level', 'Adding L1/L2 to L3 significantly expands team scope, language requirements, and overall cost.'],
              ['Coverage Hours', '24×7 vs 8×5 adds a substantial uplift multiplier on top of the base cost.'],
            ] as [string, string][]).map(([name, desc]) => (
              <div key={name} className="flex items-start gap-2">
                <span className="text-blue-400 mt-0.5 flex-shrink-0 text-xs">→</span>
                <p className="text-xs">
                  <span className="font-medium text-gray-300">{name}</span>
                  <span className="text-gray-500"> — {desc}</span>
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Templates section ─────────────────────────────────────────── */}
        {templates && templates.length > 0 && (
          <div className="mb-10">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Templates</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {templates.map(t => (
                <Link
                  key={t.id}
                  href={`/quotes/new?clone=${t.id}`}
                  className="bg-gray-800 border border-gray-700 hover:border-blue-600 rounded-lg px-4 py-3 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-200 truncate group-hover:text-blue-300">
                        {t.template_name || t.reference_code}
                      </p>
                      {t.client_name && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">{t.client_name}</p>
                      )}
                    </div>
                    <span className="text-xs bg-blue-900/40 text-blue-400 border border-blue-700/50 px-1.5 py-0.5 rounded flex-shrink-0">template</span>
                  </div>
                  {(t.client_price_chf ?? t.final_price_chf) && (
                    <p className="text-xs text-gray-500 mt-2">
                      CHF {Number(t.client_price_chf ?? t.final_price_chf).toLocaleString('de-CH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} / mo
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Quotes section ────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-100">Quotes</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your pricing calculations</p>
          </div>
          <Link
            href="/quotes/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
          >
            New quote
          </Link>
        </div>

        {quotes && quotes.length > 0 ? (
          <QuotesList quotes={quotes} currentUserId={user.id} />
        ) : (
          <div className="bg-gray-800 rounded-lg border border-gray-700 px-6 py-16 text-center">
            <p className="text-gray-500 text-sm">No quotes yet.</p>
            <Link
              href="/quotes/new"
              className="mt-4 inline-block bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
            >
              Create your first quote
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
