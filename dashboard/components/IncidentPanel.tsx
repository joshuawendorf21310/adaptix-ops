// ============================================================
// Adaptix Ops Dashboard — Incident Panel
// ============================================================

import type { Incident } from "../lib/types";
import { SeverityBadge } from "./SeverityBadge";
import { formatTimestamp } from "../lib/data";

interface IncidentPanelProps {
  incidents: Incident[];
  showResolved?: boolean;
}

export function IncidentPanel({ incidents, showResolved = false }: IncidentPanelProps) {
  const filtered = showResolved
    ? incidents
    : incidents.filter((i) => i.status !== "RESOLVED");

  if (filtered.length === 0) {
    return (
      <div className="incident-panel-empty">
        <span className="status-pass">No open incidents detected.</span>
      </div>
    );
  }

  return (
    <div className="incident-panel">
      {filtered.map((incident) => (
        <div
          key={incident.contractId}
          className={`incident-card incident-${incident.severity.toLowerCase()} incident-status-${incident.status.toLowerCase()}`}
        >
          <div className="incident-header">
            <SeverityBadge severity={incident.severity} />
            <span className="incident-status-label">{incident.status}</span>
            <span className="incident-title">{incident.failureTitle}</span>
          </div>

          <div className="incident-meta">
            <div className="incident-row">
              <span className="incident-label">Contract</span>
              <span className="incident-value mono">{incident.contractId}</span>
            </div>
            <div className="incident-row">
              <span className="incident-label">Repo</span>
              <span className="incident-value">{incident.repo}</span>
            </div>
            <div className="incident-row">
              <span className="incident-label">Service</span>
              <span className="incident-value">{incident.service}</span>
            </div>
            <div className="incident-row">
              <span className="incident-label">Environment</span>
              <span className="incident-value">{incident.environment}</span>
            </div>
            <div className="incident-row">
              <span className="incident-label">Failure Type</span>
              <span className="incident-value mono">{incident.failureType}</span>
            </div>
            <div className="incident-row">
              <span className="incident-label">Last Detected</span>
              <span className="incident-value">{formatTimestamp(incident.lastDetected)}</span>
            </div>
          </div>

          <div className="incident-result">
            <div className="incident-row">
              <span className="incident-label">Actual Result</span>
              <span className="incident-value status-fail">{incident.actualResult}</span>
            </div>
            <div className="incident-row">
              <span className="incident-label">Expected</span>
              <span className="incident-value">{incident.expectedResult}</span>
            </div>
          </div>

          <div className="incident-command">
            <span className="incident-label">Validation Command</span>
            <pre className="incident-code">{incident.validationCommand}</pre>
          </div>

          {incident.issueUrl && (
            <div className="incident-issue">
              <a
                href={incident.issueUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="incident-issue-link"
              >
                GitHub Issue #{incident.issueNumber}
              </a>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
