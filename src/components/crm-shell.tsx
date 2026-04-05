"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/login/actions";

const links = [
  { href: "/", label: "Dashboard", icon: "DS" },
  { href: "/accounts", label: "Accounts", icon: "AC" },
  { href: "/contacts", label: "Contacts", icon: "CT" },
  { href: "/opportunities", label: "Opportunities", icon: "OP" },
  { href: "/tasks", label: "Tasks", icon: "TS" },
  { href: "/activities", label: "Activities", icon: "AT" },
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
      <div className="mx-auto grid min-h-screen w-full max-w-[1500px] gap-0 md:grid-cols-[264px_minmax(0,1fr)]">
        <aside className="crm-sidebar border-r border-[var(--panel-border)] bg-[var(--sidebar-bg)] px-4 py-5 text-slate-100 md:sticky md:top-0 md:h-screen">
          <div className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-4 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.9)]">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-300 text-sm font-bold tracking-[0.2em] text-slate-950">
                TR
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-cyan-200">Toprock CRM</p>
                <p className="mt-1 text-sm text-slate-300">Revenue workspace</p>
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-white/8 bg-white/5 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Operator</p>
              <p className="mt-1 text-base font-semibold text-white">{username}</p>
            </div>
          </div>

          <div className="mt-6">
            <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Workspace</p>
          </div>

          <nav className="mt-3 grid gap-1.5">
            {links.map((link) => {
              const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm transition ${
                    isActive
                      ? "bg-white text-slate-950 shadow-[0_20px_32px_-24px_rgba(14,165,233,0.85)]"
                      : "text-slate-300 hover:bg-white/6 hover:text-white"
                  }`}
                >
                  <span
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-xl text-[10px] font-semibold tracking-[0.12em] ${
                      isActive ? "bg-slate-950 text-cyan-300" : "bg-white/8 text-slate-200 group-hover:bg-white/12"
                    }`}
                  >
                    {link.icon}
                  </span>
                  <span className="font-medium">{link.label}</span>
                </Link>
              );
            })}
          </nav>

          <form action={logout} className="mt-6">
            <button
              type="submit"
              className="w-full rounded-2xl border border-white/10 bg-white/6 px-3 py-2.5 text-sm text-slate-200 transition hover:bg-white/10 hover:text-white"
            >
              Log out
            </button>
          </form>
        </aside>

        <section className="min-w-0 px-4 py-4 md:px-6 md:py-5">
          <header className="rounded-[2rem] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-5 py-5 shadow-[0_24px_50px_-42px_rgba(15,23,42,0.35)] md:px-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-700">Revenue Command</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{title}</h1>
            {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p> : null}
          </header>

          <div className="mt-5 space-y-6">{children}</div>
        </section>
      </div>
    </main>
  );
}
