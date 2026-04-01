'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/client'
import InfoTooltip from '@/app/components/InfoTooltip'

// ── Types ──────────────────────────────────────────────────────────────────

interface ServiceType { id: string; name: string; slug: string }
interface Service {
  id: string; name: string; description: string; sort_order: number
  default_selected: boolean; require_zuhlke_dev: boolean
}
interface ServiceCategory {
  id: string; name: string; sort_order: number
  service_types: { name: string; slug: string }
  services: Service[]
}
interface DeliveryLocation { id: string; name: string; hourly_rate_chf: number }
interface SupportLevel { id: string; name: string; code: string; uplift_decimal: number }
interface CoverageOption { id: string; name: string; code: string; uplift_decimal: number }
interface Currency { id: string; code: string; symbol: string; name: string }

interface FormData {
  reference_code: string
  client_name: string
  developed_by_zuhlke: boolean
  selected_service_type_ids: string[]
  notes: string
  selected_service_ids: string[]
  business_criticality: number | null
  system_complexity: string
  service_manager_fte: string
  app_engineer_fte: string
  sre_devops_fte: string
  working_hours_per_month: number
  delivery_location_id: string
  support_level_id: string
  coverage_option_id: string
  margin_pct: number
  discount_pct: number
  output_currency_code: string
  contract_duration_years: number
}

export interface CloneData {
  client_name?: string
  developed_by_zuhlke?: boolean
  selected_service_type_ids?: string[]
  notes?: string
  selected_service_ids?: string[]
  business_criticality?: number | null
  system_complexity?: string
  service_manager_fte?: string
  app_engineer_fte?: string
  sre_devops_fte?: string
  working_hours_per_month?: number
  delivery_location_id?: string
  support_level_id?: string
  coverage_option_id?: string
  margin_pct?: number
  discount_pct?: number
  output_currency_code?: string
  contract_duration_years?: number
}

interface Props {
  serviceTypes: ServiceType[]
  categoriesWithServices: ServiceCategory[]
  deliveryLocations: DeliveryLocation[]
  supportLevels: SupportLevel[]
  coverageOptions: CoverageOption[]
  currencies: Currency[]
  exchangeRates: Record<string, number>
  userId: string
  userEmail: string
  userName: string
  initialData?: CloneData | null
}

// ── Constants ──────────────────────────────────────────────────────────────

const STEPS = ['Basic Info', 'Services', 'Assessment', 'Pricing', 'Review']

const CRITICALITY_OPTIONS = [
  { value: 1, label: 'Critical',  description: 'Most (>50%) impacts are business-threatening — P1: ≤1 hr response · ≤8 hr resolution · 24×7 coverage mandatory' },
  { value: 2, label: 'High',      description: 'Most impacts significant, some (<50%) business-threatening — P1: <4 hr response · 1 business day resolution · Extended coverage' },
  { value: 3, label: 'Medium',    description: 'Some (<50%) impacts significant, none business-threatening — P1: 8 hr response · 48 hr resolution · Standard hours' },
  { value: 4, label: 'Low',       description: 'Most impacts negligible, no business-threatening impacts — P1: best effort response · standard business hours' },
]

const COMPLEXITY_OPTIONS = [
  { value: 'low',    label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high',   label: 'High' },
]

const STAFFING_ROWS = [
  { key: 'service_manager_fte' as const, label: 'Service Manager' },
  { key: 'app_engineer_fte' as const,   label: 'Application Engineer' },
  { key: 'sre_devops_fte' as const,     label: 'SRE / DevOps Engineer' },
]

const CONTRACT_DURATION_OPTIONS = Array.from({ length: 15 }, (_, i) => i + 1)

// ── Contextual help ────────────────────────────────────────────────────────

const CONFLUENCE_LEADS_URL = 'https://confluence.zuehlke.com/spaces/AMSZTG/pages/395250203/Our+Team'

const STEP_INTRO = [
  'Start by identifying the engagement and selecting the service type(s). The service type determines which operational services are available in the next step.',
  'Select the specific services included in this engagement. Defaults are pre-filled based on your service type. This defines scope but does not directly affect the monthly price.',
  'Business Criticality and System Complexity are the two non-financial inputs that calibrate the engagement. They inform the SLA tier and help validate the FTE estimates in the next step.',
  'Define the delivery team, location, and commercial parameters. These fields calculate the monthly subscription fee. The live preview at the bottom right updates as you make changes.',
  'Review all inputs before saving. A finalized quote locks the calculation and can serve as the basis for client proposal documents.',
]

function HelpLink() {
  return (
    <div className="pt-4 mt-2 border-t border-gray-700/50">
      <p className="text-xs text-gray-500">
        Need help?{' '}
        <a
          href={CONFLUENCE_LEADS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 hover:underline"
        >
          Contact MS Commercial Lead
        </a>
      </p>
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtAmt(n: number, symbol: string, code: string) {
  const formatted = n.toLocaleString('de-CH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  return code === 'CHF' ? `CHF ${formatted}` : `${symbol} ${formatted}`
}

// ── Component ──────────────────────────────────────────────────────────────

export default function QuoteWizard({
  serviceTypes, categoriesWithServices, deliveryLocations,
  supportLevels, coverageOptions,
  currencies, exchangeRates,
  userId, userEmail, userName, initialData,
}: Props) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const didAutoSelect = useRef(false)

  // Collapsible state for each service type slug in step 2
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})

  // Derive default IDs from props (avoids hardcoding DB IDs)
  const defaultLocationId = deliveryLocations.find(l => l.name.includes('GDC'))?.id ?? ''
  const defaultSupportId  = supportLevels.find(s => s.code === 'l3')?.id ?? ''
  const defaultCoverageId = coverageOptions.find(c => c.code === '8x5')?.id ?? ''

  const [form, setForm] = useState<FormData>({
    reference_code:            '',
    client_name:               initialData?.client_name               ?? '',
    developed_by_zuhlke:       initialData?.developed_by_zuhlke       ?? true,
    selected_service_type_ids: initialData?.selected_service_type_ids ?? [],
    notes:                     initialData?.notes                     ?? '',
    selected_service_ids:      initialData?.selected_service_ids      ?? [],
    business_criticality:      initialData?.business_criticality      ?? null,
    system_complexity:         initialData?.system_complexity         ?? '',
    service_manager_fte:       initialData?.service_manager_fte       ?? '',
    app_engineer_fte:          initialData?.app_engineer_fte          ?? '',
    sre_devops_fte:            initialData?.sre_devops_fte            ?? '',
    working_hours_per_month:   initialData?.working_hours_per_month   ?? 168,
    delivery_location_id:      initialData?.delivery_location_id      ?? defaultLocationId,
    support_level_id:          initialData?.support_level_id          ?? defaultSupportId,
    coverage_option_id:        initialData?.coverage_option_id        ?? defaultCoverageId,
    margin_pct:                initialData?.margin_pct                ?? 30,
    discount_pct:              initialData?.discount_pct              ?? 0,
    output_currency_code:      initialData?.output_currency_code      ?? 'CHF',
    contract_duration_years:   initialData?.contract_duration_years   ?? 3,
  })

  const up = (patch: Partial<FormData>) => setForm(prev => ({ ...prev, ...patch }))

  // Auto-pre-select default services when entering step 2 for the first time
  useEffect(() => {
    if (step !== 1 || didAutoSelect.current) return
    if (form.selected_service_ids.length > 0) {
      didAutoSelect.current = true
      return
    }
    didAutoSelect.current = true
    const defaultIds: string[] = []
    for (const cat of categoriesWithServices) {
      const slug = cat.service_types?.slug
      if (!form.selected_service_type_ids.includes(
        serviceTypes.find(st => st.slug === slug)?.id ?? ''
      )) continue
      for (const svc of cat.services) {
        if (svc.default_selected) {
          if (!svc.require_zuhlke_dev || form.developed_by_zuhlke) {
            defaultIds.push(svc.id)
          }
        }
      }
    }
    if (defaultIds.length > 0) up({ selected_service_ids: defaultIds })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  // Initialise all groups as collapsed when entering step 2
  useEffect(() => {
    if (step !== 1) return
    const initial: Record<string, boolean> = {}
    for (const st of serviceTypes) {
      if (form.selected_service_type_ids.includes(st.id)) {
        initial[st.slug] = true // collapsed by default
      }
    }
    setCollapsedGroups(initial)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  // ── Derived ──────────────────────────────────────────────────────────────

  const selectedSlugs = useMemo(() =>
    new Set(serviceTypes.filter(st => form.selected_service_type_ids.includes(st.id)).map(st => st.slug)),
    [serviceTypes, form.selected_service_type_ids]
  )

  const selLocation = deliveryLocations.find(l => l.id === form.delivery_location_id)
  const selSupport  = supportLevels.find(s => s.id === form.support_level_id)
  const selCoverage = coverageOptions.find(c => c.id === form.coverage_option_id)
  const selCurrency = currencies.find(c => c.code === form.output_currency_code)
    ?? { symbol: form.output_currency_code, code: form.output_currency_code }

  const totalFte = useMemo(() =>
    (parseFloat(form.service_manager_fte) || 0)
    + (parseFloat(form.app_engineer_fte)  || 0)
    + (parseFloat(form.sre_devops_fte)    || 0),
    [form.service_manager_fte, form.app_engineer_fte, form.sre_devops_fte]
  )

  const exRate = exchangeRates[form.output_currency_code] ?? 1

  const baseChf = useMemo(() =>
    totalFte * (selLocation?.hourly_rate_chf ?? 0) * form.working_hours_per_month,
    [totalFte, selLocation, form.working_hours_per_month]
  )

  const internalCostChf = useMemo(() =>
    baseChf
    * (1 + (selSupport?.uplift_decimal  ?? 0))
    * (1 + (selCoverage?.uplift_decimal ?? 0)),
    [baseChf, selSupport, selCoverage]
  )

  const clientPriceChf = useMemo(() =>
    internalCostChf * (1 + form.margin_pct / 100) * (1 - form.discount_pct / 100),
    [internalCostChf, form.margin_pct, form.discount_pct]
  )

  const fmt    = (chfVal: number) => fmtAmt(chfVal * exRate, selCurrency.symbol, selCurrency.code)
  const fmtChf = (n: number) =>
    `CHF ${n.toLocaleString('de-CH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

  // ── Validation ───────────────────────────────────────────────────────────

  function canProceed(): boolean {
    if (step === 0) return form.reference_code.trim() !== '' && form.selected_service_type_ids.length > 0
    if (step === 1) return true
    if (step === 2) return form.business_criticality !== null && form.system_complexity !== ''
    if (step === 3) return (
      totalFte > 0 &&
      form.delivery_location_id !== '' &&
      form.support_level_id !== '' &&
      form.coverage_option_id !== ''
    )
    return true
  }

  // ── Save ─────────────────────────────────────────────────────────────────

  async function handleSave(status: 'draft' | 'finalized') {
    setSaving(true)
    setError('')
    const supabase = createClient()
    const now = new Date().toISOString()
    const clientPriceOut = clientPriceChf * exRate

    const { data: quote, error: qErr } = await supabase
      .from('quotes')
      .insert({
        user_id:                     userId,
        creator_email:               userEmail,
        creator_name:                userName || userEmail,
        reference_code:              form.reference_code,
        client_name:                 form.client_name || null,
        service_type_id:             form.selected_service_type_ids[0] ?? null,
        service_type_ids:            form.selected_service_type_ids,
        developed_by_zuhlke:         form.developed_by_zuhlke,
        service_manager_fte:         parseFloat(form.service_manager_fte) || 0,
        app_engineer_fte:            parseFloat(form.app_engineer_fte)   || 0,
        sre_devops_fte:              parseFloat(form.sre_devops_fte)     || 0,
        fte_estimate:                totalFte,
        working_hours_per_month:     form.working_hours_per_month,
        delivery_location_id:        form.delivery_location_id || null,
        business_criticality:        form.business_criticality,
        system_complexity:           form.system_complexity || null,
        support_level_id:            form.support_level_id || null,
        coverage_option_id:          form.coverage_option_id || null,
        sla_size_id:                 null,
        margin_pct:                  form.margin_pct,
        discount_pct:                form.discount_pct,
        output_currency_code:        form.output_currency_code,
        exchange_rate_snapshot:      exchangeRates,
        base_price_chf:              baseChf,
        internal_cost_chf:           internalCostChf,
        client_price_chf:            clientPriceChf,
        final_price_chf:             clientPriceChf,
        final_price_output_currency: clientPriceOut,
        notes:                       form.notes || null,
        contract_duration_years:     form.contract_duration_years,
        status,
        finalized_at:                status === 'finalized' ? now : null,
      })
      .select()
      .single()

    if (qErr || !quote) {
      setError('Failed to save quote. Please try again.')
      setSaving(false)
      return
    }

    if (form.selected_service_ids.length > 0) {
      await supabase.from('quote_services').insert(
        form.selected_service_ids.map(sid => ({ quote_id: quote.id, service_id: sid }))
      )
    }

    router.push('/')
    router.refresh()
  }

  // ── UI helpers ────────────────────────────────────────────────────────────

  function toggleService(id: string) {
    up({
      selected_service_ids: form.selected_service_ids.includes(id)
        ? form.selected_service_ids.filter(s => s !== id)
        : [...form.selected_service_ids, id],
    })
  }

  function toggleServiceType(id: string) {
    const next = form.selected_service_type_ids.includes(id)
      ? form.selected_service_type_ids.filter(s => s !== id)
      : [...form.selected_service_type_ids, id]
    didAutoSelect.current = false
    up({ selected_service_type_ids: next, selected_service_ids: [] })
  }

  function toggleZuhlkeDev(val: boolean) {
    const devEnvSvc = categoriesWithServices.flatMap(c => c.services).find(s => s.require_zuhlke_dev)
    if (!devEnvSvc) { up({ developed_by_zuhlke: val }); return }
    const current = form.selected_service_ids
    if (val) {
      const newIds = devEnvSvc.default_selected && !current.includes(devEnvSvc.id)
        ? [...current, devEnvSvc.id]
        : current
      up({ developed_by_zuhlke: val, selected_service_ids: newIds })
    } else {
      up({ developed_by_zuhlke: val, selected_service_ids: current.filter(id => id !== devEnvSvc.id) })
    }
  }

  // Select / deselect all services in a given slug group
  function toggleGroupAll(slug: string) {
    const groupCats = categoriesWithServices.filter(c => c.service_types?.slug === slug)
    const groupIds = groupCats.flatMap(c =>
      c.services
        .filter(s => !s.require_zuhlke_dev || form.developed_by_zuhlke)
        .map(s => s.id)
    )
    const allSelected = groupIds.every(id => form.selected_service_ids.includes(id))
    if (allSelected) {
      up({ selected_service_ids: form.selected_service_ids.filter(id => !groupIds.includes(id)) })
    } else {
      const merged = Array.from(new Set([...form.selected_service_ids, ...groupIds]))
      up({ selected_service_ids: merged })
    }
  }

  function isGroupAllSelected(slug: string): boolean {
    const groupCats = categoriesWithServices.filter(c => c.service_types?.slug === slug)
    const groupIds = groupCats.flatMap(c =>
      c.services
        .filter(s => !s.require_zuhlke_dev || form.developed_by_zuhlke)
        .map(s => s.id)
    )
    return groupIds.length > 0 && groupIds.every(id => form.selected_service_ids.includes(id))
  }

  const tileClass = (selected: boolean) =>
    `flex-1 border rounded-lg px-4 py-3 text-center cursor-pointer transition-colors ${
      selected
        ? 'border-blue-500 bg-blue-900/30 dark:border-blue-400'
        : 'border-gray-600 hover:border-gray-500 dark:border-gray-600'
    }`

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-100">
            {initialData ? 'New Quote (cloned)' : 'New Quote'}
          </h1>
          <p className="text-sm text-gray-400 mt-1">Step {step + 1} of {STEPS.length} — {STEPS[step]}</p>
        </div>
        <button onClick={() => router.push('/')} className="text-sm text-gray-400 hover:text-gray-200">
          Cancel
        </button>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
              i <= step ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'
            }`}>
              {i < step ? '✓' : i + 1}
            </div>
            <span className={`text-xs hidden sm:block ${i === step ? 'text-gray-100 font-medium' : 'text-gray-500'}`}>
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div className={`h-px w-6 ${i < step ? 'bg-blue-600' : 'bg-gray-700'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-6">

        {/* ── Step 1: Basic Info ────────────────────────────────────────── */}
        {step === 0 && (
          <div className="space-y-5">
            <p className="text-sm text-gray-400 -mt-1">{STEP_INTRO[0]}</p>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Reference code <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.reference_code}
                onChange={e => up({ reference_code: e.target.value })}
                placeholder="e.g. C-2024-0042"
                className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Client name</label>
              <input
                type="text"
                value={form.client_name}
                onChange={e => up({ client_name: e.target.value })}
                placeholder="Client or project name"
                className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Zühlke-developed toggle */}
            <div className="flex items-start gap-3 p-4 bg-blue-900/20 border border-blue-700/40 rounded-lg">
              <input
                type="checkbox"
                id="zuhlke-dev"
                checked={form.developed_by_zuhlke}
                onChange={e => toggleZuhlkeDev(e.target.checked)}
                className="mt-0.5 accent-blue-500 w-4 h-4 flex-shrink-0"
              />
              <label htmlFor="zuhlke-dev" className="cursor-pointer">
                <div className="text-sm font-medium text-gray-200">Solution developed by Zühlke</div>
                <div className="text-xs text-gray-400 mt-0.5">
                  Enables Development Environment Maintenance as a default service scope item
                </div>
              </label>
            </div>

            {/* Service type — multi-select */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Service type <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {serviceTypes.map(st => {
                  const selected = form.selected_service_type_ids.includes(st.id)
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => toggleServiceType(st.id)}
                      className={`border rounded-lg px-4 py-3 text-left transition-colors ${
                        selected
                          ? 'border-blue-500 bg-blue-900/30 text-blue-300'
                          : 'border-gray-600 text-gray-300 hover:border-gray-500'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-4 h-4 rounded border flex items-center justify-center text-xs flex-shrink-0 ${
                          selected ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-500'
                        }`}>
                          {selected && '✓'}
                        </span>
                        <div>
                          <div className="font-medium text-sm">{st.name}</div>
                          <div className="text-xs text-gray-500 uppercase tracking-wide">{st.slug}</div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
              {form.selected_service_type_ids.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">Select at least one service type to continue.</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={e => up({ notes: e.target.value })}
                rows={3}
                placeholder="Any additional context for this quote"
                className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            <HelpLink />
          </div>
        )}

        {/* ── Step 2: Services ──────────────────────────────────────────── */}
        {step === 1 && (
          <div>
            <p className="text-sm text-gray-400 mb-5">
              {STEP_INTRO[1]}
              {form.selected_service_ids.length > 0 && (
                <span className="ml-2 font-medium text-blue-400">
                  {form.selected_service_ids.length} selected
                </span>
              )}
            </p>

            {serviceTypes.filter(st => form.selected_service_type_ids.includes(st.id)).length === 0 ? (
              <p className="text-sm text-gray-500 italic">No service types selected.</p>
            ) : (
              <div className="space-y-4">
                {serviceTypes
                  .filter(st => form.selected_service_type_ids.includes(st.id))
                  .map(st => {
                    const groupCats = categoriesWithServices.filter(c => c.service_types?.slug === st.slug)
                    const collapsed  = collapsedGroups[st.slug] ?? true
                    const allSel     = isGroupAllSelected(st.slug)
                    const groupTotal = groupCats.flatMap(c =>
                      c.services.filter(s => !s.require_zuhlke_dev || form.developed_by_zuhlke)
                    ).length
                    const groupSelectedCount = groupCats.flatMap(c =>
                      c.services.filter(s =>
                        form.selected_service_ids.includes(s.id) &&
                        (!s.require_zuhlke_dev || form.developed_by_zuhlke)
                      )
                    ).length

                    return (
                      <div key={st.id} className="border border-gray-700 rounded-lg overflow-hidden">
                        {/* Group header */}
                        <div className="flex items-center justify-between px-4 py-3 bg-gray-750 border-b border-gray-700 bg-gray-700/50">
                          <button
                            type="button"
                            onClick={() => setCollapsedGroups(prev => ({ ...prev, [st.slug]: !prev[st.slug] }))}
                            className="flex items-center gap-2 text-left flex-1"
                          >
                            <span className={`text-gray-400 transition-transform ${collapsed ? '' : 'rotate-90'}`}>▶</span>
                            <span className="text-sm font-semibold text-gray-200">{st.name}</span>
                            <span className="text-xs text-gray-500 uppercase tracking-wide ml-1">{st.slug}</span>
                            <span className="text-xs text-gray-500 ml-2">
                              {groupSelectedCount}/{groupTotal} selected
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleGroupAll(st.slug)}
                            className="text-xs text-blue-400 hover:text-blue-300 ml-4 flex-shrink-0"
                          >
                            {allSel ? 'Deselect all' : 'Select all'}
                          </button>
                        </div>

                        {/* Group body */}
                        {!collapsed && (
                          <div className="p-4 space-y-5">
                            {groupCats.map(cat => (
                              <div key={cat.id}>
                                <h3 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
                                  {cat.name}
                                </h3>
                                <div className="space-y-2">
                                  {[...cat.services].sort((a, b) => a.sort_order - b.sort_order).map(svc => {
                                    const locked = svc.require_zuhlke_dev && !form.developed_by_zuhlke
                                    return (
                                      <label
                                        key={svc.id}
                                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                          locked
                                            ? 'border-gray-700 opacity-40 cursor-not-allowed'
                                            : form.selected_service_ids.includes(svc.id)
                                              ? 'border-blue-600/50 bg-blue-900/20'
                                              : 'border-gray-700 hover:border-gray-600 hover:bg-gray-700/50'
                                        }`}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={form.selected_service_ids.includes(svc.id)}
                                          onChange={() => !locked && toggleService(svc.id)}
                                          disabled={locked}
                                          className="mt-0.5 accent-blue-500"
                                        />
                                        <div>
                                          <div className="text-sm font-medium text-gray-200">{svc.name}</div>
                                          <div className="text-xs text-gray-500 mt-0.5">{svc.description}</div>
                                        </div>
                                      </label>
                                    )
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
              </div>
            )}
            <HelpLink />
          </div>
        )}

        {/* ── Step 3: Assessment ───────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-8">
            <p className="text-sm text-gray-400 -mt-1">{STEP_INTRO[2]}</p>

            {/* Business Criticality */}
            <div>
              <h3 className="text-sm font-semibold text-gray-200 mb-3 flex items-center">
                Business Criticality <span className="text-red-400 ml-1">*</span>
                <InfoTooltip width="w-96" content={
                  <div className="space-y-2">
                    <p className="font-semibold text-gray-100">Business Criticality</p>
                    <p>How important is this system to the client&apos;s operations? Determines SLA tier, coverage window, and response/resolution commitments for P1 incidents.</p>
                    <div className="mt-2 space-y-2 text-[11px]">
                      <div className="border-l-2 border-red-500 pl-2">
                        <p className="font-semibold text-red-400">Critical</p>
                        <p className="text-gray-400">Most (&gt;50%) impacts are business-threatening</p>
                        <p className="text-gray-300 mt-0.5">P1: ≤1 hr response · ≤8 hr resolution · <span className="text-red-300">24×7 coverage mandatory</span></p>
                      </div>
                      <div className="border-l-2 border-orange-500 pl-2">
                        <p className="font-semibold text-orange-400">High</p>
                        <p className="text-gray-400">Most impacts significant, some (&lt;50%) business-threatening</p>
                        <p className="text-gray-300 mt-0.5">P1: &lt;4 hr response · 1 business day resolution · Extended coverage</p>
                      </div>
                      <div className="border-l-2 border-yellow-500 pl-2">
                        <p className="font-semibold text-yellow-400">Medium</p>
                        <p className="text-gray-400">Some (&lt;50%) impacts significant, none business-threatening</p>
                        <p className="text-gray-300 mt-0.5">P1: 8 hr response · 48 hr resolution · Standard hours (09:00–17:00)</p>
                      </div>
                      <div className="border-l-2 border-green-600 pl-2">
                        <p className="font-semibold text-green-400">Low</p>
                        <p className="text-gray-400">Most impacts negligible, no business-threatening impacts</p>
                        <p className="text-gray-300 mt-0.5">P1: Best effort response · Standard hours (09:00–17:00)</p>
                      </div>
                    </div>
                    <p className="text-gray-500 pt-1 border-t border-gray-700 text-[11px]">Run the Business Criticality Assessment in Confluence before selecting a tier.</p>
                  </div>
                } />
              </h3>
              <div className="space-y-2">
                {CRITICALITY_OPTIONS.map(opt => (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      form.business_criticality === opt.value
                        ? 'border-blue-500 bg-blue-900/20'
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="criticality"
                      checked={form.business_criticality === opt.value}
                      onChange={() => up({ business_criticality: opt.value })}
                      className="mt-0.5 accent-blue-500"
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-200">{opt.label}</div>
                      <div className="text-xs text-gray-500">{opt.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* System Complexity */}
            <div>
              <h3 className="text-sm font-semibold text-gray-200 mb-1 flex items-center">
                System Complexity <span className="text-red-400 ml-1">*</span>
                <InfoTooltip width="w-80" content={
                  <div className="space-y-2">
                    <p className="font-semibold text-gray-100">System Complexity</p>
                    <p>Based on the SDL (Service Delivery Lead) assessment of the application. Complexity drives the FTE estimate needed for safe, stable operations.</p>
                    <ul className="space-y-1.5 mt-1">
                      <li><span className="text-green-400 font-medium">Low:</span> Simple application, few integrations, clean codebase with good documentation and high DevOps maturity.</li>
                      <li><span className="text-yellow-400 font-medium">Medium:</span> Multiple components or integrations, moderate DevOps tooling adoption.</li>
                      <li><span className="text-red-400 font-medium">High:</span> Microservices, complex business logic, many integrations, limited documentation, or low DevOps maturity.</li>
                    </ul>
                    <p className="text-gray-400 pt-1 border-t border-gray-700">Use the System Complexity Assessment framework in Confluence for a structured scoring approach.</p>
                  </div>
                } />
              </h3>
              <p className="text-xs text-gray-500 mb-3">
                Enter the complexity conclusion from the SDL assessment.
              </p>
              <div className="flex gap-3">
                {COMPLEXITY_OPTIONS.map(opt => (
                  <label key={opt.value} className={tileClass(form.system_complexity === opt.value)}>
                    <input
                      type="radio"
                      name="complexity"
                      checked={form.system_complexity === opt.value}
                      onChange={() => up({ system_complexity: opt.value })}
                      className="sr-only"
                    />
                    <div className="text-sm font-medium text-gray-200">{opt.label}</div>
                  </label>
                ))}
              </div>
            </div>

            <HelpLink />
          </div>
        )}

        {/* ── Step 4: Pricing ──────────────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-6">
            <p className="text-sm text-gray-400 -mt-1">{STEP_INTRO[3]}</p>

            {/* Currency */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Output currency</label>
              <select
                value={form.output_currency_code}
                onChange={e => up({ output_currency_code: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {currencies.map(c => (
                  <option key={c.code} value={c.code}>{c.symbol} {c.name} ({c.code})</option>
                ))}
              </select>
              {form.output_currency_code !== 'CHF' && (
                <p className="text-xs text-gray-500 mt-1">
                  All prices shown in {form.output_currency_code} · rate: 1 CHF = {exRate.toFixed(4)} {form.output_currency_code}
                </p>
              )}
            </div>

            {/* Staffing */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Service delivery staffing <span className="text-red-400">*</span>
              </label>
              <div className="border border-gray-700 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-700/50 border-b border-gray-700">
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400">Role</th>
                      <th className="text-center px-3 py-2.5 text-xs font-medium text-gray-400 w-32">FTE allocation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {STAFFING_ROWS.map((row, i) => (
                      <tr key={row.key} className={`border-b border-gray-700 ${i % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750 bg-gray-700/30'}`}>
                        <td className="px-4 py-2.5 text-xs font-medium text-gray-300">{row.label}</td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={form[row.key]}
                            onChange={e => up({ [row.key]: e.target.value })}
                            placeholder="0.0"
                            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-center text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-blue-900/30 border-t-2 border-blue-700/50">
                      <td className="px-4 py-2.5 text-xs font-semibold text-blue-300">Total FTE</td>
                      <td className="px-3 py-2.5 text-center text-sm font-bold text-blue-200">
                        {totalFte.toFixed(1)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Hours per month — read-only */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Hours per month</label>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-100">{form.working_hours_per_month} hrs</span>
                <span className="text-xs text-gray-500">Standard: 168 hrs/month (21 days × 8 hrs)</span>
              </div>
            </div>

            {/* Delivery location */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-300 mb-2">
                Delivery location <span className="text-red-400 ml-1">*</span>
                <InfoTooltip content={
                  <div className="space-y-2">
                    <p className="font-semibold text-gray-100">Delivery Location</p>
                    <p>Where the support team is based. The hourly rate is the primary cost multiplier — location choice has the biggest impact on overall price.</p>
                    <ul className="space-y-1.5 mt-1">
                      <li><span className="text-blue-300 font-medium">GDC (Global Delivery Center):</span> Nearshore/offshore. Lower rate. Check language requirements — German-speaking support for DACH clients may restrict GDC use.</li>
                      <li><span className="text-blue-300 font-medium">Onshore (CH/DE):</span> Higher rate. No language restrictions. Closer to client timezone.</li>
                    </ul>
                    <p className="text-gray-400 pt-1 border-t border-gray-700">For DACH engagements, always confirm language requirements with the client before selecting GDC.</p>
                  </div>
                } />
              </label>
              <div className="space-y-2">
                {deliveryLocations.map(loc => {
                  const locRateOut = loc.hourly_rate_chf * exRate
                  return (
                    <label
                      key={loc.id}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                        form.delivery_location_id === loc.id
                          ? 'border-blue-500 bg-blue-900/20'
                          : 'border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="location"
                          checked={form.delivery_location_id === loc.id}
                          onChange={() => up({ delivery_location_id: loc.id })}
                          className="accent-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-200">{loc.name}</span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {form.output_currency_code === 'CHF'
                          ? `CHF ${loc.hourly_rate_chf}/hr`
                          : `${selCurrency.symbol} ${locRateOut.toFixed(0)}/hr`}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Support level */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-300 mb-2">
                Support level <span className="text-red-400 ml-1">*</span>
                <InfoTooltip content={
                  <div className="space-y-2">
                    <p className="font-semibold text-gray-100">Support Level</p>
                    <p>Defines the layers of support Zühlke provides in this engagement.</p>
                    <ul className="space-y-1.5 mt-1">
                      <li><span className="text-blue-300 font-medium">L3 only:</span> Technical and engineering support. The client (or a subcontractor) handles L1/L2 end-user queries. Most common setup.</li>
                      <li><span className="text-blue-300 font-medium">L1+L2+L3:</span> Full support stack including end-user queries. Significantly expands team scope and cost. May restrict GDC use if German is required for DACH clients.</li>
                    </ul>
                  </div>
                } />
              </label>
              <div className="flex gap-3">
                {supportLevels.map(sl => (
                  <label key={sl.id} className={tileClass(form.support_level_id === sl.id)}>
                    <input type="radio" name="support" checked={form.support_level_id === sl.id}
                      onChange={() => up({ support_level_id: sl.id })} className="sr-only" />
                    <div className="text-sm font-medium text-gray-200">{sl.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {sl.uplift_decimal > 0 ? `+${(sl.uplift_decimal * 100).toFixed(0)}%` : 'Base'}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Coverage */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-300 mb-2">
                Coverage <span className="text-red-400 ml-1">*</span>
                <InfoTooltip width="w-80" content={
                  <div className="space-y-2">
                    <p className="font-semibold text-white">Coverage window</p>
                    <p>Controls how many hours per day the team is staffed and on-call. A wider window multiplies the base cost.</p>
                    <div className="mt-2 space-y-1.5">
                      <p><span className="text-blue-300 font-medium">Standard (8×5)</span> — 09:00–17:00, Mon–Fri. Suitable for Low / Medium criticality. No uplift.</p>
                      <p><span className="text-blue-300 font-medium">Extended (8×7)</span> — 06:00–20:00 including weekends. Required for High criticality or customer-facing services with weekend traffic.</p>
                      <p><span className="text-blue-300 font-medium">24×7</span> — Full around-the-clock coverage. Mandatory for Critical (BC1) systems. Adds a significant cost multiplier.</p>
                    </div>
                    <p className="text-gray-400 text-[11px] mt-1">Coverage tier must align with the Business Criticality SLA target selected in Step 3.</p>
                  </div>
                } />
              </label>
              <div className="flex gap-3">
                {coverageOptions.map(co => (
                  <label key={co.id} className={tileClass(form.coverage_option_id === co.id)}>
                    <input type="radio" name="coverage" checked={form.coverage_option_id === co.id}
                      onChange={() => up({ coverage_option_id: co.id })} className="sr-only" />
                    <div className="text-sm font-medium text-gray-200">{co.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {co.uplift_decimal > 0 ? `+${(co.uplift_decimal * 100).toFixed(0)}%` : 'Base'}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Margin & Discount */}
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Margin <span className="text-xs font-normal text-gray-500">(% markup on cost)</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="300"
                    step="1"
                    value={form.margin_pct}
                    onChange={e => up({ margin_pct: Math.max(0, Math.min(300, parseInt(e.target.value) || 0)) })}
                    className="w-24 bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-500">%</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Default 30% · range 0–300</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Cumulative discount
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={form.discount_pct}
                    onChange={e => up({ discount_pct: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) })}
                    className="w-24 bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-500">%</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Default 0% · applied after margin</p>
              </div>
            </div>

            {/* Contract duration */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Contract duration
              </label>
              <div className="flex items-center gap-3">
                <select
                  value={form.contract_duration_years}
                  onChange={e => up({ contract_duration_years: parseInt(e.target.value) })}
                  className="w-32 bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CONTRACT_DURATION_OPTIONS.map(y => (
                    <option key={y} value={y}>{y} {y === 1 ? 'year' : 'years'}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500">Indicative — longer contracts may qualify for volume discounts.</p>
              </div>
            </div>

            <HelpLink />
          </div>
        )}

        {/* ── Step 5: Review ───────────────────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-6">
            <p className="text-sm text-gray-400 -mt-1">{STEP_INTRO[4]}</p>
            {/* Summary grid */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Reference</p>
                <p className="font-medium text-gray-100">{form.reference_code}</p>
              </div>
              <div>
                <p className="text-gray-500">Client</p>
                <p className="font-medium text-gray-100">{form.client_name || '—'}</p>
              </div>
              <div>
                <p className="text-gray-500">Service type</p>
                <p className="font-medium text-gray-100">
                  {serviceTypes.filter(st => form.selected_service_type_ids.includes(st.id)).map(st => st.name).join(', ') || '—'}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Services selected</p>
                <p className="font-medium text-gray-100">{form.selected_service_ids.length}</p>
              </div>
              <div>
                <p className="text-gray-500">Business criticality</p>
                <p className="font-medium text-gray-100">
                  {CRITICALITY_OPTIONS.find(o => o.value === form.business_criticality)?.label ?? '—'}
                </p>
              </div>
              <div>
                <p className="text-gray-500">System complexity</p>
                <p className="font-medium text-gray-100 capitalize">
                  {COMPLEXITY_OPTIONS.find(o => o.value === form.system_complexity)?.label ?? '—'}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Location</p>
                <p className="font-medium text-gray-100">
                  {selLocation?.name ?? '—'}&nbsp;
                  ({form.output_currency_code === 'CHF'
                    ? `CHF ${selLocation?.hourly_rate_chf}`
                    : `${selCurrency.symbol} ${((selLocation?.hourly_rate_chf ?? 0) * exRate).toFixed(0)}`}/hr)
                </p>
              </div>
              <div>
                <p className="text-gray-500">Contract duration</p>
                <p className="font-medium text-gray-100">{form.contract_duration_years} {form.contract_duration_years === 1 ? 'year' : 'years'}</p>
              </div>
              <div>
                <p className="text-gray-500">Currency</p>
                <p className="font-medium text-gray-100">{form.output_currency_code}</p>
              </div>
            </div>

            {/* Staffing breakdown */}
            <div className="border border-gray-700 rounded-lg overflow-hidden">
              <div className="bg-gray-700/50 px-4 py-2 border-b border-gray-700">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Service delivery staffing</p>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {STAFFING_ROWS.map((row, i) => (
                    <tr key={row.key} className={`border-b border-gray-700 ${i % 2 === 0 ? 'bg-gray-800' : 'bg-gray-700/30'}`}>
                      <td className="px-4 py-2 text-xs text-gray-400">{row.label}</td>
                      <td className="px-4 py-2 text-right text-xs font-medium text-gray-200">
                        {parseFloat(form[row.key] || '0').toFixed(1)} FTE
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-blue-900/30">
                    <td className="px-4 py-2 text-xs font-semibold text-blue-300">Total</td>
                    <td className="px-4 py-2 text-right text-xs font-bold text-blue-200">{totalFte.toFixed(1)} FTE</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Price breakdown */}
            <div className="border-t border-gray-700 pt-5">
              <p className="text-sm font-semibold text-gray-200 mb-3">Subscription fee breakdown</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-400">
                  <span>
                    Base cost ({totalFte.toFixed(1)} FTE × {
                      form.output_currency_code === 'CHF'
                        ? `CHF ${selLocation?.hourly_rate_chf}`
                        : `${selCurrency.symbol} ${((selLocation?.hourly_rate_chf ?? 0) * exRate).toFixed(0)}`
                    }/hr × {form.working_hours_per_month} hrs)
                  </span>
                  <span>{fmt(baseChf)}</span>
                </div>
                {selSupport && selSupport.uplift_decimal !== 0 && (
                  <div className="flex justify-between text-gray-400">
                    <span>Support uplift ({selSupport.name}: +{(selSupport.uplift_decimal * 100).toFixed(0)}%)</span>
                    <span>+{fmt(baseChf * selSupport.uplift_decimal)}</span>
                  </div>
                )}
                {selCoverage && selCoverage.uplift_decimal !== 0 && (
                  <div className="flex justify-between text-gray-400">
                    <span>Coverage uplift ({selCoverage.name}: +{(selCoverage.uplift_decimal * 100).toFixed(0)}%)</span>
                    <span>+{fmt(baseChf * (1 + (selSupport?.uplift_decimal ?? 0)) * selCoverage.uplift_decimal)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-300 font-medium pt-1 border-t border-gray-700">
                  <span>Internal cost / month</span>
                  <span>{fmt(internalCostChf)}</span>
                </div>
                {form.margin_pct > 0 && (
                  <div className="flex justify-between text-green-400">
                    <span>Margin (+{form.margin_pct}% markup)</span>
                    <span>+{fmt(internalCostChf * form.margin_pct / 100)}</span>
                  </div>
                )}
                {form.discount_pct > 0 && (
                  <div className="flex justify-between text-orange-400">
                    <span>Cumulative discount (−{form.discount_pct}%)</span>
                    <span>−{fmt(internalCostChf * (1 + form.margin_pct / 100) * form.discount_pct / 100)}</span>
                  </div>
                )}
                <div className="border-t border-gray-700 pt-2 mt-1 space-y-1">
                  <div className="flex justify-between font-semibold text-gray-100 text-base">
                    <span>Monthly subscription fee</span>
                    <span>{fmt(clientPriceChf)}</span>
                  </div>
                  <div className="flex justify-between text-gray-400 text-sm">
                    <span>Annual subscription fee</span>
                    <span>{fmt(clientPriceChf * 12)}</span>
                  </div>
                  {form.output_currency_code !== 'CHF' && (
                    <div className="flex justify-between text-gray-500 text-xs pt-1">
                      <span>In CHF</span>
                      <span>{fmtChf(clientPriceChf)} / mo · {fmtChf(clientPriceChf * 12)} / yr</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <HelpLink />
            {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setStep(s => s - 1)}
          disabled={step === 0}
          className="px-4 py-2 text-sm text-gray-400 border border-gray-600 rounded-md hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Back
        </button>
        <div className="flex gap-3">
          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canProceed()}
              className="px-5 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          ) : (
            <>
              <button
                onClick={() => handleSave('draft')}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700 disabled:opacity-50"
              >
                Save as draft
              </button>
              <button
                onClick={() => handleSave('finalized')}
                disabled={saving}
                className="px-5 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Finalize'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Sticky live preview — visible when internalCostChf > 0 */}
      {internalCostChf > 0 && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 border border-gray-600 rounded-xl shadow-2xl p-4 w-72">
          <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-3">Live preview</p>
          <div className="space-y-2">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-gray-500">Internal / mo</span>
              <span className="text-sm font-medium text-gray-300">{fmt(internalCostChf)}</span>
            </div>
            <div className="flex justify-between items-baseline border-t border-gray-700 pt-2">
              <span className="text-xs text-gray-400">
                Client / mo
                {form.margin_pct > 0 && <span className="ml-1 text-green-400">+{form.margin_pct}%</span>}
                {form.discount_pct > 0 && <span className="ml-1 text-orange-400">−{form.discount_pct}%</span>}
              </span>
              <span className="text-sm font-medium text-gray-300">{fmt(clientPriceChf)}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-gray-400">Client / yr</span>
              <span className="text-base font-bold text-gray-100">{fmt(clientPriceChf * 12)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
