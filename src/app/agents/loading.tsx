import { Pulse, SkeletonShell } from "@/components/skeleton";

export default function AgentsLoading() {
  return (
    <SkeletonShell>
      <div className="gong-panel rounded-xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Pulse className="h-3 w-12 rounded bg-slate-200" />
            <Pulse className="mt-2 h-5 w-40 rounded bg-slate-200" />
          </div>
          <Pulse className="h-12 w-32 rounded-xl bg-slate-100" />
        </div>
        <div className="mt-5 space-y-2">
          <Pulse className="h-8 w-full rounded bg-slate-100" />
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Pulse className="h-6 w-40 rounded bg-slate-100" />
              <Pulse className="h-6 w-20 rounded-full bg-emerald-100" />
              <Pulse className="h-6 flex-1 rounded bg-slate-100" />
              <Pulse className="h-6 w-16 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
    </SkeletonShell>
  );
}
