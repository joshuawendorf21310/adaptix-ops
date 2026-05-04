// ============================================================
// Adaptix Ops — GitHub Issue Incident Management
// ============================================================

import {
  findOpenIssueByLabel,
  createIssue,
  updateIssueBody,
  commentOnIssue,
  closeIssue,
  ensureLabelsExist,
} from "./github.js";
import type { RouteContractResult, Incident } from "./types.js";

const OPS_REPO = "joshuawendorf21310/adaptix-ops";

const REQUIRED_LABELS = [
  { name: "adaptix-ops", color: "0075ca", description: "Adaptix Ops automation" },
  { name: "production", color: "d93f0b", description: "Production environment" },
  { name: "P0", color: "e11d48", description: "P0 severity — production critical" },
  { name: "P1", color: "f97316", description: "P1 severity — production degraded" },
  { name: "P2", color: "eab308", description: "P2 severity — non-production failure" },
  { name: "P3", color: "6b7280", description: "P3 severity — housekeeping" },
  { name: "route-contract", color: "7c3aed", description: "Route contract smoke test" },
  { name: "detected", color: "dc2626", description: "Failure detected by sweep" },
];

export async function ensureOpsLabels(): Promise<void> {
  await ensureLabelsExist(OPS_REPO, REQUIRED_LABELS);
}

function buildIssueBody(result: RouteContractResult): string {
  const missingList =
    result.missingRequired.length > 0
      ? result.missingRequired.map((s) => `- \`${s}\``).join("\n")
      : "_none_";

  const forbiddenList =
    result.forbiddenFound.length > 0
      ? result.forbiddenFound.map((s) => `- \`${s}\``).join("\n")
      : "_none_";

  return `## ${result.failureTitle}

| Field | Value |
|-------|-------|
| **Contract ID** | \`${result.contractId}\` |
| **Repo** | \`${result.repo}\` |
| **Service** | \`${result.service}\` |
| **Environment** | \`${result.environment}\` |
| **URL** | ${result.url} |
| **Failure Type** | \`${result.failureType}\` |
| **Severity** | **${result.severity}** |
| **Expected HTTP Status** | ${result.actualStatus !== null ? result.actualStatus : "N/A"} (expected ${200}) |
| **Actual HTTP Status** | ${result.actualStatus ?? "null"} |
| **Last Checked** | ${result.checkedAt} |

---

### Missing Required Signatures

${missingList}

### Forbidden Signatures Found

${forbiddenList}

---

### Validation Command

\`\`\`bash
${result.validationCommand}
\`\`\`

### Expected Result

${result.expectedResult}

### Impact

${result.impact}

---

### Response Excerpt (first 2,000 chars)

\`\`\`
${result.responseExcerpt || "(empty response)"}
\`\`\`

---

> This issue was automatically created by the Adaptix Ops production sweep.
> It will be automatically closed when the contract passes.
`;
}

function buildPassComment(result: RouteContractResult): string {
  return `## ✅ Contract Passing — Closing Incident

| Field | Value |
|-------|-------|
| **Contract ID** | \`${result.contractId}\` |
| **Status** | **PASS** |
| **URL** | ${result.url} |
| **HTTP Status** | ${result.actualStatus} |
| **Checked At** | ${result.checkedAt} |

All required signatures are present and no forbidden signatures were found.

This incident is now resolved and the issue is being closed automatically.
`;
}

export async function createOrUpdateIncident(
  result: RouteContractResult
): Promise<Incident> {
  const existing = await findOpenIssueByLabel(OPS_REPO, result.contractId);
  const body = buildIssueBody(result);

  let issueNumber: number | null = null;
  let issueUrl: string | null = null;

  if (result.status === "FAIL") {
    if (existing) {
      // Update existing open issue body with latest data
      await updateIssueBody(OPS_REPO, existing.number, body);
      issueNumber = existing.number;
      issueUrl = existing.html_url;
      console.log(
        `[incidents] Updated existing issue #${existing.number} for ${result.contractId}`
      );
    } else {
      // Create new issue
      const labels = [
        "adaptix-ops",
        "production",
        result.severity,
        "route-contract",
        "detected",
        result.contractId,
      ];
      const created = await createIssue(
        OPS_REPO,
        result.failureTitle,
        body,
        labels
      );
      issueNumber = created.number;
      issueUrl = created.html_url;
      console.log(
        `[incidents] Created issue #${created.number} for ${result.contractId}`
      );
    }

    return {
      contractId: result.contractId,
      issueNumber,
      issueUrl,
      severity: result.severity,
      repo: result.repo,
      service: result.service,
      environment: result.environment,
      failureType: result.failureType,
      failureTitle: result.failureTitle,
      status: "DETECTED",
      firstDetected: result.checkedAt,
      lastDetected: result.checkedAt,
      validationCommand: result.validationCommand,
      expectedResult: result.expectedResult,
      actualResult: buildActualResult(result),
    };
  }

  if (result.status === "PASS" && existing) {
    // Contract is now passing — comment and close
    const passComment = buildPassComment(result);
    await commentOnIssue(OPS_REPO, existing.number, passComment);
    await closeIssue(OPS_REPO, existing.number);
    console.log(
      `[incidents] Closed issue #${existing.number} — contract ${result.contractId} is now PASS`
    );
  }

  return {
    contractId: result.contractId,
    issueNumber: existing?.number ?? null,
    issueUrl: existing?.html_url ?? null,
    severity: result.severity,
    repo: result.repo,
    service: result.service,
    environment: result.environment,
    failureType: result.failureType,
    failureTitle: result.failureTitle,
    status: "RESOLVED",
    firstDetected: result.checkedAt,
    lastDetected: result.checkedAt,
    validationCommand: result.validationCommand,
    expectedResult: result.expectedResult,
    actualResult: "PASS — all required signatures present, no forbidden signatures found",
  };
}

function buildActualResult(result: RouteContractResult): string {
  const parts: string[] = [];
  if (result.actualStatus !== null && result.actualStatus !== 200) {
    parts.push(`HTTP ${result.actualStatus} (expected 200)`);
  }
  if (result.missingRequired.length > 0) {
    parts.push(`Missing required: ${result.missingRequired.join(", ")}`);
  }
  if (result.forbiddenFound.length > 0) {
    parts.push(`Forbidden found: ${result.forbiddenFound.join(", ")}`);
  }
  if (result.error) {
    parts.push(`Error: ${result.error}`);
  }
  return parts.length > 0 ? parts.join(" | ") : "FAIL (unknown reason)";
}
