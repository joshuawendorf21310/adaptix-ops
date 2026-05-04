#!/usr/bin/env tsx
// ============================================================
// Adaptix Ops — Verify Production Readiness
// ============================================================
// Runs all production route contracts deterministically.
// Returns PASS only when all production contracts pass.
// AI explanation is supplementary — never the evidence.
// ============================================================

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { verifyProductionReadiness } from "./lib/validation.js";
import { loadSnapshot } from "./lib/project.js";
import type { RouteContract } from "./lib/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const contractsPath = join(__dirname, "..", "config", "route-contracts.json");
const contracts: RouteContract[] = JSON.parse(
  readFileSync(contractsPath, "utf-8")
);

console.log("\n╔══════════════════════════════════════════════════════════╗");
console.log("║  ADAPTIX OPS — PRODUCTION READINESS VERIFICATION        ║");
console.log("╚══════════════════════════════════════════════════════════╝\n");

const snapshot = loadSnapshot();

const result = await verifyProductionReadiness(
  contracts,
  snapshot.repoHealth,
  snapshot.incidents
);

console.log(`\n[verify:production] ═══════════════════════════════════════`);
console.log(`[verify:production] Overall Status:    ${result.overallStatus}`);
console.log(`[verify:production] Production Ready:  ${result.productionReady}`);
console.log(`[verify:production] Checked At:        ${result.checkedAt}`);

if (result.confirmedPassingChecks.length > 0) {
  console.log(`\n[verify:production] ✅ Passing Checks:`);
  for (const check of result.confirmedPassingChecks) {
    console.log(`  ${check}`);
  }
}

if (result.blockingFailures.length > 0) {
  console.log(`\n[verify:production] ❌ Blocking Failures:`);
  for (const failure of result.blockingFailures) {
    console.log(`  ${failure}`);
  }
}

if (result.missingChecks.length > 0) {
  console.log(`\n[verify:production] ⚠️  Missing Checks (UNKNOWN):`);
  for (const missing of result.missingChecks) {
    console.log(`  ${missing}`);
  }
}

console.log(`\n[verify:production] AI Explanation:`);
console.log(`  ${result.aiExplanation}`);
console.log(`\n[verify:production] ═══════════════════════════════════════`);

if (!result.productionReady) {
  console.error(
    `\n[verify:production] NOT PRODUCTION READY — ${result.blockingFailures.length} blocking failure(s)`
  );
  process.exit(1);
}

console.log(`\n[verify:production] PRODUCTION READY — all contracts passing`);
