import Link from "next/link";
import { logout } from "@/app/login/actions";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/accounts", label: "Accounts" },
  { href: "/contacts", label: "Contacts" },
  { href: "/opportunities", label: "Opportunities" },
  { href: "/tasks", label: "Tasks" },
  { href: "/activities", label: "Activities" },
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
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 bg-slate-50 px-6 py-10">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Startup CRM</p>
            <span className="text-sm text-slate-600">Signed in as {username}</span>
          </div>
          <form action={logout}>
            <button type="submit" className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700">
              Log out
            </button>
          </form>
        </div>

        <nav className="flex flex-wrap items-center gap-2">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700">
              {link.label}
            </Link>
          ))}
        </nav>

        <div>
          <h1 className="text-3xl font-semibold text-slate-900">{title}</h1>
          {description ? <p className="mt-1 max-w-2xl text-slate-600">{description}</p> : null}
        </div>
      </header>

      {children}
    </main>
  );
}
