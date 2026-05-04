#!/usr/bin/env tsx
// ============================================================
// Adaptix Ops — Sync Remediation PRs
// ============================================================
// Finds PRs linked to open incidents, fetches check status,
// review state, and validation results. Never merges PRs.
// Never closes incidents unless deterministic contracts pass.
// ============================================================

import { findLinkedPRsForIncident, syncRemediationPR } from "./lib/pullRequests.js";
import { loadSnapshot, saveSnapshot } from "./lib/project.js";
import type { RemediationPR, CheckStatus } from "./lib/types.js";

console.log("\n[sync-remediation-prs] Loading snapshot...");
const snapshot = loadSnapshot();

const openIncidents = snapshot.incidents.filter(
  (i) => i.status !== "RESOLVED"
);

console.log(`[sync-remediation-prs] ${openIncidents.length} open incident(s) to check`);

const allPRs: RemediationPR[] = [];
const blockedIncidents: string[] = [];
const readyForHumanReview: string[] = [];

for (const incident of openIncidents) {
  console.log(`[sync-remediation-prs] Checking PRs for: ${incident.contractId}`);

  // Get current validation status from route contracts
  const contractResult = snapshot.routeContracts.find(
    (r) => r.contractId === incident.contractId
  );
  const validationStatus: CheckStatus = contractResult?.status ?? "UNKNOWN";

  try {
    const linkedPRs = await findLinkedPRsForIncident(incident);
    console.log(
      `[sync-remediation-prs] Found ${linkedPRs.length} PR(s) for ${incident.contractId}`
    );

    for (const pr of linkedPRs) {
      const remediationPR = await syncRemediationPR(incident, pr, validationStatus);
      allPRs.push(remediationPR);

      if (remediationPR.mergeRecommendation === "ready_for_human_review") {
        readyForHumanReview.push(incident.contractId);
      } else if (remediationPR.mergeRecommendation === "blocked") {
        blockedIncidents.push(incident.contractId);
      }
    }

    if (linkedPRs.length === 0) {
      // No PRs found — incident is blocked waiting for a fix
      blockedIncidents.push(incident.contractId);
    }
  } catch (err) {
    console.warn(
      `[sync-remediation-prs] Failed to sync PRs for ${incident.contractId}:`,
      err
    );
    blockedIncidents.push(incident.contractId);
  }
}

// Update snapshot
const updatedSnapshot = {
  ...snapshot,
  remediation: {
    openPrs: allPRs,
    blockedIncidents: [...new Set(blockedIncidents)],
    readyForHumanReview: [...new Set(readyForHumanReview)],
  },
  generatedAt: new Date().toISOString(),
};

saveSnapshot(updatedSnapshot);

console.log(`\n[sync-remediation-prs] ═══════════════════════════════`);
console.log(`[sync-remediation-prs] Open PRs tracked:     ${allPRs.length}`);
console.log(`[sync-remediation-prs] Blocked incidents:    ${blockedIncidents.length}`);
console.log(`[sync-remediation-prs] Ready for review:     ${readyForHumanReview.length}`);
console.log(`[sync-remediation-prs] Snapshot saved.`);
console.log(`[sync-remediation-prs] ═══════════════════════════════\n`);
console.log(`[sync-remediation-prs] NOTE: No PRs were merged. No incidents were closed.`);
console.log(`[sync-remediation-prs] Incidents close only when deterministic contracts pass.`);
