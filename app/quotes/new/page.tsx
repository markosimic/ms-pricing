import { createClient } from '@/app/lib/supabase/server'
import { redirect } from 'next/navigation'
import NavBar from '@/app/components/NavBar'
import QuoteWizard, { CloneData } from './QuoteWizard'

export default async function NewQuotePage({
  searchParams,
}: {
  searchParams: Promise<{ clone?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { clone } = await searchParams

  const [
    { data: serviceTypes },
    { data: deliveryLocations },
    { data: supportLevels },
    { data: coverageOptions },
    { data: currencies },
    { data: categoriesWithServices },
  ] = await Promise.all([
    supabase.from('service_types').select('*').order('name'),
    supabase.from('delivery_locations').select('*').order('hourly_rate_chf', { ascending: false }),
    supabase.from('support_levels').select('*').order('uplift_decimal'),
    supabase.from('coverage_options').select('*').order('uplift_decimal'),
    supabase.from('currencies').select('*').order('code'),
    supabase
      .from('service_categories')
      .select('*, service_types(name, slug), services(id, name, description, sort_order, default_selected, require_zuhlke_dev)')
      .order('sort_order'),
  ])

  let exchangeRates: Record<string, number> = { CHF: 1 }
  try {
    const res = await fetch('https://api.frankfurter.app/latest?from=CHF&to=EUR,GBP,SGD,HKD', {
      next: { revalidate: 3600 },
    })
    const data = await res.json()
    exchangeRates = { CHF: 1, ...data.rates }
  } catch {
    exchangeRates = { CHF: 1, EUR: 0.97, GBP: 0.83, SGD: 1.50, HKD: 8.72 }
  }

  // Clone: fetch source quote data if ?clone=id is present
  // Works for both regular quotes and templates (no user_id filter on templates)
  let initialData: CloneData | null = null
  if (clone) {
    const [{ data: src }, { data: srcServices }] = await Promise.all([
      supabase.from('quotes').select('*').eq('id', clone).single(),
      supabase.from('quote_services').select('service_id').eq('quote_id', clone),
    ])

    if (src) {
      initialData = {
        client_name:               src.client_name             ?? '',
        developed_by_zuhlke:       src.developed_by_zuhlke     ?? true,
        selected_service_type_ids: src.service_type_ids        ?? (src.service_type_id ? [src.service_type_id] : []),
        notes:                     src.notes                   ?? '',
        selected_service_ids:      srcServices?.map((s: { service_id: string }) => s.service_id) ?? [],
        business_criticality:      src.business_criticality    ?? null,
        system_complexity:         src.system_complexity       ?? '',
        service_manager_fte:       String(src.service_manager_fte ?? ''),
        app_engineer_fte:          String(src.app_engineer_fte   ?? ''),
        sre_devops_fte:            String(src.sre_devops_fte     ?? ''),
        working_hours_per_month:   src.working_hours_per_month  ?? 168,
        delivery_location_id:      src.delivery_location_id     ?? '',
        support_level_id:          src.support_level_id         ?? '',
        coverage_option_id:        src.coverage_option_id       ?? '',
        margin_pct:                src.margin_pct               ?? 30,
        discount_pct:              src.discount_pct             ?? 0,
        output_currency_code:      src.output_currency_code     ?? 'CHF',
        contract_duration_years:   src.contract_duration_years  ?? 3,
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <NavBar userEmail={user.email ?? ''} />
      <main className="max-w-3xl mx-auto px-6 py-10">
        <QuoteWizard
          serviceTypes={serviceTypes ?? []}
          categoriesWithServices={categoriesWithServices ?? []}
          deliveryLocations={deliveryLocations ?? []}
          supportLevels={supportLevels ?? []}
          coverageOptions={coverageOptions ?? []}
          currencies={currencies ?? []}
          exchangeRates={exchangeRates}
          userId={user.id}
          userEmail={user.email ?? ''}
          userName={
            (user.user_metadata?.full_name as string | undefined) ??
            (user.user_metadata?.name as string | undefined) ??
            user.email ??
            ''
          }
          initialData={initialData}
        />
      </main>
    </div>
  )
}
