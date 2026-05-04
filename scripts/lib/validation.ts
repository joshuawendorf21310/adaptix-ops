// ============================================================
// Adaptix Ops — Production Readiness Validation
// ============================================================
// Runs deterministic production contracts and returns
// structured validation results. Never uses model output
// as evidence of production readiness.
// ============================================================

import { evaluateAllContracts } from "./contracts.js";
import { runPrompt, isModelUnavailable } from "./models.js";
import type {
  RouteContract,
  RouteContractResult,
  RepoHealth,
  Incident,
  CheckStatus,
} from "./types.js";

export interface ProductionReadinessResult {
  overallStatus: CheckStatus;
  productionReady: boolean;
  confirmedPassingChecks: string[];
  missingChecks: string[];
  blockingFailures: string[];
  contractResults: RouteContractResult[];
  aiExplanation: string;
  checkedAt: string;
}

interface RawReadinessOutput {
  productionReady?: boolean;
  confirmedPassingChecks?: string[];
  missingChecks?: string[];
  blockingFailures?: string[];
  explanation?: string;
}

export async function verifyProductionReadiness(
  contracts: RouteContract[],
  repoHealth: RepoHealth[],
  incidents: Incident[]
): Promise<ProductionReadinessResult> {
  const checkedAt = new Date().toISOString();

  // Step 1: Run all deterministic contracts
  const contractResults = await evaluateAllContracts(contracts);

  // Step 2: Determine deterministic status
  const failingContracts = contractResults.filter((r) => r.status === "FAIL");
  const unknownContracts = contractResults.filter((r) => r.status === "UNKNOWN");
  const passingContracts = contractResults.filter((r) => r.status === "PASS");

  const openP0Incidents = incidents.filter(
    (i) => i.severity === "P0" && i.status !== "RESOLVED"
  );

  let overallStatus: CheckStatus = "PASS";
  if (failingContracts.length > 0 || openP0Incidents.length > 0) {
    overallStatus = "FAIL";
  } else if (unknownContracts.length > 0) {
    overallStatus = "UNKNOWN";
  }

  const productionReady = overallStatus === "PASS";

  const confirmedPassingChecks = passingContracts.map(
    (r) => `${r.contractId} (${r.url}) — PASS`
  );

  const blockingFailures = [
    ...failingContracts.map(
      (r) => `${r.contractId}: ${r.failureType} — ${r.error ?? "FAIL"}`
    ),
    ...openP0Incidents.map(
      (i) => `P0 incident open: ${i.contractId} — ${i.failureType}`
    ),
  ];

  const missingChecks = unknownContracts.map(
    (r) => `${r.contractId}: UNKNOWN — ${r.error ?? "signal unavailable"}`
  );

  // Step 3: Get AI explanation (non-blocking)
  let aiExplanation = "AI explanation unavailable — model not called";
  try {
    const aiResult = await runPrompt<RawReadinessOutput>(
      "production-readiness-verifier.prompt.yml",
      {
        incident: JSON.stringify(openP0Incidents[0] ?? null),
        validationResults: JSON.stringify(contractResults),
        routeContracts: JSON.stringify(contractResults),
        workflowResults: JSON.stringify(
          repoHealth.map((r) => ({
            repo: r.repo,
            ciStatus: r.ciStatus,
            latestWorkflowConclusion: r.latestWorkflowConclusion,
          }))
        ),
      }
    );

    if (!isModelUnavailable(aiResult)) {
      aiExplanation = aiResult.explanation ?? "No explanation provided";
    } else {
      aiExplanation = `AI explanation UNKNOWN: ${aiResult.reason}`;
    }
  } catch {
    aiExplanation = "AI explanation unavailable — model call failed";
  }

  return {
    overallStatus,
    productionReady,
    confirmedPassingChecks,
    missingChecks,
    blockingFailures,
    contractResults,
    aiExplanation,
    checkedAt,
  };
}
