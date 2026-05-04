// ============================================================
// Adaptix Ops — Remediation Plan Generation
// ============================================================

import { runPrompt, isModelUnavailable } from "./models.js";
import type {
  Incident,
  RepoHealth,
  RouteContractResult,
  RemediationPlan,
  ModelStatus,
} from "./types.js";

interface RawRemediationOutput {
  fixStrategy?: string;
  targetRepo?: string;
  likelyFiles?: string[];
  codeLevelFix?: string[];
  commands?: string[];
  validationPlan?: string[];
  riskLevel?: string;
  humanReviewRequired?: boolean;
  blockedByMissingInformation?: boolean;
  noDriftRules?: string[];
}

export async function generateRemediationPlan(
  incident: Incident,
  repoHealth: RepoHealth[],
  routeContracts: RouteContractResult[]
): Promise<RemediationPlan> {
  const repoSignal = repoHealth.find((r) => r.repo === incident.repo);
  const contractSignal = routeContracts.find(
    (r) => r.contractId === incident.contractId
  );

  const result = await runPrompt<RawRemediationOutput>(
    "remediation-planner.prompt.yml",
    {
      incident: JSON.stringify(incident),
      repoSignals: JSON.stringify(repoSignal ?? null),
      workflowSignals: JSON.stringify({
        latestWorkflowName: repoSignal?.latestWorkflowName ?? null,
        latestWorkflowConclusion: repoSignal?.latestWorkflowConclusion ?? null,
        latestWorkflowUrl: repoSignal?.latestWorkflowUrl ?? null,
      }),
      deploymentSignals: JSON.stringify({
        latestDeploymentEnvironment: repoSignal?.latestDeploymentEnvironment ?? null,
        latestDeploymentStatus: repoSignal?.latestDeploymentStatus ?? null,
        latestDeploymentUrl: repoSignal?.latestDeploymentUrl ?? null,
      }),
      routeContractSignals: JSON.stringify(contractSignal ?? null),
    }
  );

  const generatedAt = new Date().toISOString();

  if (isModelUnavailable(result)) {
    return {
      contractId: incident.contractId,
      modelStatus: "UNKNOWN" as ModelStatus,
      fixStrategy: "UNKNOWN — model unavailable",
      targetRepo: incident.repo,
      likelyFiles: [],
      codeLevelFix: [],
      commands: [],
      validationPlan: [],
      riskLevel: "high",
      humanReviewRequired: true,
      blockedByMissingInformation: true,
      noDriftRules: [],
      generatedAt,
      reason: result.reason,
    };
  }

  return {
    contractId: incident.contractId,
    modelStatus: "PASS" as ModelStatus,
    fixStrategy: result.fixStrategy ?? "UNKNOWN",
    targetRepo: result.targetRepo ?? incident.repo,
    likelyFiles: result.likelyFiles ?? [],
    codeLevelFix: result.codeLevelFix ?? [],
    commands: result.commands ?? [],
    validationPlan: result.validationPlan ?? [],
    riskLevel: (result.riskLevel as "low" | "medium" | "high") ?? "high",
    humanReviewRequired: result.humanReviewRequired ?? true,
    blockedByMissingInformation: result.blockedByMissingInformation ?? false,
    noDriftRules: result.noDriftRules ?? [],
    generatedAt,
    rawModelOutput: result,
  };
}
