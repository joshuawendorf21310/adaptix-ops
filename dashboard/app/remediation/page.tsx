"use client";

// ============================================================
// Adaptix Ops Dashboard — Remediation Page (/remediation)
// ============================================================

import { useEffect, useState } from "react";
import { DashboardShell } from "../../components/DashboardShell";
import { RemediationPanel } from "../../components/RemediationPanel";
import { IncidentPanel } from "../../components/IncidentPanel";
import { loadOpsSnapshot, timeSince } from "../../lib/data";
import type { AdaptixOpsSnapshot } from "../../lib/types";

export default function RemediationPage() {
  const [snapshot, setSnapshot] = useState<AdaptixOpsSnapshot | null>(null);

  useEffect(() => {
    loadOpsSnapshot().then(setSnapshot);
  }, []);

  if (!snapshot) {
    return <div className="loading">Loading remediation data...</div>;
  }

  const { remediation, incidents, intelligence, overallStatus, generatedAt, summary } = snapshot;

  const remediationData = remediation ?? {
    openPrs: [],
    blockedIncidents: [],
    readyForHumanReview: [],
  };

  const openIncidents = incidents.filter((i) => i.status !== "RESOLVED");
  const agentTasks = intelligence?.codingAgentTasks ?? [];
  const tasksReadyForReview = agentTasks.filter((t) => t.humanReviewRequired);

  return (
    <DashboardShell
      overallStatus={overallStatus}
      lastSweep={timeSince(generatedAt)}
      openIncidents={summary.openIncidents}
    >
      <div className="page-title">Remediation</div>
      <div className="page-subtitle">
        PR tracking, validation state, and human review gates.
        {" · "}Last sweep: {timeSince(generatedAt)}
      </div>

      {/* Enforcement banner */}
      <div className="remediation-enforcement-banner">
        <span className="status-warn">
          ⚠️ ENFORCEMENT: Auto-merge is forbidden for all production-impacting failures.
          Incidents close only when the exact failed deterministic contract returns PASS.
          Human review is required before merging any production fix.
        </span>
      </div>

      {/* Summary */}
      <div className="section">
        <div className="summary-tiles">
          <div className="summary-tile tile-fail">
            <span className="summary-tile-value">{openIncidents.length}</span>
            <span className="summary-tile-label">Open Incidents</span>
          </div>
          <div className="summary-tile tile-unknown">
            <span className="summary-tile-value">{remediationData.openPrs.length}</span>
            <span className="summary-tile-label">Open PRs</span>
          </div>
          <div className="summary-tile tile-fail">
            <span className="summary-tile-value">{remediationData.blockedIncidents.length}</span>
            <span className="summary-tile-label">Blocked</span>
          </div>
          <div className="summary-tile tile-warn">
            <span className="summary-tile-value">{remediationData.readyForHumanReview.length}</span>
            <span className="summary-tile-label">Ready for Review</span>
          </div>
          <div className="summary-tile tile-warn">
            <span className="summary-tile-value">{tasksReadyForReview.length}</span>
            <span className="summary-tile-label">Agent Tasks Pending</span>
          </div>
        </div>
      </div>

      {/* PR Tracking */}
      <div className="section">
        <div className="section-title">Remediation PR Tracking</div>
        <RemediationPanel remediation={remediationData} />
      </div>

      {/* Open Incidents */}
      <div className="section">
        <div className="section-title">Open Incidents Requiring Fix</div>
        <IncidentPanel incidents={incidents} />
      </div>

      {/* Closure rule */}
      <div className="section">
        <div className="closure-rule-card">
          <div className="closure-rule-title">Incident Closure Rule</div>
          <p className="text-secondary">
            An incident may be closed only when the exact failed deterministic contract returns PASS.
            AI model output, PR approval, or human judgment alone are not sufficient to close an incident.
            The production sweep must run and the contract must return PASS.
          </p>
        </div>
      </div>
    </DashboardShell>
  );
}
