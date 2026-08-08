import { Pulse, SkeletonShell } from "@/components/skeleton";

// Mirrors /inbox: a single ranked-prospect queue, each row score + actions.
export default function InboxLoading() {
  return (
    <SkeletonShell>
      <div className="gong-panel rounded-xl p-5">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <Pulse className="h-5 w-40 rounded bg-slate-200" />
          <Pulse className="h-6 w-20 rounded-full bg-cyan-100" />
        </div>
        <ul className="mt-4 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex items-start gap-4">
                <Pulse className="h-11 w-11 shrink-0 rounded-lg bg-slate-200" />
                <div className="flex-1 space-y-2">
                  <Pulse className="h-4 w-48 rounded bg-slate-200" />
                  <Pulse className="h-3 w-64 rounded bg-slate-100" />
                  <div className="flex gap-2 pt-1">
                    <Pulse className="h-5 w-16 rounded-full bg-slate-100" />
                    <Pulse className="h-5 w-20 rounded-full bg-slate-100" />
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Pulse className="h-8 w-20 rounded-md bg-slate-100" />
                  <Pulse className="h-8 w-20 rounded-md bg-slate-100" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </SkeletonShell>
  );
}
