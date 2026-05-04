// ============================================================
// Adaptix Ops Dashboard — Confidence Badge
// ============================================================

import type { Confidence } from "../lib/types";

interface ConfidenceBadgeProps {
  confidence: Confidence;
}

const CONFIDENCE_CLASSES: Record<Confidence, string> = {
  high: "confidence-high",
  medium: "confidence-medium",
  low: "confidence-low",
};

export function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  const cls = CONFIDENCE_CLASSES[confidence] ?? "confidence-low";
  return <span className={`confidence-badge ${cls}`}>{confidence}</span>;
}
