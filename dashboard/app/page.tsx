"use client";

// ============================================================
// Adaptix Ops Dashboard — Executive Overview (/)
// ============================================================

import { useEffect, useState } from "react";
import { DashboardShell } from "../components/DashboardShell";
import { HealthGrid } from "../components/HealthGrid";
import { IncidentPanel } from "../components/IncidentPanel";
import { DeploymentTimeline } from "../components/DeploymentTimeline";
import { StatusBadge } from "../components/StatusBadge";
import { SeverityBadge } from "../components/SeverityBadge";
import { loadOpsSnapshot, timeSince } from "../lib/data";
import type { AdaptixOpsSnapshot } from "../lib/types";

export default function OverviewPage() {
  const [snapshot, setSnapshot] = useState<AdaptixOpsSnapshot | null>(null);

  useEffect(() => {
    loadOpsSnapshot().then(setSnapshot);
  }, []);

  if (!snapshot) {
    return <div className="loading">Loading Adaptix Ops snapshot...</div>;
  }

  const { summary, overallStatus, generatedAt, routeContracts, incidents, repoHealth, deployments, security } = snapshot;

  // P0 production incidents
  const p0Incidents = incidents.filter(
    (i) => i.severity === "P0" && i.status !== "RESOLVED"
  );

  // P0 route contract failures
  const p0ContractFailures = routeContracts.filter(
    (r) => r.status === "FAIL" && r.severity === "P0"
  );

  // Security summary
  const secFail = security.filter((s) => s.status === "FAIL").length;
  const secWarn = security.filter((s) => s.status === "WARN").length;

  return (
    <DashboardShell
      overallStatus={overallStatus}
      lastSweep={timeSince(generatedAt)}
      openIncidents={summary.openIncidents}
    >
      <div className="page-title">ADAPTIX POLYREPO OPERATIONS</div>
      <div className="page-subtitle">
        Source of Truth: GitHub · Control Repo: joshuawendorf21310/adaptix-ops ·
        Last Sweep: {timeSince(generatedAt)}
      </div>

      {/* P0 Production Incident Card — always shown when failing */}
      {p0ContractFailures.map((contract) => (
        <div key={contract.contractId} className="p0-production-card">
          <div className="p0-production-card-header">
            <SeverityBadge severity="P0" />
            <span className="p0-production-card-title">
              CURRENT PRODUCTION INCIDENT — {contract.failureTitle}
            </span>
          </div>
          <div className="p0-production-card-body">
            <div className="p0-field">
              <span className="p0-field-label">Repo</span>
              <span className="p0-field-value">{contract.repo}</span>
            </div>
            <div className="p0-field">
              <span className="p0-field-label">Domain</span>
              <span className="p0-field-value">
                <a href={contract.url} target="_blank" rel="noopener noreferrer">{contract.url}</a>
              </span>
            </div>
            <div className="p0-field">
              <span className="p0-field-label">Status</span>
              <span className="p0-field-value fail">FAIL</span>
            </div>
            <div className="p0-field">
              <span className="p0-field-label">Failure Type</span>
              <span className="p0-field-value fail">{contract.failureType}</span>
            </div>
            <div className="p0-field">
              <span className="p0-field-label">HTTP Status</span>
              <span className="p0-field-value">{contract.actualStatus ?? "null"}</span>
            </div>
            <div className="p0-field">
              <span className="p0-field-label">Missing Signatures</span>
              <span className="p0-field-value fail">
                {contract.missingRequired.length > 0
                  ? contract.missingRequired.join(", ")
                  : "none"}
              </span>
            </div>
            <div className="p0-field">
              <span className="p0-field-label">Forbidden Found</span>
              <span className="p0-field-value fail">
                {contract.forbiddenFound.length > 0
                  ? contract.forbiddenFound.join(", ")
                  : "none"}
              </span>
            </div>
            <div className="p0-field">
              <span className="p0-field-label">Impact</span>
              <span className="p0-field-value">{contract.impact}</span>
            </div>
          </div>
        </div>
      ))}

      {/* Summary Tiles */}
      <div className="section">
        <div className="section-title">Polyrepo Health Summary</div>
        <div className="summary-tiles">
          <div className="summary-tile tile-pass">
            <span className="summary-tile-value">{summary.pass}</span>
            <span className="summary-tile-label">PASS</span>
          </div>
          <div className="summary-tile tile-warn">
            <span className="summary-tile-value">{summary.warn}</span>
            <span className="summary-tile-label">WARN</span>
          </div>
          <div className="summary-tile tile-fail">
            <span className="summary-tile-value">{summary.fail}</span>
            <span className="summary-tile-label">FAIL</span>
          </div>
          <div className="summary-tile tile-blocked">
            <span className="summary-tile-value">{summary.blocked}</span>
            <span className="summary-tile-label">BLOCKED</span>
          </div>
          <div className="summary-tile tile-unknown">
            <span className="summary-tile-value">{summary.unknown}</span>
            <span className="summary-tile-label">UNKNOWN</span>
          </div>
          <div className="summary-tile tile-fail">
            <span className="summary-tile-value">{summary.openIncidents}</span>
            <span className="summary-tile-label">Open Incidents</span>
          </div>
          <div className="summary-tile tile-fail">
            <span className="summary-tile-value">{summary.p0Incidents}</span>
            <span className="summary-tile-label">P0 Incidents</span>
          </div>
          <div className="summary-tile tile-unknown">
            <span className="summary-tile-value">{summary.totalRepos}</span>
            <span className="summary-tile-label">Total Repos</span>
          </div>
        </div>
      </div>

      {/* Route Contract Status */}
      {routeContracts.length > 0 && (
        <div className="section">
          <div className="section-title">Production Route Contracts</div>
          <table className="repos-table">
            <thead>
              <tr>
                <th>Contract</th>
                <th>Severity</th>
                <th>URL</th>
                <th>Status</th>
                <th>HTTP</th>
                <th>Missing</th>
                <th>Forbidden Found</th>
              </tr>
            </thead>
            <tbody>
              {routeContracts.map((r) => (
                <tr key={r.contractId}>
                  <td className="repos-table-repo font-mono">{r.contractId}</td>
                  <td><SeverityBadge severity={r.severity} /></td>
                  <td>
                    <a href={r.url} target="_blank" rel="noopener noreferrer">{r.url}</a>
                  </td>
                  <td><StatusBadge status={r.status} size="sm" /></td>
                  <td className="font-mono">{r.actualStatus ?? "—"}</td>
                  <td className={r.missingRequired.length > 0 ? "status-fail" : "status-pass"}>
                    {r.missingRequired.length > 0 ? r.missingRequired.join(", ") : "none"}
                  </td>
                  <td className={r.forbiddenFound.length > 0 ? "status-fail" : "status-pass"}>
                    {r.forbiddenFound.length > 0 ? r.forbiddenFound.join(", ") : "none"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Open Incidents */}
      <div className="section">
        <div className="section-title">
          Production Incidents ({summary.openIncidents} open)
        </div>
        <IncidentPanel incidents={incidents} />
      </div>

      {/* Repo Health Grid */}
      <div className="section">
        <div className="section-title">
          Repo Health Grid ({repoHealth.length} repos)
        </div>
        <HealthGrid repos={repoHealth.slice(0, 30)} />
      </div>

      {/* Deployment Timeline */}
      <div className="section">
        <div className="section-title">Latest Deployments</div>
        <DeploymentTimeline deployments={deployments.slice(0, 20)} />
      </div>

      {/* Security Summary */}
      <div className="section">
        <div className="section-title">
          Security Summary ({secFail} FAIL, {secWarn} WARN)
        </div>
        <div className="summary-tiles">
          <div className="summary-tile tile-fail">
            <span className="summary-tile-value">{secFail}</span>
            <span className="summary-tile-label">Security FAIL</span>
          </div>
          <div className="summary-tile tile-warn">
            <span className="summary-tile-value">{secWarn}</span>
            <span className="summary-tile-label">Security WARN</span>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
