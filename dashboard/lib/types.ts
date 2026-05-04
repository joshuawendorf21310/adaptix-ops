// ============================================================
// Adaptix Ops Dashboard — Types (v2 with Intelligence)
// ============================================================

export type CheckStatus = "PASS" | "WARN" | "FAIL" | "BLOCKED" | "UNKNOWN";
export type Severity = "P0" | "P1" | "P2" | "P3";
export type IncidentStatus = "DETECTED" | "TRIAGED" | "FIXING" | "VALIDATING" | "RESOLVED";
export type ModelStatus = "PASS" | "WARN" | "FAIL" | "UNKNOWN";
export type Confidence = "low" | "medium" | "high";
export type RiskLevel = "low" | "medium" | "high";
export type MergeRecommendation = "do_not_merge" | "ready_for_human_review" | "blocked";

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

export interface DeploymentRecord {
  repo: string;
  environment: string;
  status: string;
  commitSha: string | null;
  deploymentUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

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

export interface IncidentClassification {
  contractId: string;
  modelStatus: ModelStatus;
  severity: Severity;
  failureCategory: string;
  productionImpact: boolean;
  confirmedFacts: string[];
  rootCauseHypotheses: string[];
  confidence: Confidence;
  noDriftWarnings: string[];
  classifiedAt: string;
  reason?: string;
}

export interface RemediationPlan {
  contractId: string;
  modelStatus: ModelStatus;
  fixStrategy: string;
  targetRepo: string;
  likelyFiles: string[];
  codeLevelFix: string[];
  commands: string[];
  validationPlan: string[];
  riskLevel: RiskLevel;
  humanReviewRequired: boolean;
  blockedByMissingInformation: boolean;
  noDriftRules: string[];
  generatedAt: string;
  reason?: string;
}

export interface CodingAgentTask {
  contractId: string;
  modelStatus: ModelStatus;
  repo: string;
  issueTitle: string;
  taskStatement: string;
  fileTargets: string[];
  codeLevelFix: string[];
  validationCommands: string[];
  expectedResults: string[];
  noDriftRules: string[];
  humanReviewRequired: boolean;
  generatedAt: string;
  reason?: string;
}

export interface RemediationPR {
  contractId: string;
  repo: string;
  prNumber: number;
  prUrl: string;
  prTitle: string;
  prState: string;
  checksStatus: string;
  reviewState: string;
  mergeStatus: string;
  changedFiles: string[];
  riskLevel: RiskLevel;
  mergeRecommendation: MergeRecommendation;
  validationStatus: CheckStatus;
  updatedAt: string;
}

export interface IntelligenceSnapshot {
  modelStatus: ModelStatus;
  classifications: IncidentClassification[];
  remediationPlans: RemediationPlan[];
  codingAgentTasks: CodingAgentTask[];
}

export interface RemediationSnapshot {
  openPrs: RemediationPR[];
  blockedIncidents: string[];
  readyForHumanReview: string[];
}

export interface AdaptixOpsSnapshot {
  generatedAt: string;
  sweepVersion: string;
  overallStatus: CheckStatus;
  routeContracts: RouteContractResult[];
  repoHealth: RepoHealth[];
  security: SecuritySummary[];
  deployments: DeploymentRecord[];
  incidents: Incident[];
  intelligence: IntelligenceSnapshot;
  remediation: RemediationSnapshot;
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
