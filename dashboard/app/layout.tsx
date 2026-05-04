// ============================================================
// Adaptix Ops Dashboard — Root Layout
// ============================================================

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Adaptix Ops — Polyrepo Operations Command Center",
  description:
    "Real-time health monitoring for all Adaptix polyrepos. CI status, deployments, route contracts, incidents, and security.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
