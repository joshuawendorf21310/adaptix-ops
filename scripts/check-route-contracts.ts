#!/usr/bin/env tsx
// ============================================================
// Adaptix Ops — Check Route Contracts (standalone)
// ============================================================
// Usage: npm run check:routes
// Evaluates all route contracts and prints structured results.
// Does NOT create GitHub issues. Does NOT write snapshot.
// ============================================================

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { evaluateAllContracts } from "./lib/contracts.js";
import type { RouteContract } from "./lib/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const contractsPath = join(__dirname, "..", "config", "route-contracts.json");
const contracts: RouteContract[] = JSON.parse(
  readFileSync(contractsPath, "utf-8")
);

console.log(`\n[check:routes] Evaluating ${contracts.length} route contract(s)...\n`);

const results = await evaluateAllContracts(contracts);

console.log("\n[check:routes] Results:\n");
console.log(JSON.stringify(results, null, 2));

const failures = results.filter((r) => r.status === "FAIL");
const unknowns = results.filter((r) => r.status === "UNKNOWN");
const passes = results.filter((r) => r.status === "PASS");

console.log(`\n[check:routes] Summary:`);
console.log(`  PASS:    ${passes.length}`);
console.log(`  FAIL:    ${failures.length}`);
console.log(`  UNKNOWN: ${unknowns.length}`);

if (failures.length > 0) {
  console.log(`\n[check:routes] FAIL contracts:`);
  for (const f of failures) {
    console.log(`  - ${f.contractId} (${f.severity})`);
    if (f.missingRequired.length > 0) {
      console.log(`    Missing: ${f.missingRequired.join(", ")}`);
    }
    if (f.forbiddenFound.length > 0) {
      console.log(`    Forbidden found: ${f.forbiddenFound.join(", ")}`);
    }
  }
}

// Exit nonzero if any P0 contract fails
const p0Failures = failures.filter((r) => r.severity === "P0");
if (p0Failures.length > 0) {
  console.error(
    `\n[check:routes] ERROR: ${p0Failures.length} P0 contract(s) FAILED. Exiting with code 1.`
  );
  process.exit(1);
}
