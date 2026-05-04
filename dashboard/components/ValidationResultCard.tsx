// ============================================================
// Adaptix Ops Dashboard — Validation Result Card
// ============================================================

import type { RouteContractResult } from "../lib/types";
import { StatusBadge } from "./StatusBadge";
import { SeverityBadge } from "./SeverityBadge";

interface ValidationResultCardProps {
  result: RouteContractResult;
}

export function ValidationResultCard({ result }: ValidationResultCardProps) {
  return (
    <div className={`validation-card validation-${result.status.toLowerCase()}`}>
      <div className="validation-header">
        <SeverityBadge severity={result.severity} />
        <StatusBadge status={result.status} size="sm" />
        <span className="validation-contract-id mono">{result.contractId}</span>
      </div>

      <div className="validation-url">
        <a href={result.url} target="_blank" rel="noopener noreferrer">
          {result.url}
        </a>
      </div>

      {result.status === "FAIL" && (
        <div className="validation-failures">
          {result.missingRequired.length > 0 && (
            <div className="validation-missing">
              <span className="validation-label status-fail">Missing Required:</span>
              <ul>
                {result.missingRequired.map((s) => (
                  <li key={s} className="status-fail mono">{s}</li>
                ))}
              </ul>
            </div>
          )}
          {result.forbiddenFound.length > 0 && (
            <div className="validation-forbidden">
              <span className="validation-label status-fail">Forbidden Found:</span>
              <ul>
                {result.forbiddenFound.map((s) => (
                  <li key={s} className="status-fail mono">{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="validation-meta">
        <span className="text-muted">HTTP {result.actualStatus ?? "—"}</span>
        <span className="text-muted">·</span>
        <span className="text-muted">{result.checkedAt}</span>
      </div>
    </div>
  );
}
