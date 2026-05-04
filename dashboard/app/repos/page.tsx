"use client";

// ============================================================
// Adaptix Ops Dashboard — Repos Page (/repos)
// ============================================================

import { useEffect, useState } from "react";
import { DashboardShell } from "../../components/DashboardShell";
import { StatusBadge } from "../../components/StatusBadge";
import { loadOpsSnapshot, timeSince, shortSha } from "../../lib/data";
import type { AdaptixOpsSnapshot } from "../../lib/types";

export default function ReposPage() {
  const [snapshot, setSnapshot] = useState<AdaptixOpsSnapshot | null>(null);

  useEffect(() => {
    loadOpsSnapshot().then(setSnapshot);
  }, []);

  if (!snapshot) {
    return <div className="loading">Loading repo health data...</div>;
  }

  const { repoHealth, security, overallStatus, generatedAt, summary } = snapshot;

  const secMap = new Map(security.map((s) => [s.repo, s]));

  return (
    <DashboardShell
      overallStatus={overallStatus}
      lastSweep={timeSince(generatedAt)}
      openIncidents={summary.openIncidents}
    >
      <div className="page-title">Repo Health</div>
      <div className="page-subtitle">
        {repoHealth.length} monitored repos · Last sweep: {timeSince(generatedAt)}
      </div>

      <div className="section">
        <div className="section-title">All Monitored Repos</div>
        {repoHealth.length === 0 ? (
          <div className="text-muted">
            No repo health data. Run <code>npm run sweep:repos</code> to populate.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="repos-table">
              <thead>
                <tr>
                  <th>Repo</th>
                  <th>CI Status</th>
                  <th>Workflow</th>
                  <th>Commit</th>
                  <th>Deploy Env</th>
                  <th>Deploy Status</th>
                  <th>Security</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {repoHealth.map((repo) => {
                  const sec = secMap.get(repo.repo);
                  return (
                    <tr key={repo.repo}>
                      <td className="repos-table-repo">
                        <a
                          href={`https://github.com/${repo.repo}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {repo.repo.split("/")[1] ?? repo.repo}
                        </a>
                      </td>
                      <td>
                        <StatusBadge status={repo.ciStatus} size="sm" />
                      </td>
                      <td>
                        {repo.latestWorkflowUrl ? (
                          <a
                            href={repo.latestWorkflowUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-secondary"
                          >
                            {repo.latestWorkflowName ?? "view"}
                          </a>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="font-mono text-muted">
                        {shortSha(repo.latestCommitSha)}
                      </td>
                      <td className="text-secondary">
                        {repo.latestDeploymentEnvironment ?? "—"}
                      </td>
                      <td>
                        {repo.latestDeploymentStatus ? (
                          <span
                            className={
                              repo.latestDeploymentStatus === "success"
                                ? "status-pass"
                                : repo.latestDeploymentStatus === "failure"
                                ? "status-fail"
                                : "status-unknown"
                            }
                          >
                            {repo.latestDeploymentStatus}
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td>
                        {sec ? (
                          <StatusBadge status={sec.status} size="sm" />
                        ) : (
                          <StatusBadge status="UNKNOWN" size="sm" />
                        )}
                      </td>
                      <td className="text-muted">{timeSince(repo.updatedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
