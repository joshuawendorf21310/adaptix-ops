// ============================================================
// Adaptix Ops — Dashboard JSON Persistence
// ============================================================
// This module handles reading and writing the adaptix-ops.json
// snapshot file that the dashboard reads from.
// ============================================================

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type {
  AdaptixOpsSnapshot,
  RouteContractResult,
  RepoHealth,
  SecuritySummary,
  DeploymentRecord,
  Incident,
  CheckStatus,
} from "./types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path from scripts/lib/ → dashboard/public/adaptix-ops.json
const SNAPSHOT_PATH = join(
  __dirname,
  "..",
  "..",
  "dashboard",
  "public",
  "adaptix-ops.json"
);

export function loadSnapshot(): AdaptixOpsSnapshot {
  if (!existsSync(SNAPSHOT_PATH)) {
    return createEmptySnapshot();
  }
  try {
    const raw = readFileSync(SNAPSHOT_PATH, "utf-8");
    return JSON.parse(raw) as AdaptixOpsSnapshot;
  } catch {
    return createEmptySnapshot();
  }
}

export function saveSnapshot(snapshot: AdaptixOpsSnapshot): void {
  const dir = dirname(SNAPSHOT_PATH);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2), "utf-8");
  console.log(`[project] Snapshot saved to ${SNAPSHOT_PATH}`);
}

export function createEmptySnapshot(): AdaptixOpsSnapshot {
  return {
    generatedAt: new Date().toISOString(),
    sweepVersion: "1.0.0",
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
}

export function mergeRouteContracts(
  snapshot: AdaptixOpsSnapshot,
  results: RouteContractResult[]
): AdaptixOpsSnapshot {
  const updated = { ...snapshot };
  // Replace all route contract results
  updated.routeContracts = results;
  updated.generatedAt = new Date().toISOString();
  return updated;
}

export function mergeRepoHealth(
  snapshot: AdaptixOpsSnapshot,
  repoHealth: RepoHealth[]
): AdaptixOpsSnapshot {
  const updated = { ...snapshot };
  updated.repoHealth = repoHealth;
  updated.generatedAt = new Date().toISOString();
  return updated;
}

export function mergeSecurity(
  snapshot: AdaptixOpsSnapshot,
  security: SecuritySummary[]
): AdaptixOpsSnapshot {
  const updated = { ...snapshot };
  updated.security = security;
  updated.generatedAt = new Date().toISOString();
  return updated;
}

export function mergeDeployments(
  snapshot: AdaptixOpsSnapshot,
  deployments: DeploymentRecord[]
): AdaptixOpsSnapshot {
  const updated = { ...snapshot };
  updated.deployments = deployments;
  updated.generatedAt = new Date().toISOString();
  return updated;
}

export function mergeIncidents(
  snapshot: AdaptixOpsSnapshot,
  incidents: Incident[]
): AdaptixOpsSnapshot {
  const updated = { ...snapshot };
  updated.incidents = incidents;
  updated.generatedAt = new Date().toISOString();
  return updated;
}

export function computeSummary(snapshot: AdaptixOpsSnapshot): AdaptixOpsSnapshot {
  const updated = { ...snapshot };

  // Compute repo health counts
  const statuses = snapshot.repoHealth.map((r) => r.ciStatus);
  const pass = statuses.filter((s) => s === "PASS").length;
  const warn = statuses.filter((s) => s === "WARN").length;
  const fail = statuses.filter((s) => s === "FAIL").length;
  const blocked = statuses.filter((s) => s === "BLOCKED").length;
  const unknown = statuses.filter((s) => s === "UNKNOWN").length;

  const openIncidents = snapshot.incidents.filter(
    (i) => i.status !== "RESOLVED"
  ).length;
  const p0Incidents = snapshot.incidents.filter(
    (i) => i.severity === "P0" && i.status !== "RESOLVED"
  ).length;

  // Also count route contract failures
  const routeFails = snapshot.routeContracts.filter(
    (r) => r.status === "FAIL"
  ).length;

  // Overall status
  let overallStatus: CheckStatus = "PASS";
  if (fail > 0 || routeFails > 0 || p0Incidents > 0) {
    overallStatus = "FAIL";
  } else if (warn > 0) {
    overallStatus = "WARN";
  } else if (unknown > 0 && pass === 0) {
    overallStatus = "UNKNOWN";
  }

  updated.summary = {
    totalRepos: snapshot.repoHealth.length,
    pass,
    warn,
    fail,
    blocked,
    unknown,
    openIncidents,
    p0Incidents,
  };
  updated.overallStatus = overallStatus;

  return updated;
}
