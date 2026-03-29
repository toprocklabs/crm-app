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
      <aside className="crm-sidebar rounded-3xl border border-white/45 bg-slate-950/90 p-4 text-slate-100 shadow-2xl shadow-cyan-950/30 md:sticky md:top-6 md:h-[calc(100vh-3rem)]">
        <div className="rounded-2xl border border-white/20 bg-white/5 p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-cyan-300">Toprock</p>
          <p className="mt-2 text-sm text-slate-300">Signed in as</p>
          <p className="text-lg font-semibold text-white">{username}</p>
        </div>

        <nav className="mt-4 grid gap-1.5">
          {links.map((link) => {
            const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                  isActive
                    ? "bg-cyan-400/20 text-white ring-1 ring-cyan-200/30"
                    : "text-slate-300 hover:bg-white/7 hover:text-white"
                }`}
              >
                <span
                  className={`inline-flex h-7 w-7 items-center justify-center rounded-lg text-[10px] font-semibold tracking-wide ${
                    isActive ? "bg-cyan-300 text-slate-900" : "bg-white/10 text-slate-200"
                  }`}
                >
                  {link.icon}
                </span>
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <form action={logout} className="mt-4">
          <button
            type="submit"
            className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/20 hover:text-white"
          >
            Log out
          </button>
        </form>
      </aside>

      <section className="min-w-0 space-y-4">
        <header className="rounded-3xl border border-white/65 bg-white/80 p-6 shadow-xl shadow-slate-900/8 backdrop-blur">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{title}</h1>
          {description ? <p className="mt-2 max-w-3xl text-sm text-slate-600">{description}</p> : null}
        </header>

        <div className="space-y-6">{children}</div>
      </section>
    </main>
  );
}

