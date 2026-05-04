// ============================================================
// Adaptix Ops — Shared TypeScript Types
// ============================================================

export type CheckStatus = "PASS" | "WARN" | "FAIL" | "BLOCKED" | "UNKNOWN";
export type Severity = "P0" | "P1" | "P2" | "P3";
export type IncidentStatus = "DETECTED" | "TRIAGED" | "FIXING" | "VALIDATING" | "RESOLVED";

// ── Route Contract ────────────────────────────────────────────

export interface RouteContract {
  id: string;
  severity: Severity;
  repo: string;
  service: string;
  environment: string;
  url: string;
  method: string;
  expectedStatus: number;
  requiredContent: string[];
  forbiddenContent: string[];
  failureTitle: string;
  failureType: string;
  impact: string;
  validationCommand: string;
  expectedResult: string;
}

export interface RouteContractResult {
  contractId: string;
  severity: Severity;
  repo: string;
  service: string;
  environment: string;
  url: string;
  status: CheckStatus;
  actualStatus: number | null;
  missingRequired: string[];
  forbiddenFound: string[];
  failureType: string;
  failureTitle: string;
  impact: string;
  validationCommand: string;
  expectedResult: string;
  checkedAt: string;
  responseExcerpt: string;
  error?: string;
}

// ── Repo Health ───────────────────────────────────────────────

export interface RepoHealth {
  repo: string;
  ciStatus: CheckStatus;
  latestWorkflowName: string | null;
  latestWorkflowConclusion: string | null;
  latestWorkflowUrl: string | null;
  latestCommitSha: string | null;
  latestCommitMessage: string | null;
  latestDeploymentEnvironment: string | null;
  latestDeploymentStatus: string | null;
  latestDeploymentUrl: string | null;
  updatedAt: string;
}

// ── Security ──────────────────────────────────────────────────

export interface SecuritySummary {
  repo: string;
  status: CheckStatus;
  dependabotCritical: number;
  dependabotHigh: number;
  dependabotMedium: number;
  dependabotLow: number;
  dependabotTotal: number;
  codeScanningCritical: number;
  codeScanningHigh: number;
  codeScanningMedium: number;
  codeScanningLow: number;
  codeScanningTotal: number;
  secretScanningTotal: number;
  dependabotAccessible: boolean;
  codeScanningAccessible: boolean;
  secretScanningAccessible: boolean;
  checkedAt: string;
}

// ── Deployment ────────────────────────────────────────────────

export interface DeploymentRecord {
  repo: string;
  environment: string;
  status: string;
  commitSha: string | null;
  deploymentUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Incident ──────────────────────────────────────────────────

export interface Incident {
  contractId: string;
  issueNumber: number | null;
  issueUrl: string | null;
  severity: Severity;
  repo: string;
  service: string;
  environment: string;
  failureType: string;
  failureTitle: string;
  status: IncidentStatus;
  firstDetected: string;
  lastDetected: string;
  validationCommand: string;
  expectedResult: string;
  actualResult: string;
}

// ── Dashboard JSON ────────────────────────────────────────────

export interface AdaptixOpsSnapshot {
  generatedAt: string;
  sweepVersion: string;
  overallStatus: CheckStatus;
  routeContracts: RouteContractResult[];
  repoHealth: RepoHealth[];
  security: SecuritySummary[];
  deployments: DeploymentRecord[];
  incidents: Incident[];
  summary: {
    totalRepos: number;
    pass: number;
    warn: number;
    fail: number;
    blocked: number;
    unknown: number;
    openIncidents: number;
    p0Incidents: number;
  };
}
