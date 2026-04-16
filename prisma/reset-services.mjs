/**
 * reset-services.mjs
 *
 * 1. Deletes all quotes (and related records)
 * 2. Deletes all existing service categories and services
 * 3. Inserts fresh AMS and CMS scope based on official scope documents
 *
 * Run: DATABASE_PASSWORD=... node prisma/reset-services.mjs
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

function newId() {
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

function esc(str) {
  return str.replace(/'/g, "''")
}

// ── Fetch service_type IDs from DB ─────────────────────────────────────────

async function getServiceTypeIds(pool) {
  const result = await run(pool, `SELECT id, slug FROM service_types`)
  const map = {}
  for (const row of result.recordset) map[row.slug] = row.id
  return map
}

// ── AMS service categories and services ────────────────────────────────────

function buildAmsCategories(amsId) {
  return [
    {
      id: newId(), name: 'Core Services', sort_order: 1, service_type_id: amsId,
      services: [
        {
          id: newId(), sort_order: 1, default_selected: true, require_zuhlke_dev: false,
          name: 'Technical Documentation',
          description: 'Keeps all system documentation current. All changes to the system and releases are tracked throughout the entire lifetime of the managed system.',
        },
        {
          id: newId(), sort_order: 2, default_selected: true, require_zuhlke_dev: false,
          name: 'Know-how Retention',
          description: 'Guarantees an available and competent team capable of delivering the agreed services according to the agreed service levels.',
        },
        {
          id: newId(), sort_order: 3, default_selected: true, require_zuhlke_dev: false,
          name: 'Development Environment Maintenance',
          description: 'Maintains local development environments (e.g. laptops) and tools for support and technical engineers. Environments are kept current throughout the maintenance phase of the system.',
        },
      ],
    },
    {
      id: newId(), name: 'Service Management', sort_order: 2, service_type_id: amsId,
      services: [
        {
          id: newId(), sort_order: 1, default_selected: true, require_zuhlke_dev: false,
          name: 'Coordination & Communication',
          description: 'The essential component of service management. Ensures continuity and quality of services for the client, with a dedicated Service Manager as the central point of contact. The Service Manager owns communication, coordination, planning, reporting, and change management based on the agreed service catalogue. Includes regular team re-charterings where necessary.',
        },
        {
          id: newId(), sort_order: 2, default_selected: true, require_zuhlke_dev: false,
          name: 'Service Desk Operation',
          description: 'Operation and maintenance of the client\'s service desk for submitting incident reports and service requests via web portal, email, or telephone.',
        },
        {
          id: newId(), sort_order: 3, default_selected: true, require_zuhlke_dev: false,
          name: 'Incident Management',
          description: 'Restores the service to normal operation as quickly as possible, minimising business impact and maintaining service quality and availability. Normal operation is defined by the Service Level Agreement (SLA). A solution or workaround is made available as quickly as possible to restore the system.',
        },
        {
          id: newId(), sort_order: 4, default_selected: true, require_zuhlke_dev: false,
          name: 'Change Management',
          description: 'A systematic approach to handling all changes to the system. Includes risk assessment, scope definition, and controlled implementation through all environments up to production. Processes are defined and agreed with the client in advance.',
        },
        {
          id: newId(), sort_order: 5, default_selected: false, require_zuhlke_dev: false,
          name: 'Problem Management',
          description: 'Prevents recurring problems and avoids issues with similar root causes through regular analysis of past incidents. Investigates problems and proposes effective solutions or workarounds.',
        },
        {
          id: newId(), sort_order: 6, default_selected: true, require_zuhlke_dev: false,
          name: 'Release Management',
          description: 'Plans, manages, and controls the content and timing of software version deployments through all environments up to production. All risks and impacts are assessed and stakeholders are kept informed throughout.',
        },
        {
          id: newId(), sort_order: 7, default_selected: true, require_zuhlke_dev: false,
          name: 'Service Reporting',
          description: 'Standard KPI reporting based on agreed Service Level Targets (SLT). Reports also serve as the basis for improvement measures. Note: reports reflect services delivered, not the state of the operating system.',
        },
        {
          id: newId(), sort_order: 8, default_selected: false, require_zuhlke_dev: false,
          name: 'Custom Service Reporting',
          description: 'Reports customised by content (e.g. specific KPIs), format, or frequency. Zühlke aims for automation wherever possible — the primary effort is in building the report templates, not in regular generation.',
        },
      ],
    },
    {
      id: newId(), name: 'Support', sort_order: 3, service_type_id: amsId,
      services: [
        {
          id: newId(), sort_order: 1, default_selected: true, require_zuhlke_dev: false,
          name: 'Corrective Maintenance',
          description: 'Reactive maintenance involving patches and fixes in response to incident reports. Urgency is determined by business impact, taking into account Service Level Targets (SLT) and Service Level Agreements (SLA).',
        },
        {
          id: newId(), sort_order: 2, default_selected: false, require_zuhlke_dev: false,
          name: 'Adaptive Maintenance',
          description: 'Addresses system currency as the technology environment evolves — new OS versions, major third-party component releases, and emerging cybersecurity threats. Changes are largely invisible to end users but improve long-term stability.',
        },
        {
          id: newId(), sort_order: 3, default_selected: true, require_zuhlke_dev: false,
          name: 'Preventive Maintenance',
          description: 'Addresses hidden defects and applies fixes before problems occur. Monitors the system, tool stack, source code, and third-party components. Tracks third-party dependencies, assesses update risks, and applies minor/patch version updates (no breaking changes). Monitoring of peripheral systems remains the client\'s responsibility.',
        },
        {
          id: newId(), sort_order: 4, default_selected: false, require_zuhlke_dev: false,
          name: 'Service Request Fulfilment',
          description: 'Organisation, processes, and tools to manage general service requests. Covers intake of standard requests and monitoring of the request pipeline.',
        },
        {
          id: newId(), sort_order: 5, default_selected: false, require_zuhlke_dev: false,
          name: 'Knowledge Base Management',
          description: 'Maintains a client-specific knowledge base to minimise end-user response times and give the support team and stakeholders fast access to known and resolved issues.',
        },
      ],
    },
    {
      id: newId(), name: 'Operations', sort_order: 4, service_type_id: amsId,
      services: [
        {
          id: newId(), sort_order: 1, default_selected: true, require_zuhlke_dev: false,
          name: 'Application Monitoring',
          description: 'Active monitoring of business-critical application components. Analyses all alerts and takes follow-up action to guarantee the availability and stability of the managed system.',
        },
        {
          id: newId(), sort_order: 2, default_selected: true, require_zuhlke_dev: false,
          name: 'Environment Operation',
          description: 'Responsibility for hosting development and test environments. For production systems, Zühlke works with cloud providers, hosting partners, or — where required — the client\'s IT suppliers directly. Includes routine administration tasks, application checks, batch job and log file reviews, system cleanups, and maintaining an operations manual.',
        },
        {
          id: newId(), sort_order: 3, default_selected: true, require_zuhlke_dev: false,
          name: 'Business Data Management',
          description: 'Implements and maintains online and offline backup strategies for production data to prevent data loss. Restores backups within agreed retention periods when needed.',
        },
        {
          id: newId(), sort_order: 4, default_selected: false, require_zuhlke_dev: false,
          name: 'Disaster Recovery',
          description: 'Ensures service continuity from a system perspective. May include automating and regularly testing failover scenarios.',
        },
      ],
    },
    {
      id: newId(), name: 'Enhancements', sort_order: 5, service_type_id: amsId,
      services: [
        {
          id: newId(), sort_order: 1, default_selected: false, require_zuhlke_dev: false,
          name: 'Perfective Maintenance',
          description: 'Improves the system beyond defect fixing. Covers performance optimisation, user interface, usability, and security improvements for both the application and the operational environment. Often triggered by end-user feedback, but not always.',
        },
      ],
    },
  ]
}

// ── CMS service categories and services ────────────────────────────────────

function buildCmsCategories(cmsId) {
  return [
    {
      id: newId(), name: 'Infrastructure Operations and Management', sort_order: 1, service_type_id: cmsId,
      services: [
        {
          id: newId(), sort_order: 1, default_selected: false, require_zuhlke_dev: false,
          name: 'Infrastructure Provisioning & Configuration Management',
          description: 'Deploys and maintains cloud infrastructure through Infrastructure as Code (IaC). Manages environment configurations, executes Terraform deployments, and configures networks across all stages. Implements version control for infrastructure changes and coordinates modifications with clients. Maintains comprehensive infrastructure documentation and follows established change management processes.',
        },
        {
          id: newId(), sort_order: 2, default_selected: false, require_zuhlke_dev: false,
          name: 'Performance Monitoring & Optimisation',
          description: 'Monitors infrastructure performance metrics and identifies optimisation opportunities. Conducts regular load testing to validate system performance. Provides optimisation recommendations based on collected metrics and implements improvements to meet defined SLAs.',
        },
        {
          id: newId(), sort_order: 3, default_selected: false, require_zuhlke_dev: false,
          name: 'Capacity Management & Scaling',
          description: 'Manages resource allocation and implements auto-scaling configurations. Monitors usage patterns and forecasts capacity needs. Defines and maintains scaling rules based on application behaviour and business requirements.',
        },
        {
          id: newId(), sort_order: 4, default_selected: false, require_zuhlke_dev: false,
          name: 'Backup & Recovery Management',
          description: 'Implements and executes backup strategies for cloud infrastructure and data. Tests backup integrity and maintains retention policies. Monitors and maintains Recovery Time Objectives (RTO) and Recovery Point Objectives (RPO). Reviews and updates strategies based on business needs.',
        },
      ],
    },
    {
      id: newId(), name: 'Monitoring and Support', sort_order: 2, service_type_id: cmsId,
      services: [
        {
          id: newId(), sort_order: 1, default_selected: false, require_zuhlke_dev: false,
          name: '24/7 Infrastructure Monitoring',
          description: 'Maintains continuous infrastructure monitoring and alert management. Configures monitoring tools and response procedures. Tracks infrastructure health metrics and responds to alerts within SLA requirements.',
        },
        {
          id: newId(), sort_order: 2, default_selected: false, require_zuhlke_dev: false,
          name: 'Log Management & Analysis',
          description: 'Manages centralised log collection and retention. Analyses logs for troubleshooting and compliance purposes. Provides regular analysis reports to identify patterns and potential issues.',
        },
        {
          id: newId(), sort_order: 3, default_selected: false, require_zuhlke_dev: false,
          name: 'Incident Management & Response',
          description: 'Resolves infrastructure incidents according to defined SLAs. Coordinates response efforts and maintains stakeholder communication throughout. Conducts post-incident reviews to prevent recurrence.',
        },
        {
          id: newId(), sort_order: 4, default_selected: false, require_zuhlke_dev: false,
          name: 'Disaster Recovery Testing',
          description: 'Executes regular disaster recovery tests and maintains procedures. Verifies recovery capabilities against defined objectives. Updates documentation based on test outcomes.',
        },
      ],
    },
    {
      id: newId(), name: 'Cost Management and Optimisation', sort_order: 3, service_type_id: cmsId,
      services: [
        {
          id: newId(), sort_order: 1, default_selected: false, require_zuhlke_dev: false,
          name: 'Cost Monitoring & Reporting',
          description: 'Tracks resource costs and analyses usage patterns. Delivers monthly cost analysis reports with service-level breakdowns. Maintains cost allocation tags and provides optimisation recommendations.',
        },
        {
          id: newId(), sort_order: 2, default_selected: false, require_zuhlke_dev: false,
          name: 'Resource Optimisation Recommendations',
          description: 'Identifies optimisation opportunities and provides actionable recommendations. Reviews utilisation patterns and implements approved optimisation measures. Coordinates improvements with client teams.',
        },
        {
          id: newId(), sort_order: 3, default_selected: false, require_zuhlke_dev: false,
          name: 'Budget Management & Forecasting',
          description: 'Tracks cloud spending against defined budgets and generates deviation alerts. Provides spending forecasts based on usage trends. Aligns recommendations with business growth requirements.',
        },
        {
          id: newId(), sort_order: 4, default_selected: false, require_zuhlke_dev: false,
          name: 'Waste Identification & Elimination',
          description: 'Identifies and removes unused or underutilised resources. Conducts regular resource audits and cleanup activities. Reports on achieved cost savings and efficiency improvements.',
        },
      ],
    },
    {
      id: newId(), name: 'Security Services', sort_order: 4, service_type_id: cmsId,
      services: [
        {
          id: newId(), sort_order: 1, default_selected: false, require_zuhlke_dev: false,
          name: 'Security Monitoring & Threat Detection',
          description: 'Governance: Defines security monitoring policies, alert thresholds, and response procedures. Establishes security baselines and incident management frameworks. Creates threat detection requirements and response protocols. Implementation: Deploys monitoring tools, manages WAF configurations, and responds to security alerts. Maintains security logging systems and executes incident response procedures within SLAs.',
        },
        {
          id: newId(), sort_order: 2, default_selected: false, require_zuhlke_dev: false,
          name: 'Identity & Access Management',
          description: 'Governance: Establishes access control policies and authentication requirements. Defines role-based access frameworks and review procedures. Implementation: Configures RBAC systems, deploys authentication mechanisms, and maintains user lifecycle management. Integrates identity providers and implements multi-factor authentication.',
        },
        {
          id: newId(), sort_order: 3, default_selected: false, require_zuhlke_dev: false,
          name: 'Compliance Monitoring & Reporting',
          description: 'Governance: Defines compliance frameworks and control requirements. Creates monitoring strategies and reporting standards. Implementation: Configures compliance monitoring tools, conducts regular scans, and generates compliance reports. Executes remediation measures for identified gaps.',
        },
        {
          id: newId(), sort_order: 4, default_selected: false, require_zuhlke_dev: false,
          name: 'Security Patch Management',
          description: 'Governance: Establishes patch management policies and vulnerability assessment requirements. Defines update procedures and maintenance windows. Implementation: Deploys security updates, manages SSL/TLS certificates, and maintains patch levels. Executes vulnerability scans and implements critical security fixes.',
        },
      ],
    },
    {
      id: newId(), name: 'Cloud Governance', sort_order: 5, service_type_id: cmsId,
      services: [
        {
          id: newId(), sort_order: 1, default_selected: false, require_zuhlke_dev: false,
          name: 'Policy Management & Enforcement',
          description: 'Develops and enforces cloud governance policies. Implements controls and conducts compliance checks. Reviews and updates policies based on changing requirements.',
        },
        {
          id: newId(), sort_order: 2, default_selected: false, require_zuhlke_dev: false,
          name: 'Resource Tagging & Organisation',
          description: 'Implements resource tagging strategies and organisational structures. Enforces tagging policies and conducts compliance audits. Maintains organisation for cost allocation and security purposes.',
        },
        {
          id: newId(), sort_order: 3, default_selected: false, require_zuhlke_dev: false,
          name: 'Access Control Management',
          description: 'Implements least-privilege access principles and maintains security controls. Reviews access permissions regularly and maintains audit trails. Updates policies based on security requirements.',
        },
        {
          id: newId(), sort_order: 4, default_selected: false, require_zuhlke_dev: false,
          name: 'Change Management',
          description: 'Manages infrastructure change requests and coordinates implementations. Documents and approves changes according to established procedures. Conducts post-change reviews to verify success.',
        },
      ],
    },
  ]
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('Connecting to Azure SQL Server...')
  const pool = await sql.connect(config)
  console.log('Connected.\n')

  try {
    // ── 1. Delete all quotes (FK order: complexity_scores → quote_services → quotes) ──
    console.log('Deleting all quotes...')
    await run(pool, `DELETE FROM complexity_scores`)
    await run(pool, `DELETE FROM quote_services`)
    await run(pool, `DELETE FROM quotes`)
    const remaining = await run(pool, `SELECT COUNT(*) as cnt FROM quotes`)
    console.log(`  ✓ quotes deleted (${remaining.recordset[0].cnt} remaining)`)

    // ── 2. Delete old services and categories ──────────────────────────────
    console.log('Deleting old service data...')
    await run(pool, `DELETE FROM services`)
    await run(pool, `DELETE FROM service_categories`)
    const svcCheck = await run(pool, `SELECT COUNT(*) as cnt FROM services`)
    const catCheck = await run(pool, `SELECT COUNT(*) as cnt FROM service_categories`)
    console.log(`  ✓ services: ${svcCheck.recordset[0].cnt}, categories: ${catCheck.recordset[0].cnt}`)

    // ── 3. Get service_type IDs from DB ────────────────────────────────────
    const stIds = await getServiceTypeIds(pool)
    if (!stIds['ams'] || !stIds['cms']) {
      throw new Error('service_types rows for ams/cms not found — run seed.mjs first')
    }
    console.log(`  ✓ service_type IDs: ams=${stIds['ams'].substring(0,8)}... cms=${stIds['cms'].substring(0,8)}...`)

    // ── 4. Insert new AMS + CMS categories and services ───────────────────
    console.log('Inserting new AMS service categories and services...')
    const allCategories = [
      ...buildAmsCategories(stIds['ams']),
      ...buildCmsCategories(stIds['cms']),
    ]

    let catCount = 0, svcCount = 0
    for (const cat of allCategories) {
      const catName = esc(cat.name)
      await run(pool, `
        INSERT INTO service_categories (id, name, sort_order, service_type_id)
        VALUES ('${cat.id}', N'${catName}', ${cat.sort_order}, '${cat.service_type_id}')
      `)
      catCount++

      for (const svc of cat.services) {
        const svcName = esc(svc.name)
        const svcDesc = esc(svc.description)
        await run(pool, `
          INSERT INTO services (id, name, description, sort_order, default_selected, require_zuhlke_dev, service_category_id)
          VALUES ('${svc.id}', N'${svcName}', N'${svcDesc}', ${svc.sort_order}, ${svc.default_selected ? 1 : 0}, ${svc.require_zuhlke_dev ? 1 : 0}, '${cat.id}')
        `)
        svcCount++
      }
    }
    console.log(`  ✓ ${catCount} categories, ${svcCount} services inserted`)

    // ── Verify ──────────────────────────────────────────────────────────────
    console.log('\n── Verification ──────────────────────────────────────────')
    const tables = ['quotes', 'service_categories', 'services']
    for (const t of tables) {
      const r = await run(pool, `SELECT COUNT(*) as cnt FROM ${t}`)
      console.log(`  ${t}: ${r.recordset[0].cnt} rows`)
    }

    console.log('\n✅ Reset complete.')
  } finally {
    await pool.close()
  }
}

main().catch(err => {
  console.error('Reset failed:', err.message)
  process.exit(1)
})
