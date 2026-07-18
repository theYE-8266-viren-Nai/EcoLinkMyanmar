import { ClipboardCheck, ExternalLink, Recycle, RefreshCw } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { EcoLinkMark } from "@/components/ecolink/app-shell";

type AdminSection = "recycling" | "reports";

export function AdminShell({
  activeSection,
  children,
  description,
  isRefreshing,
  onRefresh,
  title,
}: {
  activeSection: AdminSection;
  children: ReactNode;
  description: string;
  isRefreshing: boolean;
  onRefresh: () => void;
  title: string;
}) {
  return (
    <main className="admin-page">
      <header className="admin-topbar">
        <Link aria-label="EcoLink home" className="admin-brand" href="/">
          <EcoLinkMark compact />
        </Link>
        <div className="admin-topbar-context">
          <span className="status-dot" aria-hidden="true" />
          <div>
            <strong>Admin operations</strong>
            <small>Trust and data management</small>
          </div>
        </div>
        <button className="button button--secondary" type="button" onClick={onRefresh} disabled={isRefreshing}>
          <RefreshCw className={isRefreshing ? "spin" : undefined} size={16} aria-hidden="true" />
          {isRefreshing ? "Refreshing…" : "Refresh data"}
        </button>
      </header>

      <div className="admin-workspace">
        <aside className="admin-sidebar" aria-label="Admin navigation">
          <div className="admin-sidebar-heading">
            <span>Workspace</span>
            <strong>EcoLink admin</strong>
          </div>
          <nav>
            <Link aria-current={activeSection === "recycling" ? "page" : undefined} href="/admin/recycling">
              <Recycle size={17} aria-hidden="true" />
              <span><strong>Recycling</strong><small>Routes and submissions</small></span>
            </Link>
            <Link aria-current={activeSection === "reports" ? "page" : undefined} href="/admin/reports">
              <ClipboardCheck size={17} aria-hidden="true" />
              <span><strong>Reports</strong><small>Moderation queue</small></span>
            </Link>
          </nav>
          <Link className="admin-site-link" href="/">
            Citizen website <ExternalLink size={15} aria-hidden="true" />
          </Link>
        </aside>

        <section className="admin-main">
          <header className="admin-page-heading">
            <div>
              <p>Admin workspace</p>
              <h1>{title}</h1>
              <span>{description}</span>
            </div>
          </header>
          {children}
        </section>
      </div>
    </main>
  );
}

export function AdminMetric({ label, value, detail }: { label: string; value: number | string; detail: string }) {
  return (
    <div className="admin-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}
