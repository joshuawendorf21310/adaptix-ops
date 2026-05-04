# Adaptix Polyrepo Operations Command Center

**Control Repo:** `joshuawendorf21310/adaptix-ops`  
**Source of Truth:** GitHub  
**Visual Layer:** GitHub Projects + Custom Adaptix Dashboard  
**Coverage:** All Adaptix repos — deployments, builds, smoke tests, incidents, security signals

---

## Overview

This repository is the central operations monitor for the entire Adaptix polyrepo ecosystem. It watches all Adaptix repositories for:

- CI failures and build failures
- Deployment failures and wrong-route deployments
- Production route drift (HTTP 200 but wrong content)
- Smoke-test failures
- Migration validation failures
- Stale frontend deployments
- Service health failures
- Security findings (Dependabot, CodeQL, secret scanning)
- Project-tracked operational incidents

---

## Current Known Production Incident

| Field | Value |
|-------|-------|
| **Repo** | `joshuawendorf21310/adaptix-web` |
| **Domain** | `https://adaptixcore.com/` |
| **Status** | FAIL |
| **Failure Type** | `production_route_mismatch` |
| **Severity** | P0 |
| **Expected** | Cinematic AdaptixCore landing page with required signatures |
| **Actual** | HTTP 200 but required landing-page signatures missing or forbidden fallback signatures present |

---

## Repository Structure

```
adaptix-ops/
  README.md
  package.json
  tsconfig.json
  .env.example
  .github/
    workflows/
      production-sweep.yml       # Runs every 15 min — route contracts + incidents
      repo-health-sweep.yml      # Runs every 30 min — CI/deploy status per repo
      security-sweep.yml         # Runs every 6 hours — security alerts per repo
      dashboard-build.yml        # Builds Next.js dashboard on push
  config/
    repos.json                   # All monitored Adaptix repos
    route-contracts.json         # Production route smoke-test contracts
    service-health-contracts.json
    security-contracts.json
    project-fields.json
  scripts/
    lib/
      types.ts                   # Shared TypeScript types
      github.ts                  # GitHub REST API client
      http.ts                    # HTTP fetch with timeout
      contracts.ts               # Route contract evaluation
      incidents.ts               # GitHub issue incident management
      project.ts                 # GitHub Project integration
    check-route-contracts.ts
    check-github-workflows.ts
    check-deployments.ts
    check-security-alerts.ts
    create-or-update-incident.ts
    run-production-sweep.ts
    run-repo-health-sweep.ts
    run-security-sweep.ts
  dashboard/
    app/
      layout.tsx
      page.tsx                   # Executive health overview
      repos/page.tsx             # All repos health grid
      deployments/page.tsx       # Deployment timeline
      incidents/page.tsx         # Open incidents
      security/page.tsx          # Security findings
    components/
      DashboardShell.tsx
      HealthGrid.tsx
      RepoCard.tsx
      DeploymentTimeline.tsx
      IncidentPanel.tsx
      SeverityBadge.tsx
      StatusBadge.tsx
    lib/
      data.ts
      types.ts
    public/
      adaptix-ops.json           # Live sweep output — dashboard reads this
```

---

## Status Model

| Status | Meaning |
|--------|---------|
| **PASS** | All required checks passed |
| **WARN** | Non-blocking risk exists |
| **FAIL** | Build, deploy, route contract, smoke test, or security critical condition failed |
| **BLOCKED** | A dependency step failed and later validation could not run |
| **UNKNOWN** | Signal could not be retrieved or does not exist |

## Severity Model

| Severity | Meaning |
|----------|---------|
| **P0** | Public production route, deploy, auth, payment, or core platform entry failure |
| **P1** | Production service degradation, staging release blocker, migration risk, high security alert |
| **P2** | Non-production failure, test instability, performance regression, non-critical integration drift |
| **P3** | Docs, labels, metadata, dashboard, or automation cleanup |

---

## Running Locally

```bash
# Install dependencies
npm ci

# Type check
npm run typecheck

# Check production route contracts
npm run check:routes

# Run full production sweep (writes dashboard/public/adaptix-ops.json)
npm run sweep:production

# Run repo health sweep
npm run sweep:repos

# Run security sweep
npm run sweep:security
```

Requires `GITHUB_TOKEN` environment variable with `repo`, `security_events`, and `read:org` scopes.

---

## Dashboard

```bash
cd dashboard
npm ci
npm run build
npm run dev   # http://localhost:3000
```

The dashboard reads from `dashboard/public/adaptix-ops.json`. No backend server required.

---

## GitHub Actions

| Workflow | Schedule | Purpose |
|----------|----------|---------|
| `production-sweep.yml` | Every 15 min | Route contracts, incidents, P0 detection |
| `repo-health-sweep.yml` | Every 30 min | CI/deploy status per repo |
| `security-sweep.yml` | Every 6 hours | Security alerts per repo |
| `dashboard-build.yml` | On push | Build and validate dashboard |

---

## No-Drift Rules

- HTTP 200 alone is **never** PASS for route contracts
- A route is PASS only when all required content is present AND no forbidden content is present
- Duplicate incidents are never created for the same contract id
- An incident is only closed when the exact failed contract passes
- UNKNOWN states are never hidden
- Real GitHub data is never replaced with fixture data
- The `adaptixcore-production-homepage-contract` is never weakened
- P0 severity for production route mismatch is never changed
