# Technical Landscape — Zühlke Managed Services

## Core Tools

### ITSM / Service Desk
MS uses ITSM tooling to manage incidents, service requests, and changes. The specific tool is configured per client engagement. Supported platforms include:
- **Jira Service Management (JSM)** — most common
- **ServiceNow**
- **FreshService**

Service desk setup is part of the client onboarding checklist. SLAs are mapped in the tool, and a service desk guide is prepared for the client.

### Project & Time Tracking
- **Vertec** — used for project tracking, budget management, and reporting. Budget structure and Vertec setup are covered in engineer kick-off sessions during onboarding.

### Documentation & Knowledge Management
- **Confluence** — this space (AMSZTG) is the central knowledge base for Zühlke Managed Services internally. Each client engagement also gets a Confluence project summary page with entry points: documentation, code repository, stakeholders, and password manager.
- **SharePoint** — used for formal SMS (Service Management System) documentation, contract templates, pre-sales collateral, cost plans, and compliance documents.

### Source Control & CI/CD
Zühlke MS inherits the DevOps tooling from the project phase. During pre-sales, the quality of DevOps adoption (monitoring, CI/CD, log management) is assessed as a cost driver. Poor DevOps maturity increases MS effort and therefore cost.

### Monitoring & Observability
Monitoring setup is assessed per engagement during pre-sales. Questions asked:
- Are monitoring tools in place?
- How well are DevOps tools adopted (monitoring, CI/CD, log management)?
- Is log management configured?

Zühlke MS monitors applications within agreed SLAs. The specific monitoring stack is client/application dependent.

### AI-Enhanced Operations
MS is integrating AI into operational workflows. The goal is to move beyond reactive maintenance toward proactive utility provider behaviour. This is a strategic differentiator. A dedicated "AI Enhanced Operations" sub-section exists in the Operations area of the Confluence space.

---

## Service Management System (SMS)

The SMS is the backbone of ISO 20000 compliance. It is documented on SharePoint and structured across 14 areas:
1. Scope
2. Policy
3. Planning
4. Risk management
5. Service portfolio
6. Relationship and agreement processes
7. Supply and demand
8. Service design
9. Transition
10. Delivery
11. Resolution processes
12. (and additional areas)

The SMS is independently audited. All operational processes described in Confluence are documented in full in the SMS on SharePoint.

---

## Security & Compliance Infrastructure

### ISO 27001 Per-Project Folder Structure
Each MS project must have:
- ISO 27001 folder in SharePoint (Project Teams channel)
- Security criticality assessment (reviewed and classified by Engagement Manager)
- Documentation per classification level (Low / Medium / High)
- ISO 27001 Confluence page with links to all required documents

### Password Management
A password manager is part of the standard documentation setup for each engagement (linked from the client's Confluence project page).

---

## Client Technical Environment

Each client's technical landscape varies. The pre-sales assessment captures:

| Question | Why It Matters |
|---|---|
| How complex is the application logic? | Drives team size and effort |
| Does the system have multiple components, mobile apps, or microservices? | Increases support complexity |
| Are there data access restrictions (e.g., no remote access from outside CH)? | Affects staffing (restricts GDC use) |
| What is the quality and documentation level of the application? | Affects ramp-up time and risk |
| How well are DevOps tools adopted (monitoring, CI/CD, log management)? | Poor adoption increases MS cost |

The **System Complexity Assessment Framework** is used to formally score application complexity. It drives effort estimation and SLA pricing.

---

## Technical Gaps / Notes

- The specific AI tooling used in AI-enhanced operations is not fully documented in this Confluence space — it exists as a sub-page under Operations but detail is limited.
- Monitoring stack details are not standardised — they are client-specific and captured in individual project documentation, not in this central space.
- DevOps tooling (CI/CD, deployment pipelines) is inherited from the project phase and not standardised across MS engagements.
