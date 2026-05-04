#!/usr/bin/env tsx
// ============================================================
// Adaptix Ops — Security Sweep
// ============================================================
// Usage: npm run sweep:security
// 1. Fetches Dependabot, code scanning, secret scanning alerts
// 2. Normalizes counts per repo
// 3. Writes results to dashboard/public/adaptix-ops.json
// ============================================================

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  getDependabotAlerts,
  getCodeScanningAlerts,
  getSecretScanningAlerts,
} from "./lib/github.js";
import {
  loadSnapshot,
  saveSnapshot,
  mergeSecurity,
  computeSummary,
} from "./lib/project.js";
import type { SecuritySummary, CheckStatus } from "./lib/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log("\n╔══════════════════════════════════════════════════════════╗");
console.log("║  ADAPTIX OPS — SECURITY SWEEP                           ║");
console.log("╚══════════════════════════════════════════════════════════╝\n");

const reposPath = join(__dirname, "..", "config", "repos.json");
const repos: string[] = JSON.parse(readFileSync(reposPath, "utf-8"));

console.log(`[sweep:security] Checking ${repos.length} repos...\n`);

const results: SecuritySummary[] = [];

for (const repo of repos) {
  process.stdout.write(`  ${repo} ... `);
  try {
    const [dependabot, codeScanning, secretScanning] = await Promise.all([
      getDependabotAlerts(repo),
      getCodeScanningAlerts(repo),
      getSecretScanningAlerts(repo),
    ]);

    let status: CheckStatus = "PASS";

    if (
      dependabot.critical > 0 ||
      dependabot.high > 0 ||
      codeScanning.critical > 0 ||
      codeScanning.high > 0 ||
      secretScanning.total > 0
    ) {
      status = "FAIL";
    } else if (
      dependabot.medium > 0 ||
      dependabot.low > 0 ||
      codeScanning.medium > 0 ||
      codeScanning.low > 0
    ) {
      status = "WARN";
    }

    if (
      !dependabot.accessible &&
      !codeScanning.accessible &&
      !secretScanning.accessible
    ) {
      status = "UNKNOWN";
    }

    results.push({
      repo,
      status,
      dependabotCritical: dependabot.critical,
      dependabotHigh: dependabot.high,
      dependabotMedium: dependabot.medium,
      dependabotLow: dependabot.low,
      dependabotTotal: dependabot.total,
      codeScanningCritical: codeScanning.critical,
      codeScanningHigh: codeScanning.high,
      codeScanningMedium: codeScanning.medium,
      codeScanningLow: codeScanning.low,
      codeScanningTotal: codeScanning.total,
      secretScanningTotal: secretScanning.total,
      dependabotAccessible: dependabot.accessible,
      codeScanningAccessible: codeScanning.accessible,
      secretScanningAccessible: secretScanning.accessible,
      checkedAt: new Date().toISOString(),
    });

    console.log(status);
  } catch (err) {
    console.log("ERROR");
    results.push({
      repo,
      status: "UNKNOWN",
      dependabotCritical: 0,
      dependabotHigh: 0,
      dependabotMedium: 0,
      dependabotLow: 0,
      dependabotTotal: 0,
      codeScanningCritical: 0,
      codeScanningHigh: 0,
      codeScanningMedium: 0,
      codeScanningLow: 0,
      codeScanningTotal: 0,
      secretScanningTotal: 0,
      dependabotAccessible: false,
      codeScanningAccessible: false,
      secretScanningAccessible: false,
      checkedAt: new Date().toISOString(),
    });
  }
}

// Load existing snapshot and merge
let snapshot = loadSnapshot();
snapshot = mergeSecurity(snapshot, results);
snapshot = computeSummary(snapshot);
saveSnapshot(snapshot);

const pass = results.filter((r) => r.status === "PASS").length;
const fail = results.filter((r) => r.status === "FAIL").length;
const warn = results.filter((r) => r.status === "WARN").length;
const unknown = results.filter((r) => r.status === "UNKNOWN").length;

console.log(`\n[sweep:security] ═══════════════════════════════════════`);
console.log(`[sweep:security] PASS:    ${pass}`);
console.log(`[sweep:security] FAIL:    ${fail}`);
console.log(`[sweep:security] WARN:    ${warn}`);
console.log(`[sweep:security] UNKNOWN: ${unknown}`);
console.log(`[sweep:security] Snapshot saved.`);
console.log(`[sweep:security] ═══════════════════════════════════════\n`);

if (fail > 0) {
  console.log(`[sweep:security] FAIL repos:`);
  for (const r of results.filter((r) => r.status === "FAIL")) {
    console.log(
      `  ❌ ${r.repo} (dependabot: ${r.dependabotTotal}, codeScanning: ${r.codeScanningTotal}, secrets: ${r.secretScanningTotal})`
    );
  }
}
