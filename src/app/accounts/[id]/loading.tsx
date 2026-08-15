import { Pulse, SkeletonPanel, SkeletonShell } from "@/components/skeleton";

export default function AccountDetailLoading() {
  return (
    <SkeletonShell>
      {/* Header strip */}
      <div className="gong-panel rounded-xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap gap-2">
              <Pulse className="h-6 w-24 rounded-full bg-slate-200" />
              <Pulse className="h-6 w-20 rounded-full bg-slate-100" />
            </div>
            <Pulse className="mt-3 h-9 w-72 rounded bg-slate-200" />
            <div className="mt-4 flex flex-wrap gap-4">
              <Pulse className="h-4 w-36 rounded bg-slate-100" />
              <Pulse className="h-4 w-28 rounded bg-slate-100" />
            </div>
          </div>
          <div className="flex gap-2">
            <Pulse className="h-9 w-20 rounded-xl bg-slate-100" />
            <Pulse className="h-9 w-24 rounded-xl bg-slate-100" />
          </div>
        </div>
      </div>

      {/* Money */}
      <div className="gong-panel rounded-xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Pulse className="h-3 w-16 rounded bg-slate-200" />
            <Pulse className="mt-2 h-5 w-28 rounded bg-slate-200" />
          </div>
          <Pulse className="h-14 w-32 rounded-xl bg-emerald-50" />
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Pulse className="h-32 rounded-xl bg-slate-100" />
          <Pulse className="h-32 rounded-xl bg-slate-100" />
        </div>
      </div>

      {/* Meetings & notes */}
      <div className="gong-panel rounded-xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Pulse className="h-3 w-20 rounded bg-slate-200" />
            <Pulse className="mt-2 h-5 w-44 rounded bg-slate-200" />
          </div>
          <Pulse className="h-8 w-40 rounded-lg bg-slate-100" />
        </div>
        <div className="mt-5 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-slate-200 p-4">
              <Pulse className="h-3 w-24 rounded bg-cyan-100" />
              <Pulse className="mt-2 h-4 w-2/3 rounded bg-slate-200" />
              <Pulse className="mt-2 h-3 w-full rounded bg-slate-100" />
              <Pulse className="mt-1.5 h-3 w-4/5 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </div>

      <SkeletonPanel rows={4} />
    </SkeletonShell>
  );
}
