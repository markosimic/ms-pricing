'use server'

import { EmailClient } from '@azure/communication-email'
import { auth } from '@/app/lib/auth'
import { db, dec, fromJson } from '@/app/lib/db'

// ── Azure Communication Services config ───────────────────────────────────
// Set these as secrets on the Azure Container App:
//   ACS_CONNECTION_STRING — from ACS resource → Keys
//   ACS_SENDER_ADDRESS    — e.g. DoNotReply@<domain>.azurecomm.net

function getClient() {
  const conn = process.env.ACS_CONNECTION_STRING
  if (!conn) throw new Error('ACS_CONNECTION_STRING env var not set')
  return new EmailClient(conn)
}

export async function sendQuoteEmail(
  quoteId:   string,
  addresses: string[],   // 1–3 validated email addresses
): Promise<{ ok: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: 'Not authenticated' }

  const emails = addresses
    .map(e => e.trim().toLowerCase())
    .filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
    .slice(0, 3)

  if (emails.length === 0) return { ok: false, error: 'No valid email addresses' }

  // Load quote with all relations
  const quote = await db.quotes.findUnique({
    where: { id: quoteId },
    include: {
      service_types:      { select: { name: true } },
      delivery_locations: { select: { name: true } },
      support_levels:     { select: { name: true } },
      coverage_options:   { select: { name: true } },
      sla_sizes:          { select: { name: true } },
    },
  })
  if (!quote) return { ok: false, error: 'Quote not found' }
  if (quote.status !== 'finalized') return { ok: false, error: 'Only finalized quotes can be sent' }

  const [currencyRow, quoteServices] = await Promise.all([
    db.currencies.findFirst({
      where:  { code: quote.output_currency_code ?? 'CHF' },
      select: { symbol: true },
    }),
    db.quote_services.findMany({
      where:   { quote_id: quoteId },
      include: { services: { select: { name: true, service_categories: { select: { name: true } } } } },
    }),
  ])

  const rates      = fromJson<Record<string, number>>(quote.exchange_rate_snapshot, {})
  const outCode    = quote.output_currency_code ?? 'CHF'
  const outSymbol  = currencyRow?.symbol ?? outCode
  const exRate     = rates[outCode] ?? 1
  const monthly    = dec(quote.client_price_chf ?? quote.final_price_chf)
  const annual     = monthly * 12
  const monthlyOut = monthly * exRate
  const annualOut  = annual * exRate

  function fmtAmt(n: number) {
    const f = n.toLocaleString('de-CH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    return outCode === 'CHF' ? `CHF ${f}` : `${outSymbol} ${f}`
  }

  function row(label: string, value: string) {
    return `<p style="margin:4px 0;font-size:13px;color:#9ca3af">${label}: <span style="color:#e5e7eb;font-weight:500">${value}</span></p>`
  }

  // Group services by category
  const grouped = quoteServices.reduce<Record<string, string[]>>((acc, qs) => {
    const cat = qs.services.service_categories?.name ?? 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(qs.services.name)
    return acc
  }, {})

  const servicesHtml = Object.entries(grouped)
    .map(([cat, names]) =>
      `<p style="margin:8px 0 4px;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em">${cat}</p>` +
      names.map(n => `<p style="margin:2px 0;font-size:13px;color:#d1d5db">• ${n}</p>`).join('')
    )
    .join('')

  const subject = `Quote ${quote.reference_code}${quote.client_name ? ` — ${quote.client_name}` : ''} · ${fmtAmt(monthlyOut)}/mo`

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#111827;font-family:Arial,sans-serif;color:#f9fafb">
  <div style="max-width:600px;margin:0 auto;padding:32px 24px">

    <div style="border-bottom:1px solid #374151;padding-bottom:16px;margin-bottom:24px">
      <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.1em">Managed Services Pricing Calculator</p>
      <h1 style="margin:6px 0 0;font-size:22px;font-weight:700;color:#f9fafb">Quote ${quote.reference_code}</h1>
      ${quote.client_name ? `<p style="margin:4px 0 0;font-size:13px;color:#9ca3af">${quote.client_name}</p>` : ''}
    </div>

    <div style="background:#1f2937;border:1px solid #374151;border-radius:8px;padding:20px;margin-bottom:20px">
      <p style="margin:0 0 12px;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em">Subscription fee</p>
      <p style="margin:0;font-size:28px;font-weight:700;color:#93c5fd">${fmtAmt(monthlyOut)} <span style="font-size:14px;font-weight:400;color:#6b7280">/ month</span></p>
      <p style="margin:6px 0 0;font-size:16px;font-weight:600;color:#d1d5db">${fmtAmt(annualOut)} <span style="font-size:12px;font-weight:400;color:#6b7280">/ year</span></p>
      ${outCode !== 'CHF' ? `<p style="margin:6px 0 0;font-size:11px;color:#6b7280">CHF ${monthly.toLocaleString('de-CH',{minimumFractionDigits:0,maximumFractionDigits:0})} / mo · CHF ${annual.toLocaleString('de-CH',{minimumFractionDigits:0,maximumFractionDigits:0})} / yr</p>` : ''}
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px">
      <tr>
        <td style="width:50%;vertical-align:top;padding-right:8px">
          <div style="background:#1f2937;border:1px solid #374151;border-radius:8px;padding:16px">
            <p style="margin:0 0 10px;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em">Engagement</p>
            ${row('Reference', quote.reference_code)}
            ${row('Status', 'Finalized')}
            ${row('Contract', `${quote.contract_duration_years ?? 3} years`)}
            ${row('Currency', outCode)}
            ${row('Created by', quote.creator_name ?? quote.creator_email ?? '—')}
          </div>
        </td>
        <td style="width:50%;vertical-align:top;padding-left:8px">
          <div style="background:#1f2937;border:1px solid #374151;border-radius:8px;padding:16px">
            <p style="margin:0 0 10px;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em">SLA parameters</p>
            ${row('Support', quote.support_levels?.name ?? '—')}
            ${row('Coverage', quote.coverage_options?.name ?? '—')}
            ${row('Complexity', quote.sla_sizes?.name ?? '—')}
            ${row('Location', quote.delivery_locations?.name ?? '—')}
          </div>
        </td>
      </tr>
    </table>

    ${quoteServices.length > 0 ? `
    <div style="background:#1f2937;border:1px solid #374151;border-radius:8px;padding:16px;margin-bottom:20px">
      <p style="margin:0 0 10px;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em">Services in scope (${quoteServices.length})</p>
      ${servicesHtml}
    </div>` : ''}

    ${quote.notes ? `
    <div style="background:#1f2937;border:1px solid #374151;border-radius:8px;padding:16px;margin-bottom:20px">
      <p style="margin:0 0 6px;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em">Notes</p>
      <p style="margin:0;font-size:13px;color:#d1d5db">${quote.notes}</p>
    </div>` : ''}

    <div style="border-top:1px solid #374151;padding-top:16px;margin-top:8px">
      <p style="margin:0;font-size:11px;color:#4b5563">Sent from Managed Services Pricing Calculator · Zühlke</p>
    </div>
  </div>
</body>
</html>`

  try {
    const client = getClient()
    const sender = process.env.ACS_SENDER_ADDRESS
    if (!sender) throw new Error('ACS_SENDER_ADDRESS env var not set')

    const poller = await client.beginSend({
      senderAddress: sender,
      content: { subject, html },
      recipients: { to: emails.map(address => ({ address })) },
    })
    await poller.pollUntilDone()

    console.log('[sendQuoteEmail] sent to:', emails.join(', '))
    return { ok: true }
  } catch (err) {
    console.error('[sendQuoteEmail] error:', err)
    return { ok: false, error: err instanceof Error ? err.message : 'Send failed' }
  }
}
