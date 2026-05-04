#!/usr/bin/env tsx
// ============================================================
// Adaptix Ops — Create or Update Incident (standalone)
// ============================================================
// Usage: tsx scripts/create-or-update-incident.ts <contractId>
// Creates or updates a GitHub issue for a specific contract.
// ============================================================

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { evaluateRouteContract } from "./lib/contracts.js";
import { createOrUpdateIncident, ensureOpsLabels } from "./lib/incidents.js";
import type { RouteContract } from "./lib/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const contractId = process.argv[2];
if (!contractId) {
  console.error("Usage: tsx scripts/create-or-update-incident.ts <contractId>");
  process.exit(1);
}

const contractsPath = join(__dirname, "..", "config", "route-contracts.json");
const contracts: RouteContract[] = JSON.parse(
  readFileSync(contractsPath, "utf-8")
);

const contract = contracts.find((c) => c.id === contractId);
if (!contract) {
  console.error(`Contract not found: ${contractId}`);
  console.error(`Available contracts: ${contracts.map((c) => c.id).join(", ")}`);
  process.exit(1);
}

const foundContract = contract as RouteContract;

console.log(`\n[create-or-update-incident] Evaluating contract: ${contractId}`);

await ensureOpsLabels();
const result = await evaluateRouteContract(foundContract);

console.log(`[create-or-update-incident] Contract status: ${result.status}`);

const incident = await createOrUpdateIncident(result);

console.log(`\n[create-or-update-incident] Incident:`);
console.log(JSON.stringify(incident, null, 2));
