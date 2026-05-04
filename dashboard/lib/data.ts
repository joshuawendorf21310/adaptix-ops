// ============================================================
// Adaptix Ops Dashboard — Data Loading
// ============================================================
// Reads from /adaptix-ops.json (served from public/)
// No backend required. No live database.
// If the file is missing or malformed, returns UNKNOWN state.
// ============================================================

import type { AdaptixOpsSnapshot } from "./types";

export const EMPTY_SNAPSHOT: AdaptixOpsSnapshot = {
  generatedAt: "",
  sweepVersion: "unknown",
  overallStatus: "UNKNOWN",
  routeContracts: [],
  repoHealth: [],
  security: [],
  deployments: [],
  incidents: [],
  summary: {
    totalRepos: 0,
    pass: 0,
    warn: 0,
    fail: 0,
    blocked: 0,
    unknown: 0,
    openIncidents: 0,
    p0Incidents: 0,
  },
};

export async function loadOpsSnapshot(): Promise<AdaptixOpsSnapshot> {
  try {
    const res = await fetch("/adaptix-ops.json", {
      cache: "no-store",
    });
    if (!res.ok) {
      console.warn(`[data] adaptix-ops.json returned ${res.status}`);
      return EMPTY_SNAPSHOT;
    }
    const data = await res.json();
    return data as AdaptixOpsSnapshot;
  } catch (err) {
    console.warn("[data] Failed to load adaptix-ops.json:", err);
    return EMPTY_SNAPSHOT;
  }
}

export function formatTimestamp(iso: string): string {
  if (!iso) return "never";
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });
  } catch {
    return iso;
  }
}

export function timeSince(iso: string): string {
  if (!iso) return "unknown";
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch {
    return "unknown";
  }
}

export function shortSha(sha: string | null): string {
  if (!sha) return "—";
  return sha.slice(0, 7);
}
