import { Pulse, SkeletonShell } from "@/components/skeleton";

// Mirrors /proposals/[id]: "Status & links" rail plus the edit form.
export default function ProposalDetailLoading() {
  return (
    <SkeletonShell>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="gong-panel rounded-xl p-5 lg:col-span-1">
          <Pulse className="h-5 w-32 rounded bg-slate-200" />
          <div className="mt-4 space-y-4">
            <Pulse className="h-6 w-20 rounded-full bg-slate-100" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Pulse className="h-3 w-16 rounded bg-slate-200" />
                <Pulse className="h-5 w-40 rounded bg-slate-100" />
              </div>
            ))}
            <Pulse className="h-9 w-full rounded-md bg-slate-100" />
          </div>
        </div>

        <div className="gong-panel rounded-xl p-5 lg:col-span-2">
          <Pulse className="h-5 w-32 rounded bg-slate-200" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Pulse className="h-3 w-20 rounded bg-slate-200" />
                <Pulse className="h-9 w-full rounded-md bg-slate-100" />
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-2">
            <Pulse className="h-3 w-28 rounded bg-slate-200" />
            <Pulse className="h-64 w-full rounded-md bg-slate-100" />
          </div>
          <Pulse className="mt-4 h-9 w-32 rounded-md bg-slate-200" />
        </div>
      </div>
    </SkeletonShell>
  );
}
