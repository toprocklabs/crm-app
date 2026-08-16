import { Pulse, SkeletonShell } from "@/components/skeleton";

export default function BrainLoading() {
  return (
    <SkeletonShell>
      <div className="gong-panel rounded-xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Pulse className="h-3 w-14 rounded bg-slate-200" />
            <Pulse className="mt-2 h-5 w-56 rounded bg-slate-200" />
          </div>
          <Pulse className="h-8 w-64 rounded-md bg-slate-100" />
        </div>
        <div className="mt-4 flex gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Pulse key={i} className="h-6 w-20 rounded-full bg-slate-100" />
          ))}
        </div>
        <div className="mt-5 space-y-2.5">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-slate-200 p-4">
              <div className="flex gap-2">
                <Pulse className="h-4 w-20 rounded bg-cyan-100" />
                <Pulse className="h-5 w-24 rounded-full bg-slate-100" />
              </div>
              <Pulse className="mt-2 h-4 w-1/2 rounded bg-slate-200" />
              <Pulse className="mt-2 h-3 w-1/3 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
    </SkeletonShell>
  );
}
