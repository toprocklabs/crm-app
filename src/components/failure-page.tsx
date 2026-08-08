import Link from "next/link";

// Shared chrome for the three failure surfaces: error.tsx, global-error.tsx and
// not-found.tsx. Deliberately built from plain Tailwind literals and no client
// hooks — a boundary that itself depends on app state is a boundary that fails
// exactly when it is needed. It intentionally mirrors the login card rather
// than CrmShell, because the sidebar needs a session these pages may not have.
export function FailurePage({
  kicker,
  title,
  message,
  detail,
  action,
}: {
  kicker: string;
  title: string;
  message: string;
  /** Technical context — a digest or error name. Shown small and monospaced. */
  detail?: string | null;
  action?: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-6 py-10">
      <div className="rounded-xl border border-slate-200/95 bg-white p-8 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{kicker}</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">{message}</p>

        {detail ? (
          <p className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs break-all text-slate-500">
            {detail}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {action}
          <Link
            href="/"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
