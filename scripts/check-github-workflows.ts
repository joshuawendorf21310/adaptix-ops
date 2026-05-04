#!/usr/bin/env tsx
// ============================================================
// Adaptix Ops — Check GitHub Workflow Status (standalone)
// ============================================================
// Usage: npm run check:workflows
// Fetches latest workflow run for each repo and prints status.
// ============================================================

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { getLatestWorkflowRun } from "./lib/github.js";
import type { RepoHealth, CheckStatus } from "./lib/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const reposPath = join(__dirname, "..", "config", "repos.json");
const repos: string[] = JSON.parse(readFileSync(reposPath, "utf-8"));

console.log(`\n[check:workflows] Checking ${repos.length} repos...\n`);

const results: RepoHealth[] = [];

for (const repo of repos) {
  process.stdout.write(`  ${repo} ... `);
  try {
    const run = await getLatestWorkflowRun(repo);
    let ciStatus: CheckStatus = "UNKNOWN";
    if (run) {
      const conclusion = run.conclusion?.toLowerCase() ?? "";
      if (conclusion === "success") ciStatus = "PASS";
      else if (conclusion === "failure" || conclusion === "timed_out") ciStatus = "FAIL";
      else if (conclusion === "cancelled") ciStatus = "WARN";
      else if (conclusion === "skipped") ciStatus = "WARN";
      else ciStatus = "UNKNOWN";
    }
    results.push({
      repo,
      ciStatus,
      latestWorkflowName: run?.name ?? null,
      latestWorkflowConclusion: run?.conclusion ?? null,
      latestWorkflowUrl: run?.html_url ?? null,
      latestCommitSha: run?.head_sha ?? null,
      latestCommitMessage: run?.head_commit_message ?? null,
      latestDeploymentEnvironment: null,
      latestDeploymentStatus: null,
      latestDeploymentUrl: null,
      updatedAt: new Date().toISOString(),
    });
    console.log(ciStatus);
  } catch (err) {
    console.log("ERROR");
    results.push({
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

const pass = results.filter((r) => r.ciStatus === "PASS").length;
const fail = results.filter((r) => r.ciStatus === "FAIL").length;
const warn = results.filter((r) => r.ciStatus === "WARN").length;
const unknown = results.filter((r) => r.ciStatus === "UNKNOWN").length;

console.log(`\n[check:workflows] Summary:`);
console.log(`  PASS:    ${pass}`);
console.log(`  FAIL:    ${fail}`);
console.log(`  WARN:    ${warn}`);
console.log(`  UNKNOWN: ${unknown}`);

if (fail > 0) {
  console.log(`\n[check:workflows] FAIL repos:`);
  for (const r of results.filter((r) => r.ciStatus === "FAIL")) {
    console.log(`  - ${r.repo} (${r.latestWorkflowConclusion})`);
  }
}
