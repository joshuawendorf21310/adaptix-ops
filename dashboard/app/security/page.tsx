"use client";

// ============================================================
// Adaptix Ops Dashboard — Security Page (/security)
// ============================================================

import { useEffect, useState } from "react";
import { DashboardShell } from "../../components/DashboardShell";
import { StatusBadge } from "../../components/StatusBadge";
import { loadOpsSnapshot, timeSince } from "../../lib/data";
import type { AdaptixOpsSnapshot } from "../../lib/types";

function countClass(n: number, level: "critical" | "high" | "medium" | "low"): string {
  if (n === 0) return "security-count-zero";
  if (level === "critical") return "security-count-critical";
  if (level === "high") return "security-count-high";
  if (level === "medium") return "security-count-medium";
  return "security-count-low";
}

export default function SecurityPage() {
  const [snapshot, setSnapshot] = useState<AdaptixOpsSnapshot | null>(null);

  useEffect(() => {
    loadOpsSnapshot().then(setSnapshot);
  }, []);

  if (!snapshot) {
    return <div className="loading">Loading security data...</div>;
  }

  const { security, overallStatus, generatedAt, summary } = snapshot;

  const secFail = security.filter((s) => s.status === "FAIL").length;
  const secWarn = security.filter((s) => s.status === "WARN").length;
  const secPass = security.filter((s) => s.status === "PASS").length;
  const secUnknown = security.filter((s) => s.status === "UNKNOWN").length;

  const totalDependabot = security.reduce((a, s) => a + s.dependabotTotal, 0);
  const totalCodeScanning = security.reduce((a, s) => a + s.codeScanningTotal, 0);
  const totalSecrets = security.reduce((a, s) => a + s.secretScanningTotal, 0);

  return (
    <DashboardShell
      overallStatus={overallStatus}
      lastSweep={timeSince(generatedAt)}
      openIncidents={summary.openIncidents}
    >
      <div className="page-title">Security</div>
      <div className="page-subtitle">
        {security.length} repos scanned · Last sweep: {timeSince(generatedAt)}
      </div>

      <div className="section">
        <div className="summary-tiles">
          <div className="summary-tile tile-fail">
            <span className="summary-tile-value">{secFail}</span>
            <span className="summary-tile-label">FAIL</span>
          </div>
          <div className="summary-tile tile-warn">
            <span className="summary-tile-value">{secWarn}</span>
            <span className="summary-tile-label">WARN</span>
          </div>
          <div className="summary-tile tile-pass">
            <span className="summary-tile-value">{secPass}</span>
            <span className="summary-tile-label">PASS</span>
          </div>
          <div className="summary-tile tile-unknown">
            <span className="summary-tile-value">{secUnknown}</span>
            <span className="summary-tile-label">UNKNOWN</span>
          </div>
          <div className="summary-tile tile-fail">
            <span className="summary-tile-value">{totalDependabot}</span>
            <span className="summary-tile-label">Dependabot</span>
          </div>
          <div className="summary-tile tile-fail">
            <span className="summary-tile-value">{totalCodeScanning}</span>
            <span className="summary-tile-label">Code Scanning</span>
          </div>
          <div className="summary-tile tile-fail">
            <span className="summary-tile-value">{totalSecrets}</span>
            <span className="summary-tile-label">Secrets</span>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-title">Security Alerts by Repo</div>
        {security.length === 0 ? (
          <div className="text-muted">
            No security data. Run <code>npm run sweep:security</code> to populate.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="security-table">
              <thead>
                <tr>
                  <th>Repo</th>
                  <th>Status</th>
                  <th>Dependabot Critical</th>
                  <th>Dependabot High</th>
                  <th>Dependabot Medium</th>
                  <th>Dependabot Low</th>
                  <th>Code Scanning Critical</th>
                  <th>Code Scanning High</th>
                  <th>Code Scanning Medium</th>
                  <th>Secrets</th>
                </tr>
              </thead>
              <tbody>
                {security.map((s) => (
                  <tr key={s.repo}>
                    <td>
                      <a
                        href={`https://github.com/${s.repo}/security`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary font-bold"
                      >
                        {s.repo.split("/")[1] ?? s.repo}
                      </a>
                    </td>
                    <td>
                      <StatusBadge status={s.status} size="sm" />
                    </td>
                    <td className={countClass(s.dependabotCritical, "critical")}>
                      {s.dependabotAccessible ? s.dependabotCritical : "—"}
                    </td>
                    <td className={countClass(s.dependabotHigh, "high")}>
                      {s.dependabotAccessible ? s.dependabotHigh : "—"}
                    </td>
                    <td className={countClass(s.dependabotMedium, "medium")}>
                      {s.dependabotAccessible ? s.dependabotMedium : "—"}
                    </td>
                    <td className={countClass(s.dependabotLow, "low")}>
                      {s.dependabotAccessible ? s.dependabotLow : "—"}
                    </td>
                    <td className={countClass(s.codeScanningCritical, "critical")}>
                      {s.codeScanningAccessible ? s.codeScanningCritical : "—"}
                    </td>
                    <td className={countClass(s.codeScanningHigh, "high")}>
                      {s.codeScanningAccessible ? s.codeScanningHigh : "—"}
                    </td>
                    <td className={countClass(s.codeScanningMedium, "medium")}>
                      {s.codeScanningAccessible ? s.codeScanningMedium : "—"}
                    </td>
                    <td className={countClass(s.secretScanningTotal, "critical")}>
                      {s.secretScanningAccessible ? s.secretScanningTotal : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
