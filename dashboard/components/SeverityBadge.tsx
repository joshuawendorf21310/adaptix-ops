// ============================================================
// Adaptix Ops Dashboard — Severity Badge
// ============================================================

import type { Severity } from "../lib/types";

interface SeverityBadgeProps {
  severity: Severity;
}

const SEVERITY_CLASSES: Record<Severity, string> = {
  P0: "severity-p0",
  P1: "severity-p1",
  P2: "severity-p2",
  P3: "severity-p3",
};

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  const cls = SEVERITY_CLASSES[severity] ?? "severity-p3";
  return <span className={`severity-badge ${cls}`}>{severity}</span>;
}
