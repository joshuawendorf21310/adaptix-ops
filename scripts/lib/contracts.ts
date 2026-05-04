// ============================================================
// Adaptix Ops — Route Contract Evaluation
// ============================================================

import { fetchWithTimeout, excerptBody } from "./http.js";
import type { RouteContract, RouteContractResult, CheckStatus } from "./types.js";

export async function evaluateRouteContract(
  contract: RouteContract
): Promise<RouteContractResult> {
  const checkedAt = new Date().toISOString();

  const result = await fetchWithTimeout(contract.url);

  // Network/DNS/TLS/timeout failure → UNKNOWN
  if (result.networkError || result.status === null) {
    return {
      contractId: contract.id,
      severity: contract.severity,
      repo: contract.repo,
      service: contract.service,
      environment: contract.environment,
      url: contract.url,
      status: "UNKNOWN" as CheckStatus,
      actualStatus: null,
      missingRequired: [],
      forbiddenFound: [],
      failureType: contract.failureType,
      failureTitle: contract.failureTitle,
      impact: contract.impact,
      validationCommand: contract.validationCommand,
      expectedResult: contract.expectedResult,
      checkedAt,
      responseExcerpt: "",
      error: result.error ?? "Network error or timeout",
    };
  }

  const body = result.body;
  const excerpt = excerptBody(body, 2000);

  // HTTP status check
  if (result.status !== contract.expectedStatus) {
    return {
      contractId: contract.id,
      severity: contract.severity,
      repo: contract.repo,
      service: contract.service,
      environment: contract.environment,
      url: contract.url,
      status: "FAIL" as CheckStatus,
      actualStatus: result.status,
      missingRequired: contract.requiredContent,
      forbiddenFound: [],
      failureType: contract.failureType,
      failureTitle: contract.failureTitle,
      impact: contract.impact,
      validationCommand: contract.validationCommand,
      expectedResult: contract.expectedResult,
      checkedAt,
      responseExcerpt: excerpt,
      error: `Expected HTTP ${contract.expectedStatus}, got ${result.status}`,
    };
  }

  // Required content check — ALL must be present
  const missingRequired = contract.requiredContent.filter(
    (sig) => !body.includes(sig)
  );

  // Forbidden content check — NONE must be present
  const forbiddenFound = contract.forbiddenContent.filter(
    (sig) => body.includes(sig)
  );

  const hasFailed = missingRequired.length > 0 || forbiddenFound.length > 0;

  return {
    contractId: contract.id,
    severity: contract.severity,
    repo: contract.repo,
    service: contract.service,
    environment: contract.environment,
    url: contract.url,
    status: hasFailed ? ("FAIL" as CheckStatus) : ("PASS" as CheckStatus),
    actualStatus: result.status,
    missingRequired,
    forbiddenFound,
    failureType: contract.failureType,
    failureTitle: contract.failureTitle,
    impact: contract.impact,
    validationCommand: contract.validationCommand,
    expectedResult: contract.expectedResult,
    checkedAt,
    responseExcerpt: excerpt,
  };
}

export async function evaluateAllContracts(
  contracts: RouteContract[]
): Promise<RouteContractResult[]> {
  const results: RouteContractResult[] = [];
  for (const contract of contracts) {
    console.log(`[contracts] Evaluating: ${contract.id} → ${contract.url}`);
    const result = await evaluateRouteContract(contract);
    console.log(`[contracts] ${contract.id} → ${result.status}`);
    if (result.status === "FAIL") {
      if (result.missingRequired.length > 0) {
        console.log(`  Missing required: ${result.missingRequired.join(", ")}`);
      }
      if (result.forbiddenFound.length > 0) {
        console.log(`  Forbidden found: ${result.forbiddenFound.join(", ")}`);
      }
    }
    results.push(result);
  }
  return results;
}
