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
    <main className="crm-shell mx-auto grid min-h-screen w-full max-w-[1400px] gap-6 px-4 py-5 md:grid-cols-[250px_minmax(0,1fr)] md:px-6 md:py-7">
      <aside className="crm-sidebar rounded-3xl border border-white/40 bg-[linear-gradient(180deg,rgba(2,6,23,0.96),rgba(15,23,42,0.94))] p-4 text-slate-100 shadow-[0_30px_60px_-30px_rgba(8,47,73,0.7)] md:sticky md:top-6 md:h-[calc(100vh-3rem)]">
        <div className="rounded-2xl border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-teal-200">Toprock CRM</p>
          <p className="mt-3 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Workspace</p>
          <p className="mt-1 text-lg font-semibold text-white">{username}</p>
          <p className="mt-2 text-sm text-slate-400">Pipeline, tasks, and account context in one place.</p>
        </div>

        <div className="mt-5">
          <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Navigate</p>
        </div>

        <nav className="mt-3 grid gap-1.5">
          {links.map((link) => {
            const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm transition ${
                  isActive
                    ? "bg-[linear-gradient(135deg,rgba(20,184,166,0.18),rgba(14,165,233,0.12))] text-white ring-1 ring-teal-200/20"
                    : "text-slate-300 hover:bg-white/6 hover:text-white"
                }`}
              >
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-xl text-[10px] font-semibold tracking-[0.12em] ${
                    isActive ? "bg-teal-200 text-slate-900" : "bg-white/8 text-slate-200"
                  }`}
                >
                  {link.icon}
                </span>
                <span className="font-medium">{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <form action={logout} className="mt-4">
          <button
            type="submit"
            className="w-full rounded-2xl border border-white/14 bg-white/8 px-3 py-2.5 text-sm text-slate-200 transition hover:bg-white/14 hover:text-white"
          >
            Log out
          </button>
        </form>
      </aside>

      <section className="min-w-0 space-y-4">
        <header className="rounded-3xl border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.86),rgba(255,255,255,0.78))] p-6 shadow-[0_24px_50px_-32px_rgba(15,23,42,0.32)] backdrop-blur">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-teal-700">Toprock CRM</p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{title}</h1>
          {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p> : null}
        </header>

        <div className="space-y-6">{children}</div>
      </section>
    </main>
  );
}
