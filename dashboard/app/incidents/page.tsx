"use client";

// ============================================================
// Adaptix Ops Dashboard — Incidents Page (/incidents)
// ============================================================

import { useEffect, useState } from "react";
import { DashboardShell } from "../../components/DashboardShell";
import { IncidentPanel } from "../../components/IncidentPanel";
import { loadOpsSnapshot, timeSince } from "../../lib/data";
import type { AdaptixOpsSnapshot } from "../../lib/types";

export default function IncidentsPage() {
  const [snapshot, setSnapshot] = useState<AdaptixOpsSnapshot | null>(null);
  const [showResolved, setShowResolved] = useState(false);

  useEffect(() => {
    loadOpsSnapshot().then(setSnapshot);
  }, []);

  if (!snapshot) {
    return <div className="loading">Loading incident data...</div>;
  }

  const { incidents, overallStatus, generatedAt, summary } = snapshot;

  const openIncidents = incidents.filter((i) => i.status !== "RESOLVED");
  const p0Open = openIncidents.filter((i) => i.severity === "P0");
  const p1Open = openIncidents.filter((i) => i.severity === "P1");
  const p2Open = openIncidents.filter((i) => i.severity === "P2");

  return (
    <DashboardShell
      overallStatus={overallStatus}
      lastSweep={timeSince(generatedAt)}
      openIncidents={summary.openIncidents}
    >
      <div className="page-title">Incidents</div>
      <div className="page-subtitle">
        {openIncidents.length} open · {p0Open.length} P0 · {p1Open.length} P1 ·{" "}
        {p2Open.length} P2 · Last sweep: {timeSince(generatedAt)}
      </div>

      <div className="section">
        <div className="summary-tiles">
          <div className="summary-tile tile-fail">
            <span className="summary-tile-value">{openIncidents.length}</span>
            <span className="summary-tile-label">Open</span>
          </div>
          <div className="summary-tile tile-fail">
            <span className="summary-tile-value">{p0Open.length}</span>
            <span className="summary-tile-label">P0</span>
          </div>
          <div className="summary-tile tile-warn">
            <span className="summary-tile-value">{p1Open.length}</span>
            <span className="summary-tile-label">P1</span>
          </div>
          <div className="summary-tile tile-warn">
            <span className="summary-tile-value">{p2Open.length}</span>
            <span className="summary-tile-label">P2</span>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-title">
          Detected Failures
          <button
            onClick={() => setShowResolved(!showResolved)}
            style={{
              marginLeft: "12px",
              fontSize: "11px",
              padding: "2px 8px",
              background: "transparent",
              border: "1px solid #2a2a3a",
              color: "#8888aa",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            {showResolved ? "Hide Resolved" : "Show Resolved"}
          </button>
        </div>
        <IncidentPanel incidents={incidents} showResolved={showResolved} />
      </div>
    </DashboardShell>
  );
}
