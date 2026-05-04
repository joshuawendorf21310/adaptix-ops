// ============================================================
// Adaptix Ops Dashboard — Shell / Navigation
// ============================================================

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface DashboardShellProps {
  children: React.ReactNode;
  overallStatus?: string;
  lastSweep?: string;
  openIncidents?: number;
}

const NAV_LINKS = [
  { href: "/", label: "Overview" },
  { href: "/repos", label: "Repos" },
  { href: "/deployments", label: "Deployments" },
  { href: "/incidents", label: "Incidents" },
  { href: "/security", label: "Security" },
];

export function DashboardShell({
  children,
  overallStatus = "UNKNOWN",
  lastSweep = "",
  openIncidents = 0,
}: DashboardShellProps) {
  const pathname = usePathname();

  const statusClass =
    overallStatus === "PASS"
      ? "status-pass"
      : overallStatus === "FAIL"
      ? "status-fail"
      : overallStatus === "WARN"
      ? "status-warn"
      : "status-unknown";

  return (
    <div className="shell">
      <header className="shell-header">
        <div className="shell-header-left">
          <span className="shell-logo">ADAPTIX OPS</span>
          <span className="shell-subtitle">Polyrepo Operations Command Center</span>
        </div>
        <div className="shell-header-right">
          <span className={`shell-status ${statusClass}`}>
            Production Health: {overallStatus}
          </span>
          {openIncidents > 0 && (
            <span className="shell-incidents status-fail">
              Open Incidents: {openIncidents}
            </span>
          )}
          {lastSweep && (
            <span className="shell-sweep">Last Sweep: {lastSweep}</span>
          )}
        </div>
      </header>

      <nav className="shell-nav">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`shell-nav-link ${pathname === link.href ? "shell-nav-active" : ""}`}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <main className="shell-main">{children}</main>

      <footer className="shell-footer">
        <span>adaptix-ops · joshuawendorf21310/adaptix-ops · Source of Truth: GitHub</span>
      </footer>
    </div>
  );
}
