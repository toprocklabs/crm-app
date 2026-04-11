import { SkeletonPanel, SkeletonShell } from "@/components/skeleton";

export default function TasksLoading() {
  return (
    <SkeletonShell>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="gong-panel rounded-xl p-4 lg:col-span-1">
          <div className="h-5 w-20 rounded bg-slate-200" style={{ animation: "skeleton-pulse 1.5s ease-in-out infinite" }} />
          <div className="mt-3 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-16 rounded bg-slate-200" style={{ animation: "skeleton-pulse 1.5s ease-in-out infinite" }} />
                <div className="h-9 w-full rounded-md bg-slate-100" style={{ animation: "skeleton-pulse 1.5s ease-in-out infinite" }} />
              </div>
            ))}
          </div>
        </div>
        <SkeletonPanel rows={5} />
      </div>
    </SkeletonShell>
  );
}
