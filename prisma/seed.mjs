/**
 * ms-pricing database seed
 * Populates all reference/lookup tables via mssql (Tedious driver).
 * Run: DATABASE_PASSWORD=... node seed.mjs
 */

import sql from 'mssql'

const config = {
  server:   'ms-pricing-sql.database.windows.net',
  database: 'ms-pricing-db',
  user:     'msadmin',
  password: process.env.DATABASE_PASSWORD ?? 'MsP2024.Zuhlke.Secure',
  options: {
    encrypt:              true,
    trustServerCertificate: false,
  },
}

// ── Helpers ────────────────────────────────────────────────────────────────

function newId() {
  // UUID v4 — matches NEWID() semantics
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

async function run(pool, sql_str, params = []) {
  const req = pool.request()
  params.forEach(({ name, type, value }) => req.input(name, type, value))
  return req.query(sql_str)
}

// ── Seed data ──────────────────────────────────────────────────────────────

const serviceTypes = [
  { id: newId(), name: 'Application Management Services', slug: 'ams' },
  { id: newId(), name: 'Cloud Managed Services',          slug: 'cms' },
]

// id lookup helpers
const ams = serviceTypes.find(s => s.slug === 'ams')
const cms = serviceTypes.find(s => s.slug === 'cms')

const deliveryLocations = [
  // GDC is the default delivery location (lowest rate, selected first in the form)
  { id: newId(), name: 'Delivery Centres (GDC)', hourly_rate_chf:  50.00 },
  { id: newId(), name: 'EU (Nearshore)',           hourly_rate_chf:  75.00 },
  { id: newId(), name: 'United Kingdom',           hourly_rate_chf:  88.00 },
  { id: newId(), name: 'Singapore / HK',           hourly_rate_chf: 100.00 },
  { id: newId(), name: 'Switzerland',              hourly_rate_chf: 150.00 },
]

const supportLevels = [
  // code 'l3' is the default selected in the form
  { id: newId(), name: 'L3 Only (Engineering)',            code: 'l3',    uplift_decimal: 0.15 },
  { id: newId(), name: 'L2 + L3',                          code: 'l2l3',  uplift_decimal: 0.25 },
  { id: newId(), name: 'L1 + L2 + L3 (Full Stack Support)', code: 'l1l2l3', uplift_decimal: 0.40 },
]

const coverageOptions = [
  // code '8x5' is the default selected in the form
  { id: newId(), name: 'Standard (09:00–17:00, Mon–Fri)', code: '8x5',  uplift_decimal: 0.00 },
  { id: newId(), name: 'Extended (06:00–20:00, Mon–Fri)', code: '12x5', uplift_decimal: 0.20 },
  { id: newId(), name: '24×7 (including public holidays)', code: '24x7', uplift_decimal: 0.50 },
]

const slaSizes = [
  { id: newId(), name: 'Small',  code: 'small',  uplift_decimal: 0.00 },
  { id: newId(), name: 'Medium', code: 'medium', uplift_decimal: 0.10 },
  { id: newId(), name: 'Large',  code: 'large',  uplift_decimal: 0.25 },
]

const currencies = [
  { id: newId(), code: 'CHF', symbol: 'Fr.',  name: 'Swiss Franc'        },
  { id: newId(), code: 'EUR', symbol: '€',    name: 'Euro'               },
  { id: newId(), code: 'GBP', symbol: '£',    name: 'British Pound'      },
  { id: newId(), code: 'USD', symbol: '$',    name: 'US Dollar'          },
  { id: newId(), code: 'SGD', symbol: 'S$',   name: 'Singapore Dollar'   },
  { id: newId(), code: 'HKD', symbol: 'HK$',  name: 'Hong Kong Dollar'   },
]

// ── Service categories & services ──────────────────────────────────────────

const categoriesWithServices = [
  // ── AMS categories ────────────────────────────────────────────────────
  {
    id: newId(), name: 'Monitoring & Operations', sort_order: 1, service_type_id: ams.id,
    services: [
      { id: newId(), name: 'Application Monitoring',   sort_order: 1, default_selected: true,  require_zuhlke_dev: false, description: 'Continuous health and availability monitoring of the application stack with alerting thresholds and escalation paths.' },
      { id: newId(), name: 'Log Management',            sort_order: 2, default_selected: true,  require_zuhlke_dev: false, description: 'Centralised log aggregation, retention, and search across all application components.' },
      { id: newId(), name: 'Alerting & Notification',  sort_order: 3, default_selected: true,  require_zuhlke_dev: false, description: 'Configured alert rules and notification channels (email, PagerDuty, Teams) mapped to SLA response targets.' },
      { id: newId(), name: 'Synthetic Monitoring',     sort_order: 4, default_selected: false, require_zuhlke_dev: false, description: 'Scheduled synthetic transactions to proactively detect availability and performance regressions from end-user perspective.' },
    ],
  },
  {
    id: newId(), name: 'Incident Management', sort_order: 2, service_type_id: ams.id,
    services: [
      { id: newId(), name: 'Incident Response & Triage',    sort_order: 1, default_selected: true,  require_zuhlke_dev: false, description: 'Structured intake, classification, and initial triage of all incidents within contracted SLA response times.' },
      { id: newId(), name: 'Root Cause Analysis',           sort_order: 2, default_selected: false, require_zuhlke_dev: false, description: 'Formal post-incident RCA with documented findings and corrective action plan, delivered within agreed timeframe.' },
      { id: newId(), name: 'On-Call Engineering',           sort_order: 3, default_selected: false, require_zuhlke_dev: true,  description: 'Zühlke engineers on call outside business hours for Severity 1 escalations. Requires Zühlke-developed application.' },
    ],
  },
  {
    id: newId(), name: 'Maintenance & Updates', sort_order: 3, service_type_id: ams.id,
    services: [
      { id: newId(), name: 'Dependency & Security Patching', sort_order: 1, default_selected: true,  require_zuhlke_dev: false, description: 'Regular review and application of OS, runtime, and library patches with vulnerability scanning and prioritisation.' },
      { id: newId(), name: 'Application Updates',            sort_order: 2, default_selected: true,  require_zuhlke_dev: true,  description: 'Planned minor version updates, configuration changes, and bug fixes deployed through the standard change process.' },
      { id: newId(), name: 'Scheduled Maintenance Windows',  sort_order: 3, default_selected: false, require_zuhlke_dev: false, description: 'Pre-agreed maintenance windows for larger update batches with client communication and rollback procedures.' },
    ],
  },
  {
    id: newId(), name: 'Change Management', sort_order: 4, service_type_id: ams.id,
    services: [
      { id: newId(), name: 'RFC Processing',                     sort_order: 1, default_selected: true,  require_zuhlke_dev: false, description: 'End-to-end processing of Requests for Change through the ISO 20000 change management process.' },
      { id: newId(), name: 'Change Advisory Board Participation', sort_order: 2, default_selected: false, require_zuhlke_dev: false, description: 'Zühlke participation in client CAB meetings as technical representative for changes affecting the managed application.' },
    ],
  },
  {
    id: newId(), name: 'Service Reporting & Improvement', sort_order: 5, service_type_id: ams.id,
    services: [
      { id: newId(), name: 'Monthly Service Report',          sort_order: 1, default_selected: true,  require_zuhlke_dev: false, description: 'Standard monthly report covering SLA performance, incident summary, change log, and upcoming activities.' },
      { id: newId(), name: 'Quarterly Business Review (QBR)', sort_order: 2, default_selected: false, require_zuhlke_dev: false, description: 'Structured QBR with SLA trend analysis, risk review, improvement roadmap, and strategic planning discussion.' },
      { id: newId(), name: 'Continual Service Improvement',   sort_order: 3, default_selected: true,  require_zuhlke_dev: false, description: 'Formal CSI programme: ongoing identification, prioritisation, and tracking of service improvement initiatives.' },
    ],
  },

  // ── CMS categories ────────────────────────────────────────────────────
  {
    id: newId(), name: 'Cloud Operations', sort_order: 1, service_type_id: cms.id,
    services: [
      { id: newId(), name: 'Cloud Infrastructure Monitoring', sort_order: 1, default_selected: true,  require_zuhlke_dev: false, description: 'Real-time monitoring of cloud resources (compute, storage, network) with SLA-aligned alerting.' },
      { id: newId(), name: 'Cost Optimisation & Governance',  sort_order: 2, default_selected: true,  require_zuhlke_dev: false, description: 'FinOps practices: tagging, rightsizing, reserved instance recommendations, and monthly cost reporting.' },
      { id: newId(), name: 'Security & Compliance Scanning',  sort_order: 3, default_selected: true,  require_zuhlke_dev: false, description: 'Automated cloud security posture management, misconfiguration detection, and compliance reporting (ISO 27001).' },
      { id: newId(), name: 'Multi-Cloud Management',          sort_order: 4, default_selected: false, require_zuhlke_dev: false, description: 'Operational management across two or more cloud providers with unified monitoring and governance.' },
    ],
  },
  {
    id: newId(), name: 'Platform Engineering', sort_order: 2, service_type_id: cms.id,
    services: [
      { id: newId(), name: 'CI/CD Pipeline Management',             sort_order: 1, default_selected: false, require_zuhlke_dev: true,  description: 'Ownership and operation of CI/CD pipelines, including maintenance, upgrades, and failure triage. Requires Zühlke-built pipeline.' },
      { id: newId(), name: 'Container & Kubernetes Management',     sort_order: 2, default_selected: false, require_zuhlke_dev: false, description: 'Day-2 operations for containerised workloads: cluster upgrades, resource tuning, autoscaling, and issue resolution.' },
      { id: newId(), name: 'Infrastructure as Code (IaC)',          sort_order: 3, default_selected: false, require_zuhlke_dev: true,  description: 'Maintenance and evolution of IaC (Terraform/Bicep), including drift detection and planned state changes.' },
    ],
  },
  {
    id: newId(), name: 'Reliability Engineering', sort_order: 3, service_type_id: cms.id,
    services: [
      { id: newId(), name: 'Disaster Recovery Planning & Testing', sort_order: 1, default_selected: false, require_zuhlke_dev: false, description: 'Annual DR plan review and scheduled failover testing with documented RTO/RPO validation.' },
      { id: newId(), name: 'Performance Optimisation',             sort_order: 2, default_selected: false, require_zuhlke_dev: false, description: 'Proactive analysis of cloud performance metrics and implementation of tuning recommendations.' },
      { id: newId(), name: 'Capacity Planning',                    sort_order: 3, default_selected: true,  require_zuhlke_dev: false, description: 'Quarterly capacity forecasting aligned with client growth projections and cloud scaling recommendations.' },
    ],
  },
  {
    id: newId(), name: 'Cloud Service Reporting', sort_order: 4, service_type_id: cms.id,
    services: [
      { id: newId(), name: 'Cloud Operations Report', sort_order: 1, default_selected: true,  require_zuhlke_dev: false, description: 'Monthly report covering infrastructure health, incidents, cost, security findings, and capacity status.' },
      { id: newId(), name: 'FinOps Report',            sort_order: 2, default_selected: false, require_zuhlke_dev: false, description: 'Detailed cloud spend analysis with allocation breakdown, anomaly detection, and optimisation actions.' },
    ],
  },
]

const complexityCategories = [
  { id: newId(), name: 'Technical Complexity',      weight: 0.30, sort_order: 1 },
  { id: newId(), name: 'Integration Dependencies',  weight: 0.25, sort_order: 2 },
  { id: newId(), name: 'Data Sensitivity',          weight: 0.20, sort_order: 3 },
  { id: newId(), name: 'Regulatory Requirements',   weight: 0.15, sort_order: 4 },
  { id: newId(), name: 'User Volume & SLA Demand',  weight: 0.10, sort_order: 5 },
]

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('Connecting to Azure SQL Server...')
  const pool = await sql.connect(config)
  console.log('Connected.\n')

  try {
    // ── 1. service_types ────────────────────────────────────────────────
    console.log('Seeding service_types...')
    for (const st of serviceTypes) {
      await run(pool, `
        IF NOT EXISTS (SELECT 1 FROM service_types WHERE slug = '${st.slug}')
          INSERT INTO service_types (id, name, slug)
          VALUES ('${st.id}', N'${st.name}', '${st.slug}')
      `)
    }
    console.log(`  ✓ ${serviceTypes.length} service types`)

    // ── 2. delivery_locations ───────────────────────────────────────────
    console.log('Seeding delivery_locations...')
    for (const dl of deliveryLocations) {
      await run(pool, `
        IF NOT EXISTS (SELECT 1 FROM delivery_locations WHERE name = N'${dl.name}')
          INSERT INTO delivery_locations (id, name, hourly_rate_chf)
          VALUES ('${dl.id}', N'${dl.name}', ${dl.hourly_rate_chf})
      `)
    }
    console.log(`  ✓ ${deliveryLocations.length} delivery locations`)

    // ── 3. support_levels ───────────────────────────────────────────────
    console.log('Seeding support_levels...')
    for (const sl of supportLevels) {
      await run(pool, `
        IF NOT EXISTS (SELECT 1 FROM support_levels WHERE code = '${sl.code}')
          INSERT INTO support_levels (id, name, code, uplift_decimal)
          VALUES ('${sl.id}', N'${sl.name}', '${sl.code}', ${sl.uplift_decimal})
      `)
    }
    console.log(`  ✓ ${supportLevels.length} support levels`)

    // ── 4. coverage_options ─────────────────────────────────────────────
    console.log('Seeding coverage_options...')
    for (const co of coverageOptions) {
      await run(pool, `
        IF NOT EXISTS (SELECT 1 FROM coverage_options WHERE code = '${co.code}')
          INSERT INTO coverage_options (id, name, code, uplift_decimal)
          VALUES ('${co.id}', N'${co.name}', '${co.code}', ${co.uplift_decimal})
      `)
    }
    console.log(`  ✓ ${coverageOptions.length} coverage options`)

    // ── 5. sla_sizes ────────────────────────────────────────────────────
    console.log('Seeding sla_sizes...')
    for (const ss of slaSizes) {
      await run(pool, `
        IF NOT EXISTS (SELECT 1 FROM sla_sizes WHERE code = '${ss.code}')
          INSERT INTO sla_sizes (id, name, code, uplift_decimal)
          VALUES ('${ss.id}', N'${ss.name}', '${ss.code}', ${ss.uplift_decimal})
      `)
    }
    console.log(`  ✓ ${slaSizes.length} SLA sizes`)

    // ── 6. currencies ───────────────────────────────────────────────────
    console.log('Seeding currencies...')
    for (const c of currencies) {
      await run(pool, `
        IF NOT EXISTS (SELECT 1 FROM currencies WHERE code = '${c.code}')
          INSERT INTO currencies (id, code, symbol, name)
          VALUES ('${c.id}', '${c.code}', N'${c.symbol}', N'${c.name}')
      `)
    }
    console.log(`  ✓ ${currencies.length} currencies`)

    // ── 7. service_categories & services ────────────────────────────────
    console.log('Seeding service_categories and services...')
    let catCount = 0, svcCount = 0
    for (const cat of categoriesWithServices) {
      await run(pool, `
        IF NOT EXISTS (SELECT 1 FROM service_categories WHERE name = N'${cat.name}' AND service_type_id = '${cat.service_type_id}')
          INSERT INTO service_categories (id, name, sort_order, service_type_id)
          VALUES ('${cat.id}', N'${cat.name}', ${cat.sort_order}, '${cat.service_type_id}')
      `)
      // Re-fetch the actual category id (might differ if row already existed)
      const existingCat = await run(pool, `
        SELECT id FROM service_categories WHERE name = N'${cat.name}' AND service_type_id = '${cat.service_type_id}'
      `)
      const catId = existingCat.recordset[0].id
      catCount++

      for (const svc of cat.services) {
        const desc = svc.description.replace(/'/g, "''")
        const name = svc.name.replace(/'/g, "''")
        await run(pool, `
          IF NOT EXISTS (SELECT 1 FROM services WHERE name = N'${name}' AND service_category_id = '${catId}')
            INSERT INTO services (id, name, description, sort_order, default_selected, require_zuhlke_dev, service_category_id)
            VALUES ('${svc.id}', N'${name}', N'${desc}', ${svc.sort_order}, ${svc.default_selected ? 1 : 0}, ${svc.require_zuhlke_dev ? 1 : 0}, '${catId}')
        `)
        svcCount++
      }
    }
    console.log(`  ✓ ${catCount} categories, ${svcCount} services`)

    // ── 8. complexity_categories ────────────────────────────────────────
    console.log('Seeding complexity_categories...')
    for (const cc of complexityCategories) {
      await run(pool, `
        IF NOT EXISTS (SELECT 1 FROM complexity_categories WHERE name = N'${cc.name}')
          INSERT INTO complexity_categories (id, name, weight, sort_order)
          VALUES ('${cc.id}', N'${cc.name}', ${cc.weight}, ${cc.sort_order})
      `)
    }
    console.log(`  ✓ ${complexityCategories.length} complexity categories`)

    // ── Verify ──────────────────────────────────────────────────────────
    console.log('\n── Verification ──────────────────────────────────────────')
    const tables = ['service_types', 'delivery_locations', 'support_levels', 'coverage_options', 'sla_sizes', 'currencies', 'service_categories', 'services', 'complexity_categories']
    for (const t of tables) {
      const r = await run(pool, `SELECT COUNT(*) as cnt FROM ${t}`)
      console.log(`  ${t}: ${r.recordset[0].cnt} rows`)
    }

    console.log('\n✅ Seed complete.')
  } finally {
    await pool.close()
  }
}

main().catch(err => {
  console.error('Seed failed:', err.message)
  process.exit(1)
})
