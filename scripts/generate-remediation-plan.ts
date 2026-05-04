#!/usr/bin/env tsx
// ============================================================
// Adaptix Ops — Generate Remediation Plans
// ============================================================
// Loads failing incidents, generates remediation plans,
// updates GitHub issues with AI Remediation Plan section.
// humanReviewRequired is always true for production incidents.
// Never auto-merges anything.
// ============================================================

import { generateRemediationPlan } from "./lib/remediation.js";
import { loadSnapshot, saveSnapshot } from "./lib/project.js";
import { findOpenIssueByLabel, commentOnIssue } from "./lib/github.js";
import type { RemediationPlan, ModelStatus } from "./lib/types.js";

const OPS_REPO = "joshuawendorf21310/adaptix-ops";

const PRODUCTION_IMPACTING = [
  "production_route_mismatch",
  "production_deployment_failed",
  "production_smoke_failed",
  "production_api_health_failed",
  "production_auth_failed",
  "production_payment_failed",
  "production_operational_entry_failed",
];

function buildRemediationSection(plan: RemediationPlan): string {
  const status = plan.modelStatus === "UNKNOWN"
    ? `**AI Remediation Plan: UNKNOWN** — ${plan.reason ?? "model unavailable"}`
    : `**AI Remediation Plan: GENERATED**`;

  return `
## AI Remediation Plan

${status}

| Field | Value |
|-------|-------|
| **Model Status** | ${plan.modelStatus} |
| **Target Repo** | \`${plan.targetRepo}\` |
| **Risk Level** | **${plan.riskLevel.toUpperCase()}** |
| **Human Review Required** | **${plan.humanReviewRequired}** |
| **Blocked By Missing Info** | ${plan.blockedByMissingInformation} |
| **Generated At** | ${plan.generatedAt} |

### Fix Strategy
${plan.fixStrategy}

### Likely Files
${plan.likelyFiles.length > 0
  ? plan.likelyFiles.map((f) => `- \`${f}\``).join("\n")
  : "_No specific files identified — search target repo for route/component/deploy config_"}

### Code-Level Fix Behavior
${plan.codeLevelFix.length > 0
  ? plan.codeLevelFix.map((f) => `- ${f}`).join("\n")
  : "_Not specified_"}

### Commands
${plan.commands.length > 0
  ? plan.commands.map((c) => `\`\`\`\n${c}\n\`\`\``).join("\n")
  : "_No commands specified_"}

### Validation Plan
${plan.validationPlan.length > 0
  ? plan.validationPlan.map((v) => `- ${v}`).join("\n")
  : "_No validation plan specified_"}

### No-Drift Rules
${plan.noDriftRules.length > 0
  ? plan.noDriftRules.map((r) => `- ⚠️ ${r}`).join("\n")
  : "_None specified_"}

> **IMPORTANT:** This is an AI-generated plan. Human review is required before any production fix is merged.
> Auto-merge is forbidden for production-impacting failures.
`;
}

// ── Main ──────────────────────────────────────────────────────

console.log("\n[generate-remediation-plan] Loading snapshot...");
const snapshot = loadSnapshot();

const failingIncidents = snapshot.incidents.filter(
  (i) => i.status !== "RESOLVED"
);

console.log(`[generate-remediation-plan] ${failingIncidents.length} open incident(s)`);

const remediationPlans: RemediationPlan[] = [];

for (const incident of failingIncidents) {
  console.log(`[generate-remediation-plan] Planning: ${incident.contractId}`);

  const plan = await generateRemediationPlan(
    incident,
    snapshot.repoHealth,
    snapshot.routeContracts
  );

  // Always require human review for production-impacting failures
  if (PRODUCTION_IMPACTING.includes(incident.failureType)) {
    plan.humanReviewRequired = true;
  }

  remediationPlans.push(plan);
  console.log(
    `[generate-remediation-plan] ${incident.contractId} → ${plan.modelStatus} (risk: ${plan.riskLevel})`
  );

  // Update GitHub issue
  if (incident.issueNumber) {
    try {
      const existing = await findOpenIssueByLabel(OPS_REPO, incident.contractId);
      if (existing) {
        const section = buildRemediationSection(plan);
        await commentOnIssue(OPS_REPO, existing.number, section);
        console.log(`[generate-remediation-plan] Updated issue #${existing.number}`);
      }
    } catch (err) {
      console.warn(`[generate-remediation-plan] Failed to update issue:`, err);
    }
  }
}

// Update snapshot
const updatedSnapshot = {
  ...snapshot,
  intelligence: {
    ...snapshot.intelligence,
    remediationPlans,
  },
  generatedAt: new Date().toISOString(),
};

saveSnapshot(updatedSnapshot);
console.log(`\n[generate-remediation-plan] Done. ${remediationPlans.length} plan(s) saved.`);
