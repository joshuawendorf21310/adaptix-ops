// ============================================================
// Adaptix Ops — Pull Request Tracking
// ============================================================
// Finds PRs linked to incident issues, fetches check status,
// review state, and changed files. Never merges PRs.
// ============================================================

import { getOctokit, parseRepo, commentOnIssue } from "./github.js";
import { runPrompt, isModelUnavailable } from "./models.js";
import type {
  RemediationPR,
  Incident,
  RiskLevel,
  MergeRecommendation,
  CheckStatus,
} from "./types.js";

const OPS_REPO = "joshuawendorf21310/adaptix-ops";

interface RawPRRiskOutput {
  riskLevel?: string;
  reviewRequired?: boolean;
  riskReasons?: string[];
  validationGaps?: string[];
  mergeRecommendation?: string;
}

export async function findLinkedPRsForIncident(
  incident: Incident
): Promise<Array<{ number: number; html_url: string; title: string; state: string }>> {
  const octokit = getOctokit();
  const { owner, repo } = parseRepo(OPS_REPO);

  if (!incident.issueNumber) return [];

  try {
    // Search for PRs that mention the issue number in the body or title
    const searchResp = await octokit.search.issuesAndPullRequests({
      q: `repo:${OPS_REPO} is:pr ${incident.contractId} in:body,title`,
      per_page: 10,
    });

    return searchResp.data.items.map((item) => ({
      number: item.number,
      html_url: item.html_url,
      title: item.title,
      state: item.state,
    }));
  } catch (err: unknown) {
    const e = err as { status?: number };
    if (e.status === 404 || e.status === 403) return [];
    console.warn(`[pullRequests] Failed to search PRs for ${incident.contractId}:`, err);
    return [];
  }
}

export async function getPRDetails(
  prRepo: string,
  prNumber: number
): Promise<{
  checksStatus: string;
  reviewState: string;
  mergeStatus: string;
  changedFiles: string[];
} | null> {
  const octokit = getOctokit();
  const { owner, repo } = parseRepo(prRepo);

  try {
    const [prResp, filesResp, reviewsResp] = await Promise.all([
      octokit.pulls.get({ owner, repo, pull_number: prNumber }),
      octokit.pulls.listFiles({ owner, repo, pull_number: prNumber, per_page: 50 }),
      octokit.pulls.listReviews({ owner, repo, pull_number: prNumber, per_page: 20 }),
    ]);

    const pr = prResp.data;
    const changedFiles = filesResp.data.map((f) => f.filename);

    // Determine review state
    const reviews = reviewsResp.data;
    let reviewState = "pending";
    if (reviews.some((r) => r.state === "APPROVED")) reviewState = "approved";
    else if (reviews.some((r) => r.state === "CHANGES_REQUESTED")) reviewState = "changes_requested";
    else if (reviews.length > 0) reviewState = "reviewed";

    // Determine checks status
    let checksStatus = "unknown";
    try {
      const checksResp = await octokit.checks.listForRef({
        owner,
        repo,
        ref: pr.head.sha,
        per_page: 50,
      });
      const runs = checksResp.data.check_runs;
      if (runs.length === 0) {
        checksStatus = "no_checks";
      } else if (runs.every((r) => r.conclusion === "success")) {
        checksStatus = "passing";
      } else if (runs.some((r) => r.conclusion === "failure")) {
        checksStatus = "failing";
      } else if (runs.some((r) => r.status === "in_progress" || r.status === "queued")) {
        checksStatus = "pending";
      } else {
        checksStatus = "unknown";
      }
    } catch {
      checksStatus = "unknown";
    }

    return {
      checksStatus,
      reviewState,
      mergeStatus: pr.mergeable_state ?? "unknown",
      changedFiles,
    };
  } catch (err: unknown) {
    const e = err as { status?: number };
    if (e.status === 404 || e.status === 403) return null;
    console.warn(`[pullRequests] Failed to get PR details for ${prRepo}#${prNumber}:`, err);
    return null;
  }
}

export async function classifyPRRisk(
  pr: { number: number; html_url: string; title: string; state: string },
  details: { checksStatus: string; reviewState: string; mergeStatus: string; changedFiles: string[] },
  incident: Incident,
  validationStatus: CheckStatus
): Promise<{ riskLevel: RiskLevel; mergeRecommendation: MergeRecommendation; riskReasons: string[] }> {
  const result = await runPrompt<RawPRRiskOutput>("pr-review-risk.prompt.yml", {
    prMetadata: JSON.stringify({ number: pr.number, title: pr.title, state: pr.state }),
    changedFiles: JSON.stringify(details.changedFiles),
    validationOutput: JSON.stringify({ checksStatus: details.checksStatus, validationStatus }),
    incident: JSON.stringify(incident),
  });

  if (isModelUnavailable(result)) {
    return {
      riskLevel: "high",
      mergeRecommendation: "do_not_merge",
      riskReasons: ["Model unavailable — defaulting to high risk"],
    };
  }

  return {
    riskLevel: (result.riskLevel as RiskLevel) ?? "high",
    mergeRecommendation: (result.mergeRecommendation as MergeRecommendation) ?? "do_not_merge",
    riskReasons: result.riskReasons ?? [],
  };
}

export async function syncRemediationPR(
  incident: Incident,
  pr: { number: number; html_url: string; title: string; state: string },
  validationStatus: CheckStatus
): Promise<RemediationPR> {
  const details = await getPRDetails(OPS_REPO, pr.number);

  if (!details) {
    return {
      contractId: incident.contractId,
      repo: OPS_REPO,
      prNumber: pr.number,
      prUrl: pr.html_url,
      prTitle: pr.title,
      prState: pr.state,
      checksStatus: "unknown",
      reviewState: "unknown",
      mergeStatus: "unknown",
      changedFiles: [],
      riskLevel: "high",
      mergeRecommendation: "do_not_merge",
      validationStatus,
      updatedAt: new Date().toISOString(),
    };
  }

  const risk = await classifyPRRisk(pr, details, incident, validationStatus);

  // Comment on the incident issue with PR status
  if (incident.issueNumber) {
    const statusMsg =
      details.checksStatus === "passing" && details.reviewState === "approved"
        ? `✅ PR #${pr.number} checks are passing and has been approved. Ready for human review and merge decision.`
        : details.checksStatus === "failing"
        ? `❌ PR #${pr.number} has failing checks. Do not merge until checks pass.`
        : `⏳ PR #${pr.number} status: checks=${details.checksStatus}, review=${details.reviewState}. Awaiting completion.`;

    try {
      await commentOnIssue(OPS_REPO, incident.issueNumber, statusMsg);
    } catch {
      // best-effort comment
    }
  }

  return {
    contractId: incident.contractId,
    repo: OPS_REPO,
    prNumber: pr.number,
    prUrl: pr.html_url,
    prTitle: pr.title,
    prState: pr.state,
    checksStatus: details.checksStatus,
    reviewState: details.reviewState,
    mergeStatus: details.mergeStatus,
    changedFiles: details.changedFiles,
    riskLevel: risk.riskLevel,
    mergeRecommendation: risk.mergeRecommendation,
    validationStatus,
    updatedAt: new Date().toISOString(),
  };
}
