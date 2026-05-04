"use client";

// ============================================================
// Adaptix Ops Dashboard — Intelligence Page (/intelligence)
// ============================================================

import { useEffect, useState } from "react";
import { DashboardShell } from "../../components/DashboardShell";
import { ModelInsightPanel } from "../../components/ModelInsightPanel";
import { AgentTaskPanel } from "../../components/AgentTaskPanel";
import { loadOpsSnapshot, timeSince } from "../../lib/data";
import type { AdaptixOpsSnapshot } from "../../lib/types";

export default function IntelligencePage() {
  const [snapshot, setSnapshot] = useState<AdaptixOpsSnapshot | null>(null);

  useEffect(() => {
    loadOpsSnapshot().then(setSnapshot);
  }, []);

  if (!snapshot) {
    return <div className="loading">Loading intelligence data...</div>;
  }

  const { intelligence, overallStatus, generatedAt, summary } = snapshot;
  const intel = intelligence ?? {
    modelStatus: "UNKNOWN" as const,
    classifications: [],
    remediationPlans: [],
    codingAgentTasks: [],
  };

  return (
    <DashboardShell
      overallStatus={overallStatus}
      lastSweep={timeSince(generatedAt)}
      openIncidents={summary.openIncidents}
    >
      <div className="page-title">Intelligence</div>
      <div className="page-subtitle">
        AI-powered incident classification, remediation planning, and coding-agent task generation.
        Model status: <span className={`model-status-inline model-status-${intel.modelStatus.toLowerCase()}`}>
          {intel.modelStatus}
        </span>
        {" · "}Last sweep: {timeSince(generatedAt)}
      </div>

      {/* Model availability notice */}
      {intel.modelStatus === "UNKNOWN" && (
        <div className="model-unavailable-banner">
          <span className="status-unknown">
            ⚠️ AI model unavailable — deterministic monitoring is unaffected.
            Set GITHUB_MODELS_TOKEN or GITHUB_TOKEN to enable AI intelligence.
          </span>
        </div>
      )}

      {/* Summary tiles */}
      <div className="section">
        <div className="summary-tiles">
          <div className="summary-tile tile-unknown">
            <span className="summary-tile-value">{intel.classifications.length}</span>
            <span className="summary-tile-label">Classifications</span>
          </div>
          <div className="summary-tile tile-unknown">
            <span className="summary-tile-value">{intel.remediationPlans.length}</span>
            <span className="summary-tile-label">Remediation Plans</span>
          </div>
          <div className="summary-tile tile-unknown">
            <span className="summary-tile-value">{intel.codingAgentTasks.length}</span>
            <span className="summary-tile-label">Agent Tasks</span>
          </div>
          <div className="summary-tile tile-warn">
            <span className="summary-tile-value">
              {intel.codingAgentTasks.filter((t) => t.humanReviewRequired).length}
            </span>
            <span className="summary-tile-label">Require Human Review</span>
          </div>
        </div>
      </div>

      {/* AI Classification */}
      <div className="section">
        <div className="section-title">AI Incident Classification</div>
        <ModelInsightPanel
          modelStatus={intel.modelStatus}
          classifications={intel.classifications}
        />
      </div>

      {/* Remediation Plans */}
      {intel.remediationPlans.length > 0 && (
        <div className="section">
          <div className="section-title">AI Remediation Plans</div>
          <div className="remediation-plan-list">
            {intel.remediationPlans.map((plan) => (
              <div key={plan.contractId} className={`remediation-plan-card model-${plan.modelStatus.toLowerCase()}`}>
                <div className="remediation-plan-header">
                  <span className={`model-status-inline model-status-${plan.modelStatus.toLowerCase()}`}>
                    AI: {plan.modelStatus}
                  </span>
                  <span className="mono text-secondary">{plan.contractId}</span>
                  <span className={`risk-badge risk-${plan.riskLevel}`}>
                    Risk: {plan.riskLevel.toUpperCase()}
                  </span>
                  {plan.humanReviewRequired && (
                    <span className="human-review-required">HUMAN REVIEW REQUIRED</span>
                  )}
                </div>
                {plan.modelStatus !== "UNKNOWN" && (
                  <>
                    <div className="remediation-plan-strategy">
                      <span className="remediation-plan-label">Fix Strategy:</span>
                      <span className="text-secondary">{plan.fixStrategy}</span>
                    </div>
                    <div className="remediation-plan-repo">
                      <span className="remediation-plan-label">Target Repo:</span>
                      <span className="mono text-secondary">{plan.targetRepo}</span>
                    </div>
                    {plan.likelyFiles.length > 0 && (
                      <div className="remediation-plan-files">
                        <span className="remediation-plan-label">Likely Files:</span>
                        <ul>
                          {plan.likelyFiles.map((f, i) => (
                            <li key={i} className="mono text-muted">{f}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
                {plan.modelStatus === "UNKNOWN" && (
                  <div className="status-unknown">
                    Plan UNKNOWN — {plan.reason ?? "model unavailable"}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Coding Agent Tasks */}
      <div className="section">
        <div className="section-title">Coding Agent Tasks</div>
        <AgentTaskPanel tasks={intel.codingAgentTasks} />
      </div>

      {/* Disclaimer */}
      <div className="section">
        <div className="intelligence-disclaimer">
          <p className="text-muted">
            <strong>AI Control Rules:</strong> AI may identify, classify, summarize, and generate remediation plans.
            AI may not mark production healthy unless deterministic checks pass.
            AI may not close incidents unless the exact failed contract passes.
            AI may not auto-merge production fixes.
            Model confidence is never shown as production health.
          </p>
        </div>
      </div>
    </DashboardShell>
  );
}
