// ============================================================
// Adaptix Ops Dashboard — Agent Task Panel
// ============================================================

import type { CodingAgentTask } from "../lib/types";
import { SeverityBadge } from "./SeverityBadge";
import { formatTimestamp } from "../lib/data";

interface AgentTaskPanelProps {
  tasks: CodingAgentTask[];
}

export function AgentTaskPanel({ tasks }: AgentTaskPanelProps) {
  if (tasks.length === 0) {
    return (
      <div className="text-muted">
        No coding agent tasks. Run sweep:intelligence to generate tasks.
      </div>
    );
  }

  return (
    <div className="agent-task-panel">
      {tasks.map((task) => (
        <div
          key={task.contractId}
          className={`agent-task-card agent-task-${task.modelStatus.toLowerCase()}`}
        >
          <div className="agent-task-header">
            <span className={`agent-task-model-status model-status-${task.modelStatus.toLowerCase()}`}>
              AI: {task.modelStatus}
            </span>
            <span className="agent-task-title">{task.issueTitle}</span>
            {task.humanReviewRequired && (
              <span className="human-review-required">HUMAN REVIEW REQUIRED</span>
            )}
          </div>

          <div className="agent-task-meta">
            <div className="agent-task-row">
              <span className="agent-task-label">Repo</span>
              <span className="agent-task-value mono">{task.repo}</span>
            </div>
            <div className="agent-task-row">
              <span className="agent-task-label">Contract</span>
              <span className="agent-task-value mono">{task.contractId}</span>
            </div>
          </div>

          {task.modelStatus === "UNKNOWN" ? (
            <div className="status-unknown">
              Task UNKNOWN — {task.reason ?? "model unavailable"}
            </div>
          ) : (
            <>
              <div className="agent-task-statement">
                <span className="agent-task-label">Task Statement</span>
                <p className="text-secondary">{task.taskStatement}</p>
              </div>

              {task.fileTargets.length > 0 ? (
                <div className="agent-task-files">
                  <span className="agent-task-label">File Targets</span>
                  <ul>
                    {task.fileTargets.map((f, i) => (
                      <li key={i} className="mono text-secondary">{f}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="agent-task-files">
                  <span className="agent-task-label">File Targets</span>
                  <p className="status-warn">
                    No specific files identified. Search target repo for route/component/deploy config.
                  </p>
                </div>
              )}

              {task.validationCommands.length > 0 && (
                <div className="agent-task-validation">
                  <span className="agent-task-label">Validation Commands</span>
                  {task.validationCommands.map((cmd, i) => (
                    <pre key={i} className="agent-task-code">{cmd}</pre>
                  ))}
                </div>
              )}

              <div className="agent-task-nodrift">
                <span className="agent-task-label">No-Drift Rules</span>
                <ul>
                  {task.noDriftRules.slice(0, 5).map((r, i) => (
                    <li key={i} className="status-warn text-secondary">⚠️ {r}</li>
                  ))}
                </ul>
              </div>
            </>
          )}

          <div className="agent-task-footer text-muted">
            Generated: {formatTimestamp(task.generatedAt)}
          </div>
        </div>
      ))}
    </div>
  );
}
