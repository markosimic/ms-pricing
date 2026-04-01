# Processes and Operations — Zühlke Managed Services

## Overview

All MS operational processes are ISO 20000 certified and documented in the **Service Management System (SMS)** on SharePoint. The SMS covers 14 areas including scope, policy, planning, risk management, service portfolio, relationship and agreement processes, supply and demand, service design, transition, delivery, and resolution processes.

Operations are not optional bureaucracy — they are the tools that allow Zühlke to fulfil contractual SLA obligations at scale.

---

## Engagement Lifecycle

### Phase 0/1: Bid Governance (Gate 0/1)

No contracting proceeds without all three gates cleared:

| Gate | Requirement | Owner |
|---|---|---|
| Gate 0: Template | Approved MS contract template selected (CH, DE, or AT jurisdiction) | MS Commercial Lead |
| Gate 1: SLAs | SLAs defined, agreed, and documented | MS Commercial Lead → Service Manager |
| Gate 1: Cost Plan | Cost/delivery plan reviewed by MS | MS Commercial Lead |

If a client is being onboarded onto a pre-sold or complex contract, stop and escalate to MS Commercial Lead before proceeding.

### Phase 1: Bid

Key activities before building any proposal:

**Initial Client Questions — must ask:**
- Does support need to be in German or another language? (affects GDC staffing and cost)
- Will you use ISO 20000 processes or the client's? (client processes add complexity and overhead)
- Does the client need 1st or 2nd level support in addition to 3rd level? (determines if subcontractors are needed)
- How many suppliers are involved, and who coordinates them? (adds effort and risk)
- Is a standard monthly/quarterly report enough, or custom reports needed? (custom reports create significant overhead)
- How does the client rate business criticality? (drives SLA tier and pricing)
- Which support hours apply — Standard, Extended, or 24×7? (determines team size and cost model)
- How complex is the application? (use System Complexity Assessment framework)

**Business Criticality Assessment:**
A structured conversation to determine SLA tier. Must involve people who can speak to business impact of downtime.

| Level | Criteria |
|---|---|
| Low | Most (>50%) impacts are negligible. No business-threatening impacts. |
| Medium | Some (<50%) impacts are significant. No business-threatening impacts. |
| High | Most (>50%) impacts are significant. Some (<50%) are business-threatening. |
| Very High | Most (>50%) impacts are business-threatening. |

### Phase 2: Contracting

Use the modular template suite from SharePoint (MS Contracts & Templates). Do not start from scratch or adapt from previous deals.

Templates:
- **Base MS**: every deal — core terms, SLAs, obligations
- **Market Addendum**: country-specific clauses for CH, DE, AT, UK, or SG
- **Options / SLAs**: when specific SLA tiers or optional services are needed

For DACH clients: contract stays in German. Do not modify or translate the contract template.

Key negotiation rules:
- Zühlke manages the service — we do not deliver staff. Contract must state staffing is Zühlke's responsibility.
- Stick to standard packages — no custom SLA combinations without strong reason.
- Avoid penalties. If client insists, counter with bonus/malus (Zühlke must have upside too). Never accept penalties without this.
- Budget warranty (Gewährleistung) in base fee — average 2–4% of initial project investment.
- Do not guarantee warranty for third-party solutions.
- Warranty ≠ Hypercare. Warranty is a legal obligation about liability. Hypercare is elevated post-go-live support (faster response, closer monitoring) for a defined period — it is a service model, not a legal obligation.
- Do not cross-reference project contracts in maintenance contracts (project contracts expire first).
- Subcontractor SLAs must be aligned with the SLAs Zühlke commits to the client.

### Phase 3: Client Onboarding

Steps after contract signing, before maintenance phase starts:

| Step | Owner |
|---|---|
| Service catalogue check — compare offering phase catalogue with final contract, flag discrepancies | Account Lead / Service Manager |
| Operations Readiness Checklist — review with delivery lead and engineers; focus on Documentation, Code, Infrastructure | Service Manager |
| Acceptance process — agree TZW, define who fixes findings, document handling of tech debt from dev phase | Service Manager |
| Documentation setup — create Confluence project page with entry points (docs, code repo, stakeholders, password manager); create onboarding guide | Service Manager |
| Service desk configuration — configure ITSM tool (JSM, ServiceNow, FreshService, etc.), map SLAs, prepare client guide | Service Manager |
| Risk assessment — identify risks from project phase and new maintenance-specific risks, document mitigation plans | Service Manager |
| Kick off with engineers — client intro, services sold, ISO 20000 processes, remaining transition tasks, risks, budget, Vertec structure | Service Manager |
| Kick off with client — what changes from dev to maintenance, new stakeholders, new processes (incidents, changes, service requests), service desk entry points, delivery schedule | Service Manager |

### Phase 4: Ongoing Delivery

**Incident Management:**
Incidents are classified by severity. SLA response and resolution targets must be met per the contracted tier.

| Severity | Description |
|---|---|
| Severity 1: Critical | Mission-critical system is down, no workaround, business operations severely disrupted or stopped. 24×7 coverage. |
| Severity 2: High | Major functionality impaired, workaround available but inadequate. Business hours coverage. |
| Severity 3: Medium | Partial functionality impaired, acceptable workaround exists. Business hours coverage. |
| Severity 4: Low | Minor issue, cosmetic or informational. Business hours coverage. |

**Change Management:**
All changes must follow the documented change process. ISO 20000 requires this — you cannot bypass the change process even for seemingly minor changes.

**Reporting:**
- Standard monthly or quarterly reports delivered to client
- Steering Committee reports
- QBR (Quarterly Business Review) preparation and delivery — includes service performance trends, SLA compliance, risks, and improvement plans
- Custom reports are possible but add significant overhead and cost

**Continual Service Improvement (CSI):**
Structured process for identifying and implementing service improvements over time. Not ad hoc — formally tracked and reported.

**Knowledge Transfer:**
Formal process for transferring knowledge between engineers and across engagement transitions. Includes structured documentation, runbooks, and onboarding guides.

**Risk Management:**
Risks are identified during onboarding and reviewed throughout the engagement. Mitigation plans are documented. Engagement Manager (EM) is involved where appropriate.

### Contract Renewal

Before renewal negotiations, collect input from both sides:

From delivery team:
- Main cost drivers
- What did not work well
- Where processes don't reflect reality
- Where delivery reality doesn't match original cost/effort assumptions

From client:
- Which services stay as-is vs need to change
- Which contractual obligations don't add value
- Whether the pricing model should change for any services

---

## SLA Reference

### Support Tiers

| Tier | Coverage |
|---|---|
| Standard | 09:00–17:00, working days |
| Extended | 06:00–20:00, working days |
| 24×7 | 00:00–24:00, every day including public holidays |

If client requests hours between tiers, the next higher tier applies.

### SLA Response/Resolution by Business Criticality (Critical incidents)

| SLA Target | Low | Medium | High | Very High |
|---|---|---|---|---|
| Response Time | Best effort | 8 hours | <4 hours | ≤1 hour |
| Resolution Time | Best effort | 48 hours | 1 business day | ≤8 hours |

### Full SLA Tier Summary (Standard Contracted Tier)

| | Severity 1: Critical | Severity 2: High | Severity 3: Medium | Severity 4: Low |
|---|---|---|---|---|
| Response Time | 15 minutes | 2 hours | 8 business hours | 1 business day |
| Response SLA | 100% | 100% | 90% | 90% |
| Resolution Time | 4 hours | 2 business days | 5 business days | N/A |
| Resolution SLA | 95% | 95% | 95% | — |
| Coverage | 24×7 | Business hours | Business hours | Business hours |

---

## ISO 27001 Compliance Process (Per Project)

| Step | Action |
|---|---|
| 1 | Create ISO 27001 folder in SharePoint (Project Teams channel) |
| 2 | Complete security criticality assessment. Store and log it. |
| 3 | Review assessment with Engagement Manager (EM). EM decides final classification. Log it. |
| 4 | Report classification in Vertec. |
| 5 | Create or collect required documentation based on classification level. |
| 6 | Create "ISO 27001" Confluence page and link all required documents. |

Documentation requirements by level: Low = project risk classification + contract overview. Medium = Low + assets & infrastructure inventory, project risk register, collaboration agreement. High = Medium + onboarding material + ongoing review of project documentation.
