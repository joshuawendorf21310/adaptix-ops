// ============================================================
// Adaptix Ops Dashboard — Deployment Timeline
// ============================================================

import type { DeploymentRecord } from "../lib/types";
import { formatTimestamp, shortSha } from "../lib/data";

interface DeploymentTimelineProps {
  deployments: DeploymentRecord[];
}

export function DeploymentTimeline({ deployments }: DeploymentTimelineProps) {
  if (deployments.length === 0) {
    return (
      <div className="timeline-empty">
        <span className="status-unknown">No deployment data available. Run sweep:repos to populate.</span>
      </div>
    );
  }

  return (
    <div className="timeline">
      <table className="timeline-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Repo</th>
            <th>Environment</th>
            <th>Status</th>
            <th>Commit</th>
            <th>URL</th>
          </tr>
        </thead>
        <tbody>
          {deployments.map((dep, i) => {
            const repoName = dep.repo.split("/")[1] ?? dep.repo;
            const statusClass = dep.status === "success"
              ? "status-pass"
              : dep.status === "failure" || dep.status === "error"
              ? "status-fail"
              : dep.status === "in_progress" || dep.status === "pending"
              ? "status-warn"
              : "status-unknown";

            return (
              <tr key={i} className="timeline-row">
                <td className="timeline-time">{formatTimestamp(dep.createdAt)}</td>
                <td className="timeline-repo">{repoName}</td>
                <td className="timeline-env">{dep.environment}</td>
                <td className={`timeline-status ${statusClass}`}>{dep.status ?? "unknown"}</td>
                <td className="timeline-sha">{shortSha(dep.commitSha)}</td>
                <td className="timeline-url">
                  {dep.deploymentUrl ? (
                    <a
                      href={dep.deploymentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="timeline-link"
                    >
                      open
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
