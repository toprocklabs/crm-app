"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/login/actions";

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

  return (
    <main className="crm-shell min-h-screen bg-[var(--app-bg)] text-slate-950">
      <div className="mx-auto grid min-h-screen w-full max-w-[1500px] gap-0 md:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="crm-sidebar border-r border-slate-200/95 bg-[var(--sidebar-bg)] px-3 py-4 text-slate-100 md:sticky md:top-0 md:h-screen">
          <div className="flex items-center gap-2.5 px-2">
            <img src="/toprock_logo_black.png" alt="Toprock" className="h-8 w-auto rounded-lg" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-200">Toprock</p>
            </div>
          </div>

          <div className="mt-4 px-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{username}</p>
          </div>

          <div className="mt-5 px-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Workspace</p>
          </div>

          <nav className="mt-2 grid gap-0.5">
            {links.map((link) => {
              const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
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
        </aside>

        <section className="min-w-0 px-4 py-4 md:px-6 md:py-5">
          <header className="rounded-xl border border-slate-200/95 bg-white px-5 py-4 shadow-sm md:px-6">
            <h1 className="text-xl font-semibold tracking-tight text-slate-950">{title}</h1>
            {description ? <p className="mt-1 max-w-3xl text-sm text-slate-500">{description}</p> : null}
          </header>

          <div className="mt-5 space-y-6">{children}</div>
        </section>
      </div>
    </main>
  );
}
