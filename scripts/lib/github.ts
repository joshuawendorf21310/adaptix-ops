// ============================================================
// Adaptix Ops — GitHub REST API Client
// ============================================================

import { Octokit } from "@octokit/rest";

let _octokit: Octokit | null = null;

export function getOctokit(): Octokit {
  if (_octokit) return _octokit;
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error(
      "GITHUB_TOKEN environment variable is not set. " +
        "In GitHub Actions it is provided automatically. " +
        "For local use, set it in your environment."
    );
  }
  _octokit = new Octokit({ auth: token });
  return _octokit;
}

export function parseRepo(fullName: string): { owner: string; repo: string } {
  const parts = fullName.split("/");
  if (parts.length !== 2) {
    throw new Error(`Invalid repo format: ${fullName}. Expected owner/repo`);
  }
  return { owner: parts[0]!, repo: parts[1]! };
}

// ── Workflow Runs ─────────────────────────────────────────────

export async function getLatestWorkflowRun(
  fullRepo: string
): Promise<{
  name: string | null;
  conclusion: string | null;
  html_url: string | null;
  head_sha: string | null;
  head_commit_message: string | null;
} | null> {
  const octokit = getOctokit();
  const { owner, repo } = parseRepo(fullRepo);
  try {
    const response = await octokit.actions.listWorkflowRunsForRepo({
      owner,
      repo,
      per_page: 1,
    });
    const run = response.data.workflow_runs[0];
    if (!run) return null;
    return {
      name: run.name ?? null,
      conclusion: run.conclusion ?? null,
      html_url: run.html_url ?? null,
      head_sha: run.head_sha ?? null,
      head_commit_message: run.head_commit?.message ?? null,
    };
  } catch (err: unknown) {
    const e = err as { status?: number };
    if (e.status === 404 || e.status === 403) return null;
    throw err;
  }
}

// ── Deployments ───────────────────────────────────────────────

export async function getLatestDeployment(fullRepo: string): Promise<{
  environment: string | null;
  status: string | null;
  url: string | null;
  created_at: string | null;
  updated_at: string | null;
} | null> {
  const octokit = getOctokit();
  const { owner, repo } = parseRepo(fullRepo);
  try {
    const deploymentsResp = await octokit.repos.listDeployments({
      owner,
      repo,
      per_page: 1,
    });
    const deployment = deploymentsResp.data[0];
    if (!deployment) return null;

    const statusResp = await octokit.repos.listDeploymentStatuses({
      owner,
      repo,
      deployment_id: deployment.id,
      per_page: 1,
    });
    const latestStatus = statusResp.data[0];

    return {
      environment: deployment.environment ?? null,
      status: latestStatus?.state ?? null,
      url: latestStatus?.environment_url ?? deployment.url ?? null,
      created_at: deployment.created_at ?? null,
      updated_at: deployment.updated_at ?? null,
    };
  } catch (err: unknown) {
    const e = err as { status?: number };
    if (e.status === 404 || e.status === 403) return null;
    throw err;
  }
}

export async function listRecentDeployments(
  fullRepo: string,
  perPage = 5
): Promise<
  Array<{
    environment: string;
    status: string | null;
    commitSha: string | null;
    deploymentUrl: string | null;
    createdAt: string;
    updatedAt: string;
  }>
> {
  const octokit = getOctokit();
  const { owner, repo } = parseRepo(fullRepo);
  try {
    const deploymentsResp = await octokit.repos.listDeployments({
      owner,
      repo,
      per_page: perPage,
    });
    const results = [];
    for (const dep of deploymentsResp.data) {
      let status: string | null = null;
      let deploymentUrl: string | null = null;
      try {
        const statusResp = await octokit.repos.listDeploymentStatuses({
          owner,
          repo,
          deployment_id: dep.id,
          per_page: 1,
        });
        const s = statusResp.data[0];
        if (s) {
          status = s.state;
          deploymentUrl = s.environment_url ?? null;
        }
      } catch {
        // ignore per-deployment status errors
      }
      results.push({
        environment: dep.environment,
        status,
        commitSha: dep.sha ?? null,
        deploymentUrl,
        createdAt: dep.created_at,
        updatedAt: dep.updated_at,
      });
    }
    return results;
  } catch (err: unknown) {
    const e = err as { status?: number };
    if (e.status === 404 || e.status === 403) return [];
    throw err;
  }
}

// ── Security Alerts ───────────────────────────────────────────

export async function getDependabotAlerts(fullRepo: string): Promise<{
  accessible: boolean;
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}> {
  const octokit = getOctokit();
  const { owner, repo } = parseRepo(fullRepo);
  try {
    const resp = await octokit.dependabot.listAlertsForRepo({
      owner,
      repo,
      state: "open",
      per_page: 100,
    });
    const alerts = resp.data;
    const counts = { critical: 0, high: 0, medium: 0, low: 0, total: 0 };
    for (const alert of alerts) {
      const sev = alert.security_advisory?.severity?.toLowerCase() ?? "";
      counts.total++;
      if (sev === "critical") counts.critical++;
      else if (sev === "high") counts.high++;
      else if (sev === "medium") counts.medium++;
      else if (sev === "low") counts.low++;
    }
    return { accessible: true, ...counts };
  } catch (err: unknown) {
    const e = err as { status?: number };
    if (e.status === 404 || e.status === 403 || e.status === 422) {
      return { accessible: false, critical: 0, high: 0, medium: 0, low: 0, total: 0 };
    }
    throw err;
  }
}

export async function getCodeScanningAlerts(fullRepo: string): Promise<{
  accessible: boolean;
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}> {
  const octokit = getOctokit();
  const { owner, repo } = parseRepo(fullRepo);
  try {
    const resp = await octokit.codeScanning.listAlertsForRepo({
      owner,
      repo,
      state: "open",
      per_page: 100,
    });
    const alerts = resp.data;
    const counts = { critical: 0, high: 0, medium: 0, low: 0, total: 0 };
    for (const alert of alerts) {
      const sev = alert.rule?.severity?.toLowerCase() ?? "";
      counts.total++;
      if (sev === "critical") counts.critical++;
      else if (sev === "high" || sev === "error") counts.high++;
      else if (sev === "medium" || sev === "warning") counts.medium++;
      else if (sev === "low" || sev === "note") counts.low++;
    }
    return { accessible: true, ...counts };
  } catch (err: unknown) {
    const e = err as { status?: number };
    if (e.status === 404 || e.status === 403 || e.status === 422) {
      return { accessible: false, critical: 0, high: 0, medium: 0, low: 0, total: 0 };
    }
    throw err;
  }
}

export async function getSecretScanningAlerts(fullRepo: string): Promise<{
  accessible: boolean;
  total: number;
}> {
  const octokit = getOctokit();
  const { owner, repo } = parseRepo(fullRepo);
  try {
    const resp = await octokit.secretScanning.listAlertsForRepo({
      owner,
      repo,
      state: "open",
      per_page: 100,
    });
    return { accessible: true, total: resp.data.length };
  } catch (err: unknown) {
    const e = err as { status?: number };
    if (e.status === 404 || e.status === 403 || e.status === 422) {
      return { accessible: false, total: 0 };
    }
    throw err;
  }
}

// ── Issues ────────────────────────────────────────────────────

export async function findOpenIssueByLabel(
  opsRepo: string,
  contractId: string
): Promise<{ number: number; html_url: string } | null> {
  const octokit = getOctokit();
  const { owner, repo } = parseRepo(opsRepo);
  try {
    const resp = await octokit.issues.listForRepo({
      owner,
      repo,
      state: "open",
      labels: `adaptix-ops,${contractId}`,
      per_page: 10,
    });
    const issue = resp.data[0];
    if (!issue) return null;
    return { number: issue.number, html_url: issue.html_url };
  } catch {
    return null;
  }
}

export async function createIssue(
  opsRepo: string,
  title: string,
  body: string,
  labels: string[]
): Promise<{ number: number; html_url: string }> {
  const octokit = getOctokit();
  const { owner, repo } = parseRepo(opsRepo);
  const resp = await octokit.issues.create({
    owner,
    repo,
    title,
    body,
    labels,
  });
  return { number: resp.data.number, html_url: resp.data.html_url };
}

export async function updateIssueBody(
  opsRepo: string,
  issueNumber: number,
  body: string
): Promise<void> {
  const octokit = getOctokit();
  const { owner, repo } = parseRepo(opsRepo);
  await octokit.issues.update({
    owner,
    repo,
    issue_number: issueNumber,
    body,
  });
}

export async function commentOnIssue(
  opsRepo: string,
  issueNumber: number,
  body: string
): Promise<void> {
  const octokit = getOctokit();
  const { owner, repo } = parseRepo(opsRepo);
  await octokit.issues.createComment({
    owner,
    repo,
    issue_number: issueNumber,
    body,
  });
}

export async function closeIssue(
  opsRepo: string,
  issueNumber: number
): Promise<void> {
  const octokit = getOctokit();
  const { owner, repo } = parseRepo(opsRepo);
  await octokit.issues.update({
    owner,
    repo,
    issue_number: issueNumber,
    state: "closed",
  });
}

export async function ensureLabelsExist(
  opsRepo: string,
  labels: Array<{ name: string; color: string; description: string }>
): Promise<void> {
  const octokit = getOctokit();
  const { owner, repo } = parseRepo(opsRepo);
  for (const label of labels) {
    try {
      await octokit.issues.getLabel({ owner, repo, name: label.name });
    } catch {
      try {
        await octokit.issues.createLabel({
          owner,
          repo,
          name: label.name,
          color: label.color,
          description: label.description,
        });
      } catch {
        // label may already exist from a race condition — ignore
      }
    }
  }
}
