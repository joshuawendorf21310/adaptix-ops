#!/usr/bin/env tsx
// ============================================================
// Adaptix Ops — Production Sweep
// ============================================================
// Usage: npm run sweep:production
// 1. Evaluates all route contracts
// 2. Creates/updates GitHub issues for failures
// 3. Closes issues for passing contracts
// 4. Writes dashboard/public/adaptix-ops.json
// 5. Exits nonzero if any P0 contract fails
// ============================================================

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { evaluateAllContracts } from "./lib/contracts.js";
import { createOrUpdateIncident, ensureOpsLabels } from "./lib/incidents.js";
import {
  loadSnapshot,
  saveSnapshot,
  mergeRouteContracts,
  mergeIncidents,
  computeSummary,
} from "./lib/project.js";
import type { RouteContract } from "./lib/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log("\n╔══════════════════════════════════════════════════════════╗");
console.log("║  ADAPTIX OPS — PRODUCTION SWEEP                         ║");
console.log("╚══════════════════════════════════════════════════════════╝\n");

// Load contracts
const contractsPath = join(__dirname, "..", "config", "route-contracts.json");
const contracts: RouteContract[] = JSON.parse(
  readFileSync(contractsPath, "utf-8")
);

console.log(`[sweep:production] ${contracts.length} route contract(s) to evaluate`);
console.log(`[sweep:production] Ensuring GitHub labels exist...`);

await ensureOpsLabels();

// Evaluate all contracts
console.log(`\n[sweep:production] Evaluating route contracts...\n`);
const contractResults = await evaluateAllContracts(contracts);

// Process incidents for each contract result
console.log(`\n[sweep:production] Processing incidents...\n`);
const incidents = [];
for (const result of contractResults) {
  if (result.status === "FAIL" || result.status === "PASS") {
    const incident = await createOrUpdateIncident(result);
    incidents.push(incident);
  }
}

// Load existing snapshot and merge
let snapshot = loadSnapshot();
snapshot = mergeRouteContracts(snapshot, contractResults);
snapshot = mergeIncidents(snapshot, incidents);
snapshot = computeSummary(snapshot);

// Save snapshot
saveSnapshot(snapshot);

// Print summary
console.log("\n[sweep:production] ═══════════════════════════════════════");
console.log(`[sweep:production] Overall Status: ${snapshot.overallStatus}`);
console.log(`[sweep:production] Route Contracts:`);
for (const r of contractResults) {
  const icon = r.status === "PASS" ? "✅" : r.status === "FAIL" ? "❌" : "⚠️";
  console.log(`  ${icon} ${r.contractId} → ${r.status} (${r.severity})`);
  if (r.status === "FAIL") {
    if (r.missingRequired.length > 0) {
      console.log(`     Missing: ${r.missingRequired.join(", ")}`);
    }
    if (r.forbiddenFound.length > 0) {
      console.log(`     Forbidden found: ${r.forbiddenFound.join(", ")}`);
    }
  }
}
console.log("[sweep:production] ═══════════════════════════════════════\n");

// Exit nonzero if any P0 contract fails
const p0Failures = contractResults.filter(
  (r) => r.status === "FAIL" && r.severity === "P0"
);

if (p0Failures.length > 0) {
  console.error(
    `[sweep:production] CRITICAL: ${p0Failures.length} P0 production contract(s) FAILED:`
  );
  for (const f of p0Failures) {
    console.error(`  ❌ ${f.contractId} — ${f.failureTitle}`);
  }
  console.error(
    `[sweep:production] Exiting with code 1 — P0 production failure detected.`
  );
  process.exit(1);
}

console.log("[sweep:production] All production contracts evaluated. No P0 failures.");
