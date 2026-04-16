# Infrastructure Configuration — ms-pricing

## Dockerfile Parameters

| Parameter | Value |
|---|---|
| Base image | `node:22` |
| System packages | `openssl` (apt-get) |
| Working directory | `/app` |
| Build step | `npm install` → `npx prisma generate` → `npm run build` |
| Static assets fix | `.next/static` and `public` copied into `.next/standalone/` manually |
| Exposed port | `3000` |
| Start command | `node .next/standalone/server.js` |

### Key Docker Notes
- Dependencies are installed **inside** the container to ensure architecture match (Linux/arm vs Mac/arm mismatch avoided)
- Prisma is regenerated inside the container (`npx prisma generate`) so the correct Linux engine binary is used
- Next.js standalone output does NOT include static assets — they must be copied manually post-build

---

## Prisma Schema Parameters

### Generator
| Setting | Value |
|---|---|
| Provider | `prisma-client-js` |
| Binary targets | `native`, `debian-openssl-3.0.x`, `linux-arm64-openssl-3.0.x`, `darwin-arm64` |

### Datasource
| Setting | Value |
|---|---|
| Provider | `sqlserver` |
| URL | `env("DATABASE_URL")` |

### Binary Target Notes
- `native` resolves to the current machine's platform at `prisma generate` time
- `debian-openssl-3.0.x` — needed for Docker container (node:22 is Debian-based)
- `darwin-arm64` — needed for Mac M1/M2 local development
- Local dev (`npm install` on Mac) only generates the darwin binary — Linux binary is generated inside Docker

---

## Azure Resources

| Resource | Value |
|---|---|
| Resource Group | `zuhlke-managed-services-price-calculator` |
| App URL | `https://ms-pricing.happyrock-06ef40c1.switzerlandnorth.azurecontainerapps.io` |
| Container App | `ms-pricing` |
| Container Registry | `acrmspricing.azurecr.io` |
| SQL Server | `ms-pricing-sql.database.windows.net` |
| SQL Database | `ms-pricing-db` |
| SQL Admin User | `msadmin` |

### DATABASE_URL Format (Prisma SQL Server)
```
sqlserver://ms-pricing-sql.database.windows.net:1433;database=ms-pricing-db;user=msadmin;password=<PASSWORD>;encrypt=true;trustServerCertificate=false;
```

---

## Database Schema — Tables Summary

| Table | Purpose |
|---|---|
| `users` | App login credentials |
| `service_types` | AMS / CMS top-level types |
| `service_categories` | Groups of services within a type |
| `services` | Individual services in the catalogue |
| `delivery_locations` | Delivery location + CHF hourly rate |
| `support_levels` | L1/L2/L3 support depth + uplift |
| `coverage_options` | Hours coverage window (8x5, 12x5, 24x7) + uplift |
| `sla_sizes` | Application size tiers + uplift |
| `currencies` | Output currency options |
| `quotes` | Saved pricing quotes |
| `quote_services` | M2M: which services are in a quote |
| `complexity_categories` | Complexity scoring dimensions |
| `complexity_scores` | Per-quote complexity scores |

### Pricing Formula (from QuoteWizard)
```
baseChf          = totalFte × hourlyRateCHF × workingHoursPerMonth
internalCostChf  = baseChf × (1 + supportUplift) × (1 + coverageUplift)
clientPriceChf   = internalCostChf × (1 + marginPct/100) × (1 − discountPct/100)
```

### Default Form Values (hardcoded in QuoteWizard)
| Field | Default logic |
|---|---|
| `delivery_location_id` | First `delivery_locations` row where `name` contains `'GDC'` |
| `support_level_id` | `support_levels` row where `code = 'l3'` |
| `coverage_option_id` | `coverage_options` row where `code = '8x5'` |
| `margin_pct` | 30% |
| `discount_pct` | 0% |
| `working_hours_per_month` | 168 |
| `contract_duration_years` | 3 |
| `output_currency_code` | CHF |
