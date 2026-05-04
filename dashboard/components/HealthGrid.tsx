// ============================================================
// Adaptix Ops Dashboard — Health Grid
// ============================================================

import type { RepoHealth } from "../lib/types";
import { RepoCard } from "./RepoCard";

interface HealthGridProps {
  repos: RepoHealth[];
}

export function HealthGrid({ repos }: HealthGridProps) {
  if (repos.length === 0) {
    return (
      <div className="health-grid-empty">
        <span className="status-unknown">No repo health data available. Run sweep:repos to populate.</span>
      </div>
    );
  }

  return (
    <div className="health-grid">
      {repos.map((repo) => (
        <RepoCard key={repo.repo} repo={repo} />
      ))}
    </div>
  );
}
