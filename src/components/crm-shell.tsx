"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useState } from "react";
import { logout } from "@/app/login/actions";

// Desktop sidebar collapse is a per-browser preference, not per-session state.
const sidebarStorageKey = "crm.sidebar-collapsed";

const links = [
  {
    href: "/",
    label: "Dashboard",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: "/accounts",
    label: "Accounts",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    href: "/contacts",
    label: "Contacts",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    href: "/opportunities",
    label: "Opportunities",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="20" x2="12" y2="10" />
        <line x1="18" y1="20" x2="18" y2="4" />
        <line x1="6" y1="20" x2="6" y2="16" />
      </svg>
    ),
  },
  {
    href: "/proposals",
    label: "Proposals",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <path d="M9 15l2 2 4-4" />
      </svg>
    ),
  },
  {
    href: "/payments",
    label: "Payments",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
      </svg>
    ),
  },
  {
    href: "/tasks",
    label: "Tasks",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    href: "/activities",
    label: "Activities",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    href: "/inbox",
    label: "Inbox",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-6l-2 3h-4l-2-3H2" />
        <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
      </svg>
    ),
  },
  {
    href: "/map",
    label: "Map",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
        <line x1="8" y1="2" x2="8" y2="18" />
        <line x1="16" y1="6" x2="16" y2="22" />
      </svg>
    ),
  },
];

const headerActions = [
  {
    href: "/accounts#add-account",
    label: "Add account",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </svg>
    ),
    primary: true,
  },
  {
    href: "/opportunities#add-opportunity",
    label: "Add opportunity",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </svg>
    ),
    primary: false,
  },
  {
    href: "/activities#log-activity",
    label: "Log activity",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    ),
    primary: false,
  },
];

export function CrmShell({
  username,
  title,
  description,
  children,
}: {
  username: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const close = useCallback(() => setMenuOpen(false), []);

  // Collapse is driven by a `data-sidebar` attribute on <html> (seeded by an
  // inline script in the root layout) rather than React state: it survives
  // navigation, costs no re-render, and can't produce a hydration mismatch.
  const toggleCollapsed = useCallback(() => {
    const root = document.documentElement;
    const next = root.dataset.sidebar === "collapsed" ? "expanded" : "collapsed";
    root.dataset.sidebar = next;
    try {
      window.localStorage.setItem(sidebarStorageKey, next === "collapsed" ? "1" : "0");
    } catch {
      // Private-mode storage failures shouldn't break the toggle.
    }
  }, []);

  return (
    <main className="crm-shell min-h-screen bg-[var(--app-bg)] text-slate-950">
      <div className="crm-shell-grid grid min-h-screen w-full gap-0 md:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="crm-sidebar border-r border-slate-200/95 bg-[var(--sidebar-bg)] px-3 py-4 text-slate-100 md:sticky md:top-0 md:h-screen">
          <div className="crm-sidebar-head flex items-center justify-between gap-2 px-2">
            <div className="flex items-center gap-2.5">
              <Image src="/toprock_logo_black.png" alt="Toprock" width={36} height={32} className="h-8 w-auto rounded-lg" />
              <p className="crm-sidebar-label text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200">Toprock</p>
            </div>
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label="Toggle navigation width"
              title="Toggle navigation width"
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-white/10 hover:text-white"
            >
              <svg className="crm-sidebar-caret" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          </div>

          <div className="crm-sidebar-meta">
            <div className="mt-4 px-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{username}</p>
            </div>

            <div className="mt-5 px-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Workspace</p>
            </div>
          </div>

          <nav className="crm-sidebar-nav mt-2 grid gap-0.5">
            {links.map((link) => {
              const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={close}
                  title={link.label}
                  className={`crm-sidebar-link group flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm transition ${
                    isActive
                      ? "bg-white/12 text-white"
                      : "text-slate-400 hover:bg-white/6 hover:text-white"
                  }`}
                >
                  <span
                    className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                      isActive ? "text-cyan-300" : "text-slate-500 group-hover:text-slate-300"
                    }`}
                  >
                    {link.icon}
                  </span>
                  <span className={`crm-sidebar-label font-medium ${isActive ? "text-white" : ""}`}>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          <form action={logout} className="crm-sidebar-logout mt-6 px-1">
            <button
              type="submit"
              title="Log out"
              className="flex w-full items-center justify-center rounded-lg border border-white/8 bg-white/4 px-3 py-2 text-sm text-slate-400 transition hover:bg-white/8 hover:text-white"
            >
              <span className="crm-sidebar-label">Log out</span>
              <svg className="crm-sidebar-logout-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </form>
        </aside>

        <section className="min-w-0 px-4 py-4 md:px-5 md:py-5">
          <header className="rounded-xl border border-slate-200/95 bg-white px-5 py-4 shadow-sm md:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMenuOpen(true)}
                  className="-ml-1 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 md:hidden"
                  aria-label="Open navigation"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </svg>
                </button>
                <div>
                  <h1 className="text-xl font-semibold tracking-tight text-slate-950">{title}</h1>
                  {description ? <p className="mt-1 max-w-3xl text-sm text-slate-500">{description}</p> : null}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {headerActions.map((action) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    className={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition ${
                      action.primary
                        ? "bg-slate-950 text-white shadow-sm hover:bg-slate-800"
                        : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <span className={action.primary ? "text-cyan-200" : "text-slate-500"}>{action.icon}</span>
                    {action.label}
                  </Link>
                ))}
              </div>
            </div>
          </header>

          <div className="mt-5 space-y-6">{children}</div>
        </section>
      </div>

      {menuOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-slate-950/60" onClick={close} />
          <div className="absolute inset-y-0 left-0 w-72 overflow-y-auto bg-[var(--sidebar-bg)] px-3 py-4 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2.5">
                <Image src="/toprock_logo_black.png" alt="Toprock" width={36} height={32} className="h-8 w-auto rounded-lg" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200">Toprock</p>
              </div>
              <button
                type="button"
                onClick={close}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/8 hover:text-white"
                aria-label="Close navigation"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="mt-4 px-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{username}</p>
            </div>

            <div className="mt-5 px-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Workspace</p>
            </div>

            <nav className="mt-2 grid gap-0.5">
              {links.map((link) => {
                const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={close}
                    className={`group flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm transition ${
                      isActive
                        ? "bg-white/12 text-white"
                        : "text-slate-400 hover:bg-white/6 hover:text-white"
                    }`}
                  >
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-md ${
                        isActive ? "text-cyan-300" : "text-slate-500 group-hover:text-slate-300"
                      }`}
                    >
                      {link.icon}
                    </span>
                    <span className={`font-medium ${isActive ? "text-white" : ""}`}>{link.label}</span>
                  </Link>
                );
              })}
            </nav>

            <form action={logout} className="mt-6 px-1">
              <button
                type="submit"
                className="w-full rounded-lg border border-white/8 bg-white/4 px-3 py-2 text-sm text-slate-400 transition hover:bg-white/8 hover:text-white"
              >
                Log out
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}
