// ============================================================
// Adaptix Ops Dashboard — Status Badge
// ============================================================

import type { CheckStatus } from "../lib/types";

interface StatusBadgeProps {
  status: CheckStatus;
  size?: "sm" | "md" | "lg";
}

const STATUS_CLASSES: Record<CheckStatus, string> = {
  PASS: "status-pass",
  WARN: "status-warn",
  FAIL: "status-fail",
  BLOCKED: "status-blocked",
  UNKNOWN: "status-unknown",
};

const STATUS_DOTS: Record<CheckStatus, string> = {
  PASS: "●",
  WARN: "●",
  FAIL: "●",
  BLOCKED: "●",
  UNKNOWN: "○",
};

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const cls = STATUS_CLASSES[status] ?? "status-unknown";
  const sizeClass = size === "sm" ? "badge-sm" : size === "lg" ? "badge-lg" : "badge-md";
  return (
    <span className={`status-badge ${cls} ${sizeClass}`}>
      <span className="status-dot">{STATUS_DOTS[status]}</span>
      <span className="status-label">{status}</span>
    </span>
  );
}
