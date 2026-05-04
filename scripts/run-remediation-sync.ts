#!/usr/bin/env tsx
// ============================================================
// Adaptix Ops — Remediation Sync
// ============================================================
// Finds linked PRs, syncs check status, review state,
// and validation state. Never merges PRs.
// Never closes incidents unless deterministic contracts pass.
// ============================================================

import { findLinkedPRsForIncident, syncRemediationPR } from "./lib/pullRequests.js";
import { loadSnapshot, saveSnapshot } from "./lib/project.js";
import type { RemediationPR, CheckStatus } from "./lib/types.js";

console.log("\n╔══════════════════════════════════════════════════════════╗");
console.log("║  ADAPTIX OPS — REMEDIATION SYNC                         ║");
console.log("╚══════════════════════════════════════════════════════════╝\n");

const snapshot = loadSnapshot();
const openIncidents = snapshot.incidents.filter((i) => i.status !== "RESOLVED");

console.log(`[sync:remediation] ${openIncidents.length} open incident(s) to sync`);

const allPRs: RemediationPR[] = [];
const blockedIncidents: string[] = [];
const readyForHumanReview: string[] = [];

for (const incident of openIncidents) {
  console.log(`[sync:remediation] Syncing: ${incident.contractId}`);

  const contractResult = snapshot.routeContracts.find(
    (r) => r.contractId === incident.contractId
  );
  const validationStatus: CheckStatus = contractResult?.status ?? "UNKNOWN";

  try {
    const linkedPRs = await findLinkedPRsForIncident(incident);
    console.log(
      `[sync:remediation] ${incident.contractId}: ${linkedPRs.length} PR(s) found`
    );

    for (const pr of linkedPRs) {
      const remediationPR = await syncRemediationPR(incident, pr, validationStatus);
      allPRs.push(remediationPR);

      console.log(
        `[sync:remediation] PR #${pr.number}: checks=${remediationPR.checksStatus}, review=${remediationPR.reviewState}, recommendation=${remediationPR.mergeRecommendation}`
      );

      if (remediationPR.mergeRecommendation === "ready_for_human_review") {
        readyForHumanReview.push(incident.contractId);
      } else {
        blockedIncidents.push(incident.contractId);
      }
    }

    if (linkedPRs.length === 0) {
      blockedIncidents.push(incident.contractId);
      console.log(`[sync:remediation] ${incident.contractId}: no PRs — blocked`);
    }
  } catch (err) {
    console.warn(`[sync:remediation] Failed to sync ${incident.contractId}:`, err);
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

console.log(`\n[sync:remediation] ═══════════════════════════════════════`);
console.log(`[sync:remediation] Open PRs tracked:     ${allPRs.length}`);
console.log(`[sync:remediation] Blocked incidents:    ${[...new Set(blockedIncidents)].length}`);
console.log(`[sync:remediation] Ready for review:     ${[...new Set(readyForHumanReview)].length}`);
console.log(`[sync:remediation] Snapshot saved.`);
console.log(`[sync:remediation] ═══════════════════════════════════════`);
console.log(`\n[sync:remediation] ENFORCEMENT:`);
console.log(`  - No PRs were merged`);
console.log(`  - No incidents were closed`);
console.log(`  - Incidents close only when deterministic contracts pass`);
console.log(`  - Auto-merge is forbidden`);
