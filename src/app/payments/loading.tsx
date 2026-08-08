import { Pulse, SkeletonKPI, SkeletonShell, SkeletonTable } from "@/components/skeleton";

// Mirrors /payments: five KPIs, the unassigned-payments callout, then the ledger.
export default function PaymentsLoading() {
  return (
    <SkeletonShell>
      <SkeletonKPI count={5} />

      {/* Keeps the amber left border so the unassigned callout doesn't pop in. */}
      <div className="gong-panel rounded-xl border-l-4 border-l-amber-400 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Pulse className="h-3 w-24 rounded bg-slate-200" />
            <Pulse className="mt-2 h-5 w-48 rounded bg-slate-200" />
          </div>
          <Pulse className="h-6 w-16 rounded-full bg-amber-100" />
        </div>
        <ul className="mt-4 space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <li key={i} className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <Pulse className="h-4 w-44 rounded bg-slate-200" />
                  <Pulse className="h-3 w-60 rounded bg-slate-100" />
                </div>
                <Pulse className="h-9 w-44 rounded-md bg-slate-100" />
              </div>
            </li>
          ))}
        </ul>
      </div>

      <SkeletonTable cols={6} rows={8} />
    </SkeletonShell>
  );
}
