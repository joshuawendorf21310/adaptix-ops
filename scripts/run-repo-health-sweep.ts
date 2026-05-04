#!/usr/bin/env tsx
// ============================================================
// Adaptix Ops — Repo Health Sweep
// ============================================================
// Usage: npm run sweep:repos
// 1. Fetches latest workflow run for each repo
// 2. Fetches latest deployment for each repo
// 3. Writes results to dashboard/public/adaptix-ops.json
// ============================================================

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { getLatestWorkflowRun, getLatestDeployment, listRecentDeployments } from "./lib/github.js";
import {
  loadSnapshot,
  saveSnapshot,
  mergeRepoHealth,
  mergeDeployments,
  computeSummary,
} from "./lib/project.js";
import type { RepoHealth, DeploymentRecord, CheckStatus } from "./lib/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log("\n╔══════════════════════════════════════════════════════════╗");
console.log("║  ADAPTIX OPS — REPO HEALTH SWEEP                        ║");
console.log("╚══════════════════════════════════════════════════════════╝\n");

const reposPath = join(__dirname, "..", "config", "repos.json");
const repos: string[] = JSON.parse(readFileSync(reposPath, "utf-8"));

console.log(`[sweep:repos] Checking ${repos.length} repos...\n`);

const repoHealth: RepoHealth[] = [];
const allDeployments: DeploymentRecord[] = [];

for (const repo of repos) {
  process.stdout.write(`  ${repo} ... `);
  try {
    const [run, deployment] = await Promise.all([
      getLatestWorkflowRun(repo),
      getLatestDeployment(repo),
    ]);

    let ciStatus: CheckStatus = "UNKNOWN";
    if (run) {
      const conclusion = run.conclusion?.toLowerCase() ?? "";
      if (conclusion === "success") ciStatus = "PASS";
      else if (conclusion === "failure" || conclusion === "timed_out") ciStatus = "FAIL";
      else if (conclusion === "cancelled" || conclusion === "skipped") ciStatus = "WARN";
      else ciStatus = "UNKNOWN";
    }
    // No workflow data → UNKNOWN (never PASS)

    repoHealth.push({
      repo,
      ciStatus,
      latestWorkflowName: run?.name ?? null,
      latestWorkflowConclusion: run?.conclusion ?? null,
      latestWorkflowUrl: run?.html_url ?? null,
      latestCommitSha: run?.head_sha ?? null,
      latestCommitMessage: run?.head_commit_message ?? null,
      latestDeploymentEnvironment: deployment?.environment ?? null,
      latestDeploymentStatus: deployment?.status ?? null,
      latestDeploymentUrl: deployment?.url ?? null,
      updatedAt: new Date().toISOString(),
    });

    // Collect recent deployments for timeline
    try {
      const recentDeps = await listRecentDeployments(repo, 3);
      for (const dep of recentDeps) {
        allDeployments.push({
          repo,
          environment: dep.environment,
          status: dep.status ?? "unknown",
          commitSha: dep.commitSha,
          deploymentUrl: dep.deploymentUrl,
          createdAt: dep.createdAt,
          updatedAt: dep.updatedAt,
        });
      }
    } catch {
      // deployment collection is best-effort
    }

    console.log(`${ciStatus} (deploy: ${deployment?.status ?? "none"})`);
  } catch (err) {
    console.log("ERROR");
    repoHealth.push({
      repo,
      ciStatus: "UNKNOWN",
      latestWorkflowName: null,
      latestWorkflowConclusion: null,
      latestWorkflowUrl: null,
      latestCommitSha: null,
      latestCommitMessage: null,
      latestDeploymentEnvironment: null,
      latestDeploymentStatus: null,
      latestDeploymentUrl: null,
      updatedAt: new Date().toISOString(),
    });
  }
}

// Sort deployments by createdAt descending
allDeployments.sort(
  (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
);

// Load existing snapshot and merge
let snapshot = loadSnapshot();
snapshot = mergeRepoHealth(snapshot, repoHealth);
snapshot = mergeDeployments(snapshot, allDeployments.slice(0, 50));
snapshot = computeSummary(snapshot);

saveSnapshot(snapshot);

// Print summary
const pass = repoHealth.filter((r) => r.ciStatus === "PASS").length;
const fail = repoHealth.filter((r) => r.ciStatus === "FAIL").length;
const warn = repoHealth.filter((r) => r.ciStatus === "WARN").length;
const unknown = repoHealth.filter((r) => r.ciStatus === "UNKNOWN").length;

console.log(`\n[sweep:repos] ═══════════════════════════════════════`);
console.log(`[sweep:repos] PASS:    ${pass}`);
console.log(`[sweep:repos] FAIL:    ${fail}`);
console.log(`[sweep:repos] WARN:    ${warn}`);
console.log(`[sweep:repos] UNKNOWN: ${unknown}`);
console.log(`[sweep:repos] Deployments collected: ${allDeployments.length}`);
console.log(`[sweep:repos] Snapshot saved.`);
console.log(`[sweep:repos] ═══════════════════════════════════════\n`);

if (fail > 0) {
  console.log(`[sweep:repos] FAIL repos:`);
  for (const r of repoHealth.filter((r) => r.ciStatus === "FAIL")) {
    console.log(`  ❌ ${r.repo} (${r.latestWorkflowConclusion})`);
  }
}
