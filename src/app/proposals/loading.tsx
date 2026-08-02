import { Pulse, SkeletonShell } from "@/components/skeleton";

// Mirrors /proposals: create panel on the left, proposals table on the right.
export default function ProposalsLoading() {
  return (
    <SkeletonShell>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="gong-panel rounded-xl p-5 lg:col-span-1">
          <Pulse className="h-5 w-32 rounded bg-slate-200" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Pulse className="h-3 w-20 rounded bg-slate-200" />
                <Pulse className="h-9 w-full rounded-md bg-slate-100" />
              </div>
            ))}
            <Pulse className="mt-2 h-9 w-32 rounded-md bg-slate-200" />
          </div>
        </div>

        <div className="gong-panel rounded-xl p-5 lg:col-span-2">
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
            <Pulse className="h-5 w-32 rounded bg-slate-200" />
            <Pulse className="h-6 w-20 rounded-full bg-slate-100" />
          </div>
          <ul className="mt-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <Pulse className="h-4 w-52 rounded bg-slate-200" />
                    <Pulse className="h-3 w-36 rounded bg-slate-100" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Pulse className="h-6 w-16 rounded-full bg-slate-100" />
                    <Pulse className="h-6 w-14 rounded bg-slate-100" />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </SkeletonShell>
  );
}
