// ============================================================
// Adaptix Ops Dashboard — Remediation Panel
// ============================================================
// Shows PR tracking, check status, review state.
// Never shows merge as automatic. Never closes incidents.
// ============================================================

import type { RemediationPR, RemediationSnapshot } from "../lib/types";
import { StatusBadge } from "./StatusBadge";
import { formatTimestamp } from "../lib/data";

interface RemediationPanelProps {
  remediation: RemediationSnapshot;
}

const MERGE_RECOMMENDATION_CLASSES: Record<string, string> = {
  do_not_merge: "status-fail",
  ready_for_human_review: "status-warn",
  blocked: "status-blocked",
};

const CHECKS_STATUS_CLASSES: Record<string, string> = {
  passing: "status-pass",
  failing: "status-fail",
  pending: "status-warn",
  no_checks: "status-unknown",
  unknown: "status-unknown",
};

export function RemediationPanel({ remediation }: RemediationPanelProps) {
  const { openPrs, blockedIncidents, readyForHumanReview } = remediation;

  return (
    <div className="remediation-panel">
      {/* Summary */}
      <div className="remediation-summary">
        <div className="summary-tile tile-unknown">
          <span className="summary-tile-value">{openPrs.length}</span>
          <span className="summary-tile-label">Open PRs</span>
        </div>
        <div className="summary-tile tile-fail">
          <span className="summary-tile-value">{blockedIncidents.length}</span>
          <span className="summary-tile-label">Blocked</span>
        </div>
        <div className="summary-tile tile-warn">
          <span className="summary-tile-value">{readyForHumanReview.length}</span>
          <span className="summary-tile-label">Ready for Review</span>
        </div>
      </div>

      {/* Enforcement notice */}
      <div className="remediation-enforcement">
        <span className="status-warn">
          ⚠️ Auto-merge is forbidden. Incidents close only when deterministic contracts pass.
        </span>
      </div>

      {/* PR List */}
      {openPrs.length === 0 ? (
        <div className="text-muted">No remediation PRs tracked. Run sync:remediation to populate.</div>
      ) : (
        <div className="pr-list">
          {openPrs.map((pr) => (
            <div key={`${pr.contractId}-${pr.prNumber}`} className="pr-card">
              <div className="pr-header">
                <a
                  href={pr.prUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pr-link"
                >
                  PR #{pr.prNumber}
                </a>
                <span className="pr-title">{pr.prTitle}</span>
                <span className={`pr-state ${pr.prState === "open" ? "status-pass" : "status-unknown"}`}>
                  {pr.prState}
                </span>
              </div>

              <div className="pr-meta">
                <div className="pr-row">
                  <span className="pr-label">Contract</span>
                  <span className="pr-value mono">{pr.contractId}</span>
                </div>
                <div className="pr-row">
                  <span className="pr-label">Checks</span>
                  <span className={`pr-value ${CHECKS_STATUS_CLASSES[pr.checksStatus] ?? "status-unknown"}`}>
                    {pr.checksStatus}
                  </span>
                </div>
                <div className="pr-row">
                  <span className="pr-label">Review</span>
                  <span className="pr-value">{pr.reviewState}</span>
                </div>
                <div className="pr-row">
                  <span className="pr-label">Validation</span>
                  <StatusBadge status={pr.validationStatus} size="sm" />
                </div>
                <div className="pr-row">
                  <span className="pr-label">Risk</span>
                  <span className={`pr-value risk-${pr.riskLevel}`}>{pr.riskLevel.toUpperCase()}</span>
                </div>
                <div className="pr-row">
                  <span className="pr-label">Merge</span>
                  <span className={`pr-value ${MERGE_RECOMMENDATION_CLASSES[pr.mergeRecommendation] ?? "status-unknown"}`}>
                    {pr.mergeRecommendation.replace(/_/g, " ")}
                  </span>
                </div>
              </div>

              {pr.changedFiles.length > 0 && (
                <div className="pr-files">
                  <span className="pr-label">Changed Files ({pr.changedFiles.length})</span>
                  <ul>
                    {pr.changedFiles.slice(0, 5).map((f, i) => (
                      <li key={i} className="mono text-muted">{f}</li>
                    ))}
                    {pr.changedFiles.length > 5 && (
                      <li className="text-muted">+{pr.changedFiles.length - 5} more</li>
                    )}
                  </ul>
                </div>
              )}

              <div className="pr-footer text-muted">
                Updated: {formatTimestamp(pr.updatedAt)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Blocked incidents */}
      {blockedIncidents.length > 0 && (
        <div className="blocked-incidents">
          <div className="section-title">Blocked Incidents (no PR found)</div>
          {blockedIncidents.map((id) => (
            <div key={id} className="blocked-incident-row">
              <span className="status-fail">❌</span>
              <span className="mono text-secondary">{id}</span>
              <span className="text-muted">— awaiting fix PR</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
