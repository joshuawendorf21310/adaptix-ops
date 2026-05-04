"use client";

// ============================================================
// Adaptix Ops Dashboard — Deployments Page (/deployments)
// ============================================================

import { useEffect, useState } from "react";
import { DashboardShell } from "../../components/DashboardShell";
import { DeploymentTimeline } from "../../components/DeploymentTimeline";
import { loadOpsSnapshot, timeSince } from "../../lib/data";
import type { AdaptixOpsSnapshot } from "../../lib/types";

export default function DeploymentsPage() {
  const [snapshot, setSnapshot] = useState<AdaptixOpsSnapshot | null>(null);

  useEffect(() => {
    loadOpsSnapshot().then(setSnapshot);
  }, []);

  if (!snapshot) {
    return <div className="loading">Loading deployment data...</div>;
  }

  const { deployments, overallStatus, generatedAt, summary } = snapshot;

  return (
    <DashboardShell
      overallStatus={overallStatus}
      lastSweep={timeSince(generatedAt)}
      openIncidents={summary.openIncidents}
    >
      <div className="page-title">Deployment Timeline</div>
      <div className="page-subtitle">
        {deployments.length} deployment records · Last sweep: {timeSince(generatedAt)}
      </div>

      <div className="section">
        <div className="section-title">All Deployments</div>
        <DeploymentTimeline deployments={deployments} />
      </div>
    </DashboardShell>
  );
}
