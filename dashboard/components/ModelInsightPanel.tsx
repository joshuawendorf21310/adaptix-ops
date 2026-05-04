// ============================================================
// Adaptix Ops Dashboard — Model Insight Panel
// ============================================================
// Shows AI classification results. Deterministic status is
// always shown separately from model confidence.
// UNKNOWN is never shown as green.
// ============================================================

import type { IncidentClassification, ModelStatus } from "../lib/types";
import { SeverityBadge } from "./SeverityBadge";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { formatTimestamp } from "../lib/data";

interface ModelInsightPanelProps {
  modelStatus: ModelStatus;
  classifications: IncidentClassification[];
}

const MODEL_STATUS_CLASSES: Record<ModelStatus, string> = {
  PASS: "status-pass",
  WARN: "status-warn",
  FAIL: "status-fail",
  UNKNOWN: "status-unknown",
};

export function ModelInsightPanel({ modelStatus, classifications }: ModelInsightPanelProps) {
  return (
    <div className="model-insight-panel">
      <div className="model-status-header">
        <span className="section-title">AI Model Status</span>
        <span className={`model-status-badge ${MODEL_STATUS_CLASSES[modelStatus]}`}>
          {modelStatus}
        </span>
        {modelStatus === "UNKNOWN" && (
          <span className="model-unavailable-note">
            Model unavailable — deterministic monitoring unaffected
          </span>
        )}
      </div>

      {classifications.length === 0 ? (
        <div className="text-muted">No classifications available. Run sweep:intelligence to populate.</div>
      ) : (
        <div className="classification-list">
          {classifications.map((c) => (
            <div key={c.contractId} className={`classification-card model-${c.modelStatus.toLowerCase()}`}>
              <div className="classification-header">
                <SeverityBadge severity={c.severity} />
                <span className="mono text-secondary">{c.contractId}</span>
                <span className={`model-status-inline ${MODEL_STATUS_CLASSES[c.modelStatus]}`}>
                  AI: {c.modelStatus}
                </span>
                {c.modelStatus !== "UNKNOWN" && (
                  <ConfidenceBadge confidence={c.confidence} />
                )}
              </div>

              {c.modelStatus === "UNKNOWN" ? (
                <div className="classification-unknown">
                  <span className="status-unknown">
                    AI Classification: UNKNOWN — {c.reason ?? "model unavailable"}
                  </span>
                </div>
              ) : (
                <>
                  <div className="classification-category">
                    <span className="classification-label">Failure Category:</span>
                    <span className="classification-value">{c.failureCategory}</span>
                  </div>

                  {c.confirmedFacts.length > 0 && (
                    <div className="classification-facts">
                      <span className="classification-label">Confirmed Facts:</span>
                      <ul>
                        {c.confirmedFacts.map((f, i) => (
                          <li key={i} className="text-secondary">{f}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {c.rootCauseHypotheses.length > 0 && (
                    <div className="classification-hypotheses">
                      <span className="classification-label">Hypotheses:</span>
                      <ul>
                        {c.rootCauseHypotheses.map((h, i) => (
                          <li key={i} className="text-secondary">{h}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {c.noDriftWarnings.length > 0 && (
                    <div className="classification-warnings">
                      {c.noDriftWarnings.map((w, i) => (
                        <div key={i} className="status-warn">⚠️ {w}</div>
                      ))}
                    </div>
                  )}
                </>
              )}

              <div className="classification-footer text-muted">
                Classified: {formatTimestamp(c.classifiedAt)}
                {" · "}
                <em>AI interpretation only — does not affect deterministic severity</em>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
