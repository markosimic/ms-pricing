'use server'

import { auth } from '@/app/lib/auth'
import { db, toJson, fromJson } from '@/app/lib/db'
import { redirect } from 'next/navigation'

// ── Types ──────────────────────────────────────────────────────────────────

export interface SaveQuoteData {
  reference_code:            string
  client_name:               string
  developed_by_zuhlke:       boolean
  selected_service_type_ids: string[]
  notes:                     string
  selected_service_ids:      string[]
  business_criticality:      number | null
  system_complexity:         string
  service_manager_fte:       string
  app_engineer_fte:          string
  sre_devops_fte:            string
  base_fte_per_month:        string    // billing FTE, saved as fte_estimate
  working_hours_per_month:   number
  delivery_location_id:      string
  support_level_id:          string
  coverage_option_id:        string
  sla_size_id:               string
  margin_pct:                number
  discount_pct:              number
  output_currency_code:      string
  exchange_rate_snapshot:    Record<string, number>
  base_price_chf:            number
  internal_cost_chf:         number
  client_price_chf:          number
  final_price_chf:           number
  final_price_output_currency: number
  contract_duration_years:   number
}

// ── saveQuote ──────────────────────────────────────────────────────────────
// Called from QuoteWizard (client component). Server-side: gets userId from
// the session rather than trusting the client.

export async function saveQuote(
  data: SaveQuoteData,
  status: 'draft' | 'finalized',
): Promise<{ id: string }> {
  console.log('[saveQuote] called, status:', status)

  let session
  try {
    session = await auth()
  } catch (authErr) {
    console.error('[saveQuote] auth() threw:', authErr)
    throw authErr
  }

  console.log('[saveQuote] session:', session?.user?.id ?? 'null')
  if (!session?.user?.id) throw new Error('Unauthorized')

  const { user } = session
  const now = new Date()

  const smFte    = parseFloat(data.service_manager_fte) || 0
  const appFte   = parseFloat(data.app_engineer_fte)    || 0
  const sreFte   = parseFloat(data.sre_devops_fte)      || 0
  const totalFte = smFte + appFte + sreFte
  // base_fte_per_month is the billing FTE (may differ from staffing sum)
  const billingFte = parseFloat(data.base_fte_per_month) || totalFte

  console.log('[saveQuote] creating quote for user:', session.user.id)
  const quote = await db.quotes.create({
    data: {
      user_id:                     user.id,
      creator_email:               user.email,
      creator_name:                user.name || user.email,
      reference_code:              data.reference_code,
      client_name:                 data.client_name || null,
      service_type_id:             data.selected_service_type_ids[0] ?? null,
      // Serialise string[] → JSON string for NVarChar(Max) column
      service_type_ids:            toJson(data.selected_service_type_ids),
      developed_by_zuhlke:         data.developed_by_zuhlke,
      service_manager_fte:         smFte,
      app_engineer_fte:            appFte,
      sre_devops_fte:              sreFte,
      fte_estimate:                billingFte,  // billing FTE (Base FTEs / Month)
      working_hours_per_month:     data.working_hours_per_month,
      delivery_location_id:        data.delivery_location_id || null,
      business_criticality:        data.business_criticality,
      system_complexity:           data.system_complexity || null,
      support_level_id:            data.support_level_id || null,
      coverage_option_id:          data.coverage_option_id || null,
      sla_size_id:                 data.sla_size_id || null,
      margin_pct:                  data.margin_pct,
      discount_pct:                data.discount_pct,
      output_currency_code:        data.output_currency_code,
      // Serialise Record<string,number> → JSON string for NVarChar(Max) column
      exchange_rate_snapshot:      toJson(data.exchange_rate_snapshot),
      base_price_chf:              data.base_price_chf,
      internal_cost_chf:           data.internal_cost_chf,
      client_price_chf:            data.client_price_chf,
      final_price_chf:             data.final_price_chf,
      final_price_output_currency: data.final_price_output_currency,
      notes:                       data.notes || null,
      contract_duration_years:     data.contract_duration_years,
      status,
      finalized_at:                status === 'finalized' ? now : null,
    },
    select: { id: true },
  })

  if (data.selected_service_ids.length > 0) {
    await db.quote_services.createMany({
      data: data.selected_service_ids.map(sid => ({
        quote_id:   quote.id,
        service_id: sid,
      })),
      // skipDuplicates is not supported on SQL Server — omitted intentionally
    })
  }

  console.log('[saveQuote] quote created:', quote.id)
  return { id: quote.id }
}

// ── toggleTemplate ─────────────────────────────────────────────────────────
// Called from TemplateToggleButton (client component). Only the quote owner
// can toggle template status — checked server-side.

export async function toggleTemplate(
  quoteId:      string,
  isTemplate:   boolean,
  templateName: string | null,
): Promise<void> {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  // Verify ownership before mutating
  const quote = await db.quotes.findUnique({
    where:  { id: quoteId },
    select: { user_id: true },
  })

  if (!quote) throw new Error('Quote not found')
  if (quote.user_id !== session.user.id) throw new Error('Forbidden')

  await db.quotes.update({
    where: { id: quoteId },
    data:  { is_template: isTemplate, template_name: templateName },
  })
}

// ── redirectAfterSave (convenience) ───────────────────────────────────────
// Not a Server Action itself — just a helper used by page-level actions if needed.
export async function goHome() {
  redirect('/')
}
