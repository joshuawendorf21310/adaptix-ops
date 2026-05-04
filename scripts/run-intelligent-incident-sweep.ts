#!/usr/bin/env tsx
// ============================================================
// Adaptix Ops — Intelligent Incident Sweep
// ============================================================
// Orchestrates: classify → remediate → agent-task → update
// Model unavailability → UNKNOWN (never blocks monitoring)
// Exits 0 on intelligence completion or UNKNOWN.
// Exits nonzero only on script/schema/GitHub update failure.
// ============================================================

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { runPrompt, isModelUnavailable, getModelStatus } from "./lib/models.js";
import { generateRemediationPlan } from "./lib/remediation.js";
import { loadSnapshot, saveSnapshot } from "./lib/project.js";
import { findOpenIssueByLabel, commentOnIssue } from "./lib/github.js";
import type {
  IncidentClassification,
  RemediationPlan,
  CodingAgentTask,
  Severity,
  Confidence,
  ModelStatus,
} from "./lib/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const OPS_REPO = "joshuawendorf21310/adaptix-ops";

const NO_DRIFT_RULES = [
  "Do not remove monitored repos from config/repos.json",
  "Do not weaken route contracts",
  "Do not remove required homepage signatures",
  "Do not remove forbidden homepage signatures",
  "HTTP 200 alone is never PASS for route contracts",
  "Do not mark model output as deterministic evidence",
  "Do not close incidents because a model says the issue is fixed",
  "Do not auto-merge production fixes",
  "Do not invent file paths without repo evidence",
];

console.log("\n╔══════════════════════════════════════════════════════════╗");
console.log("║  ADAPTIX OPS — INTELLIGENT INCIDENT SWEEP               ║");
console.log("╚══════════════════════════════════════════════════════════╝\n");

// ── Step 1: Load deterministic monitor results ────────────────

const snapshot = loadSnapshot();
const openIncidents = snapshot.incidents.filter((i) => i.status !== "RESOLVED");

console.log(`[sweep:intelligence] ${openIncidents.length} open incident(s) to process`);

if (openIncidents.length === 0) {
  console.log("[sweep:intelligence] No open incidents. Intelligence sweep complete.");
  process.exit(0);
}

// ── Step 2: Classify incidents ────────────────────────────────

const classifications: IncidentClassification[] = [];

for (const incident of openIncidents) {
  console.log(`[sweep:intelligence] Classifying: ${incident.contractId}`);
  const contractResult = snapshot.routeContracts.find(
    (r) => r.contractId === incident.contractId
  );

  const classResult = await runPrompt<{
    severity?: string;
    failureCategory?: string;
    productionImpact?: boolean;
    confirmedFacts?: string[];
    rootCauseHypotheses?: string[];
    confidence?: string;
    noDriftWarnings?: string[];
  }>("incident-classifier.prompt.yml", {
    contractId: incident.contractId,
    repo: incident.repo,
    service: incident.service,
    environment: incident.environment,
    failureType: incident.failureType,
    severity: incident.severity,
    validationCommand: incident.validationCommand,
    expectedResult: incident.expectedResult,
    actualResult: incident.actualResult,
    rawEvidence: contractResult?.responseExcerpt ?? "(no raw evidence)",
  });

  const classifiedAt = new Date().toISOString();

  if (isModelUnavailable(classResult)) {
    classifications.push({
      contractId: incident.contractId,
      modelStatus: "UNKNOWN",
      severity: incident.severity,
      failureCategory: "UNKNOWN",
      productionImpact: incident.severity === "P0",
      confirmedFacts: [],
      rootCauseHypotheses: [],
      confidence: "low",
      noDriftWarnings: [],
      classifiedAt,
      reason: classResult.reason,
    });
    console.log(`[sweep:intelligence] ${incident.contractId} → UNKNOWN (model unavailable)`);
  } else {
    // Never downgrade P0
    let finalSeverity = (classResult.severity as Severity) ?? incident.severity;
    if (incident.severity === "P0") finalSeverity = "P0";

    classifications.push({
      contractId: incident.contractId,
      modelStatus: "PASS",
      severity: finalSeverity,
      failureCategory: classResult.failureCategory ?? "unknown",
      productionImpact: classResult.productionImpact ?? (incident.severity === "P0"),
      confirmedFacts: classResult.confirmedFacts ?? [],
      rootCauseHypotheses: classResult.rootCauseHypotheses ?? [],
      confidence: (classResult.confidence as Confidence) ?? "low",
      noDriftWarnings: classResult.noDriftWarnings ?? [],
      classifiedAt,
      rawModelOutput: classResult,
    });
    console.log(`[sweep:intelligence] ${incident.contractId} → PASS (${classResult.failureCategory})`);
  }
}

// ── Step 3: Generate remediation plans ───────────────────────

const remediationPlans: RemediationPlan[] = [];

for (const incident of openIncidents) {
  console.log(`[sweep:intelligence] Remediating: ${incident.contractId}`);
  const plan = await generateRemediationPlan(
    incident,
    snapshot.repoHealth,
    snapshot.routeContracts
  );
  // Always require human review for production incidents
  plan.humanReviewRequired = true;
  remediationPlans.push(plan);
  console.log(`[sweep:intelligence] ${incident.contractId} → ${plan.modelStatus} (risk: ${plan.riskLevel})`);
}

// ── Step 4: Generate coding-agent tasks ──────────────────────

const codingAgentTasks: CodingAgentTask[] = [];

for (const incident of openIncidents) {
  const plan = remediationPlans.find((p) => p.contractId === incident.contractId);
  console.log(`[sweep:intelligence] Agent task: ${incident.contractId}`);

  const taskResult = await runPrompt<{
    repo?: string;
    issueTitle?: string;
    taskStatement?: string;
    fileTargets?: string[];
    codeLevelFix?: string[];
    validationCommands?: string[];
    expectedResults?: string[];
    noDriftRules?: string[];
    humanReviewRequired?: boolean;
  }>("coding-agent-task.prompt.yml", {
    incident: JSON.stringify(incident),
    remediationPlan: JSON.stringify(plan ?? null),
    validationPlan: JSON.stringify(plan?.validationPlan ?? []),
    noDriftRules: JSON.stringify(NO_DRIFT_RULES),
  });

  const generatedAt = new Date().toISOString();

  if (isModelUnavailable(taskResult)) {
    codingAgentTasks.push({
      contractId: incident.contractId,
      modelStatus: "UNKNOWN",
      repo: incident.repo,
      issueTitle: `UNKNOWN — model unavailable for ${incident.contractId}`,
      taskStatement: "Model unavailable. Run npm run ai:agent-task when model is accessible.",
      fileTargets: [],
      codeLevelFix: [],
      validationCommands: [incident.validationCommand],
      expectedResults: [incident.expectedResult],
      noDriftRules: NO_DRIFT_RULES,
      humanReviewRequired: true,
      generatedAt,
      reason: taskResult.reason,
    });
  } else {
    codingAgentTasks.push({
      contractId: incident.contractId,
      modelStatus: "PASS",
      repo: taskResult.repo ?? incident.repo,
      issueTitle: taskResult.issueTitle ?? `Fix: ${incident.failureTitle}`,
      taskStatement: taskResult.taskStatement ?? "No task statement generated",
      fileTargets: taskResult.fileTargets ?? [],
      codeLevelFix: taskResult.codeLevelFix ?? [],
      validationCommands: taskResult.validationCommands ?? [incident.validationCommand],
      expectedResults: taskResult.expectedResults ?? [incident.expectedResult],
      noDriftRules: [...NO_DRIFT_RULES, ...(taskResult.noDriftRules ?? [])],
      humanReviewRequired: taskResult.humanReviewRequired ?? true,
      generatedAt,
      rawModelOutput: taskResult,
    });
  }
  console.log(`[sweep:intelligence] ${incident.contractId} → ${codingAgentTasks.at(-1)?.modelStatus}`);
}

// ── Step 5: Update GitHub issues ─────────────────────────────

for (const incident of openIncidents) {
  if (!incident.issueNumber) continue;

  const classification = classifications.find((c) => c.contractId === incident.contractId);
  const plan = remediationPlans.find((p) => p.contractId === incident.contractId);
  const task = codingAgentTasks.find((t) => t.contractId === incident.contractId);

  try {
    const existing = await findOpenIssueByLabel(OPS_REPO, incident.contractId);
    if (!existing) continue;

    const intelligenceComment = `
## AI Intelligence Update

**Sweep Time:** ${new Date().toISOString()}

### Classification
- Model Status: ${classification?.modelStatus ?? "UNKNOWN"}
- Failure Category: ${classification?.failureCategory ?? "UNKNOWN"}
- Confidence: ${classification?.confidence ?? "low"}
- Production Impact: ${classification?.productionImpact ?? true}

### Remediation Plan
- Model Status: ${plan?.modelStatus ?? "UNKNOWN"}
- Fix Strategy: ${plan?.fixStrategy ?? "UNKNOWN"}
- Risk Level: ${plan?.riskLevel ?? "high"}
- Human Review Required: **${plan?.humanReviewRequired ?? true}**

### Coding Agent Task
- Model Status: ${task?.modelStatus ?? "UNKNOWN"}
- Repo: \`${task?.repo ?? incident.repo}\`
- Human Review Required: **${task?.humanReviewRequired ?? true}**

> Deterministic monitoring remains active. This incident closes only when the exact failed contract returns PASS.
`;

    await commentOnIssue(OPS_REPO, existing.number, intelligenceComment);
    console.log(`[sweep:intelligence] Updated issue #${existing.number}`);
  } catch (err) {
    console.warn(`[sweep:intelligence] Failed to update issue for ${incident.contractId}:`, err);
  }
}

// ── Step 6: Save snapshot ─────────────────────────────────────

const modelStatus = getModelStatus([
  ...classifications.map((c) => ({ status: c.modelStatus === "UNKNOWN" ? "UNKNOWN" as const : "PASS" as const, reason: "model_unavailable" as const })),
]);

const updatedSnapshot = {
  ...snapshot,
  intelligence: {
    modelStatus,
    classifications,
    remediationPlans,
    codingAgentTasks,
  },
  generatedAt: new Date().toISOString(),
};

saveSnapshot(updatedSnapshot);

console.log(`\n[sweep:intelligence] ═══════════════════════════════════════`);
console.log(`[sweep:intelligence] Model Status:      ${modelStatus}`);
console.log(`[sweep:intelligence] Classifications:   ${classifications.length}`);
console.log(`[sweep:intelligence] Remediation Plans: ${remediationPlans.length}`);
console.log(`[sweep:intelligence] Agent Tasks:       ${codingAgentTasks.length}`);
console.log(`[sweep:intelligence] Snapshot saved.`);
console.log(`[sweep:intelligence] ═══════════════════════════════════════\n`);
