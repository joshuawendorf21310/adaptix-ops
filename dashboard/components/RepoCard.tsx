// ============================================================
// Adaptix Ops Dashboard — Repo Card
// ============================================================

import type { RepoHealth } from "../lib/types";
import { StatusBadge } from "./StatusBadge";
import { shortSha } from "../lib/data";

interface RepoCardProps {
  repo: RepoHealth;
}

export function RepoCard({ repo }: RepoCardProps) {
  const repoName = repo.repo.split("/")[1] ?? repo.repo;

  return (
    <div className={`repo-card repo-card-${repo.ciStatus.toLowerCase()}`}>
      <div className="repo-card-header">
        <span className="repo-card-name">{repoName}</span>
        <StatusBadge status={repo.ciStatus} size="sm" />
      </div>

      <div className="repo-card-meta">
        {repo.latestWorkflowName && (
          <div className="repo-card-row">
            <span className="repo-card-label">Workflow</span>
            <span className="repo-card-value">
              {repo.latestWorkflowUrl ? (
                <a
                  href={repo.latestWorkflowUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="repo-card-link"
                >
                  {repo.latestWorkflowName}
                </a>
              ) : (
                repo.latestWorkflowName
              )}
            </span>
          </div>
        )}

        {repo.latestCommitSha && (
          <div className="repo-card-row">
            <span className="repo-card-label">Commit</span>
            <span className="repo-card-value repo-card-sha">
              {shortSha(repo.latestCommitSha)}
            </span>
          </div>
        )}

        {repo.latestDeploymentEnvironment && (
          <div className="repo-card-row">
            <span className="repo-card-label">Deploy</span>
            <span className="repo-card-value">
              {repo.latestDeploymentEnvironment}
              {repo.latestDeploymentStatus && (
                <span className={`deploy-status deploy-${repo.latestDeploymentStatus}`}>
                  {" "}
                  ({repo.latestDeploymentStatus})
                </span>
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
