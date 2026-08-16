import { Pulse, SkeletonShell } from "@/components/skeleton";

export default function BrainDocumentLoading() {
  return (
    <SkeletonShell>
      <div className="space-y-4">
        <div className="gong-panel rounded-xl p-5">
          <div className="flex gap-2">
            <Pulse className="h-5 w-16 rounded bg-slate-100" />
            <Pulse className="h-5 w-24 rounded-full bg-slate-100" />
            <Pulse className="h-5 w-28 rounded-full bg-emerald-100" />
          </div>
          <div className="mt-4 flex gap-6 border-t border-slate-200 pt-3">
            <Pulse className="h-3 w-28 rounded bg-slate-100" />
            <Pulse className="h-3 w-20 rounded bg-slate-100" />
          </div>
        </div>
        <div className="gong-panel rounded-xl p-5">
          <Pulse className="h-5 w-40 rounded bg-slate-200" />
          {Array.from({ length: 8 }).map((_, i) => (
            <Pulse key={i} className="mt-3 h-3 w-full rounded bg-slate-100" />
          ))}
        </div>
        <div className="gong-panel rounded-xl p-5">
          <Pulse className="h-3 w-32 rounded bg-slate-200" />
          <div className="mt-3 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Pulse key={i} className="h-4 w-1/2 rounded bg-slate-100" />
            ))}
          </div>
        </div>
      </div>
    </SkeletonShell>
  );
}
