#!/usr/bin/env tsx
// ============================================================
// Adaptix Ops — Check Deployments (standalone)
// ============================================================
// Usage: npm run check:deployments
// Fetches latest deployment for each repo and prints status.
// ============================================================

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { getLatestDeployment } from "./lib/github.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const reposPath = join(__dirname, "..", "config", "repos.json");
const repos: string[] = JSON.parse(readFileSync(reposPath, "utf-8"));

console.log(`\n[check:deployments] Checking ${repos.length} repos...\n`);

let withDeployments = 0;
let withoutDeployments = 0;

for (const repo of repos) {
  process.stdout.write(`  ${repo} ... `);
  try {
    const dep = await getLatestDeployment(repo);
    if (dep) {
      withDeployments++;
      console.log(
        `${dep.status ?? "unknown"} (env: ${dep.environment ?? "unknown"})`
      );
    } else {
      withoutDeployments++;
      console.log("no deployments");
    }
  } catch (err) {
    withoutDeployments++;
    console.log("ERROR");
  }
}

console.log(`\n[check:deployments] Summary:`);
console.log(`  With deployments:    ${withDeployments}`);
console.log(`  Without deployments: ${withoutDeployments}`);
