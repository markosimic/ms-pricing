import { auth } from '@/app/lib/auth'
import { redirect } from 'next/navigation'
import { db, dec, fromJson } from '@/app/lib/db'
import NavBar from '@/app/components/NavBar'
import QuoteWizard, { CloneData } from './QuoteWizard'

export default async function NewQuotePage({
  searchParams,
}: {
  searchParams: Promise<{ clone?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const { user } = session

  const { clone } = await searchParams

  const [
    serviceTypes,
    deliveryLocations,
    supportLevels,
    coverageOptions,
    slaSizes,
    currencies,
    categoriesWithServicesRaw,
  ] = await Promise.all([
    db.service_types.findMany({ orderBy: { name: 'asc' } }),
    db.delivery_locations.findMany({ orderBy: { hourly_rate_chf: 'asc' } }),
    db.support_levels.findMany({ orderBy: { uplift_decimal: 'asc' } }),
    db.coverage_options.findMany({ orderBy: { uplift_decimal: 'asc' } }),
    db.sla_sizes.findMany({ orderBy: { uplift_decimal: 'asc' } }),
    db.currencies.findMany({ orderBy: { code: 'asc' } }),
    db.service_categories.findMany({
      include: {
        service_types: { select: { name: true, slug: true } },
        services: {
          select: {
            id: true, name: true, description: true,
            sort_order: true, default_selected: true, require_zuhlke_dev: true,
          },
          orderBy: { sort_order: 'asc' },
        },
      },
      orderBy: { sort_order: 'asc' },
    }),
  ])

  // Normalise Decimal → number so it's serialisable for client components
  const deliveryLocationsNorm = deliveryLocations.map(l => ({
    ...l, hourly_rate_chf: dec(l.hourly_rate_chf),
  }))
  const supportLevelsNorm = supportLevels.map(s => ({
    ...s, uplift_decimal: dec(s.uplift_decimal),
  }))
  const coverageOptionsNorm = coverageOptions.map(c => ({
    ...c, uplift_decimal: dec(c.uplift_decimal),
  }))
  const slaSizesNorm = slaSizes.map(ss => ({
    ...ss, uplift_decimal: dec(ss.uplift_decimal),
  }))
  const categoriesWithServices = categoriesWithServicesRaw.map(cat => ({
    id: cat.id,
    name: cat.name,
    sort_order: cat.sort_order,
    service_types: cat.service_types,
    services: cat.services.map(s => ({ ...s, description: s.description ?? '' })),
  }))

  let exchangeRates: Record<string, number> = { CHF: 1 }
  try {
    const res = await fetch('https://api.frankfurter.app/latest?from=CHF&to=EUR,GBP,USD,SGD,HKD', {
      next: { revalidate: 3600 },
    })
    const data = await res.json()
    exchangeRates = { CHF: 1, ...data.rates }
  } catch {
    exchangeRates = { CHF: 1, EUR: 0.97, GBP: 0.83, USD: 1.11, SGD: 1.50, HKD: 8.72 }
  }

  // Clone: fetch source quote data if ?clone=id is present
  let initialData: CloneData | null = null
  if (clone) {
    const [src, srcServices] = await Promise.all([
      db.quotes.findUnique({ where: { id: clone } }),
      db.quote_services.findMany({
        where:  { quote_id: clone },
        select: { service_id: true },
      }),
    ])

    if (src) {
      // service_type_ids stored as JSON string in SQL Server
      const parsedTypeIds = fromJson<string[]>(src.service_type_ids, [])

      initialData = {
        client_name:               src.client_name              ?? '',
        developed_by_zuhlke:       src.developed_by_zuhlke      ?? true,
        selected_service_type_ids: parsedTypeIds.length > 0
          ? parsedTypeIds
          : src.service_type_id ? [src.service_type_id] : [],
        notes:                     src.notes                    ?? '',
        selected_service_ids:      srcServices.map(s => s.service_id),
        business_criticality:      src.business_criticality     ?? null,
        system_complexity:         src.system_complexity        ?? '',
        service_manager_fte:       String(src.service_manager_fte ?? ''),
        app_engineer_fte:          String(src.app_engineer_fte   ?? ''),
        sre_devops_fte:            String(src.sre_devops_fte     ?? ''),
        working_hours_per_month:   src.working_hours_per_month  ?? 168,
        delivery_location_id:      src.delivery_location_id     ?? '',
        support_level_id:          src.support_level_id         ?? '',
        coverage_option_id:        src.coverage_option_id       ?? '',
        sla_size_id:               src.sla_size_id              ?? '',
        margin_pct:                dec(src.margin_pct)          || 30,
        discount_pct:              dec(src.discount_pct)        || 0,
        output_currency_code:      src.output_currency_code     ?? 'CHF',
        contract_duration_years:   src.contract_duration_years  ?? 3,
        number_of_apps_code:       '1-2',
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <NavBar userEmail={user.email} />
      <main className="max-w-3xl mx-auto px-6 py-10">
        <QuoteWizard
          serviceTypes={serviceTypes}
          categoriesWithServices={categoriesWithServices}
          deliveryLocations={deliveryLocationsNorm}
          supportLevels={supportLevelsNorm}
          coverageOptions={coverageOptionsNorm}
          slaSizes={slaSizesNorm}
          currencies={currencies}
          exchangeRates={exchangeRates}
          initialData={initialData}
        />
      </main>
    </div>
  )
}
