#!/usr/bin/env tsx
// ============================================================
// Adaptix Ops — Classify Incidents
// ============================================================
// Loads failing incidents, calls incident classifier prompt,
// attaches classification to incidents, updates GitHub issues.
// Model unavailability → UNKNOWN. Never downgrades P0.
// ============================================================

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { runPrompt, isModelUnavailable } from "./lib/models.js";
import { updateIssueBody, findOpenIssueByLabel } from "./lib/github.js";
import { loadSnapshot, saveSnapshot } from "./lib/project.js";
import type {
  Incident,
  IncidentClassification,
  Severity,
  Confidence,
  ModelStatus,
} from "./lib/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const OPS_REPO = "joshuawendorf21310/adaptix-ops";

interface RawClassificationOutput {
  severity?: string;
  failureCategory?: string;
  productionImpact?: boolean;
  confirmedFacts?: string[];
  rootCauseHypotheses?: string[];
  confidence?: string;
  noDriftWarnings?: string[];
}

async function classifyIncident(incident: Incident): Promise<IncidentClassification> {
  const contractResult = loadSnapshot().routeContracts.find(
    (r) => r.contractId === incident.contractId
  );

  const result = await runPrompt<RawClassificationOutput>(
    "incident-classifier.prompt.yml",
    {
      contractId: incident.contractId,
      repo: incident.repo,
      service: incident.service,
      environment: incident.environment,
      failureType: incident.failureType,
      severity: incident.severity,
      validationCommand: incident.validationCommand,
      expectedResult: incident.expectedResult,
      actualResult: incident.actualResult,
      rawEvidence: contractResult?.responseExcerpt ?? "(no raw evidence available)",
    }
  );

  const classifiedAt = new Date().toISOString();

  if (isModelUnavailable(result)) {
    return {
      contractId: incident.contractId,
      modelStatus: "UNKNOWN" as ModelStatus,
      severity: incident.severity, // never downgrade
      failureCategory: "UNKNOWN",
      productionImpact: incident.severity === "P0",
      confirmedFacts: [],
      rootCauseHypotheses: [],
      confidence: "low" as Confidence,
      noDriftWarnings: [],
      classifiedAt,
      reason: result.reason,
    };
  }

  // Never downgrade P0 severity based on model output
  let finalSeverity = (result.severity as Severity) ?? incident.severity;
  if (incident.severity === "P0") {
    finalSeverity = "P0";
  }

  return {
    contractId: incident.contractId,
    modelStatus: "PASS" as ModelStatus,
    severity: finalSeverity,
    failureCategory: result.failureCategory ?? "unknown",
    productionImpact: result.productionImpact ?? (incident.severity === "P0"),
    confirmedFacts: result.confirmedFacts ?? [],
    rootCauseHypotheses: result.rootCauseHypotheses ?? [],
    confidence: (result.confidence as Confidence) ?? "low",
    noDriftWarnings: result.noDriftWarnings ?? [],
    classifiedAt,
    rawModelOutput: result,
  };
}

function buildClassificationSection(classification: IncidentClassification): string {
  const status = classification.modelStatus === "UNKNOWN"
    ? `**AI Classification: UNKNOWN** — ${classification.reason ?? "model unavailable"}`
    : `**AI Classification: COMPLETE**`;

  return `
## AI Classification

${status}

| Field | Value |
|-------|-------|
| **Model Status** | ${classification.modelStatus} |
| **Failure Category** | ${classification.failureCategory} |
| **Production Impact** | ${classification.productionImpact} |
| **Confidence** | ${classification.confidence} |
| **Classified At** | ${classification.classifiedAt} |

### Confirmed Facts
${classification.confirmedFacts.length > 0
  ? classification.confirmedFacts.map((f) => `- ${f}`).join("\n")
  : "_None confirmed — model unavailable or no facts extracted_"}

### Root Cause Hypotheses
${classification.rootCauseHypotheses.length > 0
  ? classification.rootCauseHypotheses.map((h) => `- ${h}`).join("\n")
  : "_None generated_"}

### No-Drift Warnings
${classification.noDriftWarnings.length > 0
  ? classification.noDriftWarnings.map((w) => `- ⚠️ ${w}`).join("\n")
  : "_None_"}

> AI classification is interpretive only. Deterministic severity and incident closure are not affected by model output.
`;
}

// ── Main ──────────────────────────────────────────────────────

console.log("\n[classify-incident] Loading snapshot...");
const snapshot = loadSnapshot();

const failingIncidents = snapshot.incidents.filter(
  (i) => i.status !== "RESOLVED"
);

console.log(`[classify-incident] ${failingIncidents.length} open incident(s) to classify`);

const classifications: IncidentClassification[] = [];

for (const incident of failingIncidents) {
  console.log(`[classify-incident] Classifying: ${incident.contractId}`);
  const classification = await classifyIncident(incident);
  classifications.push(classification);
  console.log(
    `[classify-incident] ${incident.contractId} → ${classification.modelStatus} (${classification.failureCategory})`
  );

  // Update GitHub issue with classification section
  if (incident.issueNumber) {
    try {
      const section = buildClassificationSection(classification);
      // Append classification to issue body
      const existing = await findOpenIssueByLabel(OPS_REPO, incident.contractId);
      if (existing) {
        // We append the classification as a comment rather than rewriting the full body
        const { commentOnIssue } = await import("./lib/github.js");
        await commentOnIssue(OPS_REPO, existing.number, section);
        console.log(`[classify-incident] Updated issue #${existing.number} with classification`);
      }
    } catch (err) {
      console.warn(`[classify-incident] Failed to update issue for ${incident.contractId}:`, err);
    }
  }
}

// Update snapshot with classifications
const updatedSnapshot = {
  ...snapshot,
  intelligence: {
    ...snapshot.intelligence,
    modelStatus: classifications.every((c) => c.modelStatus === "UNKNOWN")
      ? ("UNKNOWN" as ModelStatus)
      : classifications.some((c) => c.modelStatus === "UNKNOWN")
      ? ("WARN" as ModelStatus)
      : ("PASS" as ModelStatus),
    classifications,
  },
  generatedAt: new Date().toISOString(),
};

saveSnapshot(updatedSnapshot);

console.log(`\n[classify-incident] Done. ${classifications.length} classification(s) saved.`);
