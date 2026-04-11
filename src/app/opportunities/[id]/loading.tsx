import {
  SkeletonDetailNav,
  SkeletonShell,
  SkeletonTwoCol,
} from "@/components/skeleton";

export default function OpportunityDetailLoading() {
  return (
    <SkeletonShell>
      <div className="gong-panel rounded-xl p-5">
        <div className="flex flex-wrap gap-2">
          <div className="h-6 w-16 rounded-full bg-slate-200" style={{ animation: "skeleton-pulse 1.5s ease-in-out infinite" }} />
          <div className="h-6 w-20 rounded-full bg-slate-100" style={{ animation: "skeleton-pulse 1.5s ease-in-out infinite" }} />
          <div className="h-6 w-24 rounded-full bg-slate-100" style={{ animation: "skeleton-pulse 1.5s ease-in-out infinite" }} />
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-slate-200 bg-slate-50/80 p-4">
              <div className="h-3 w-14 rounded bg-slate-200" style={{ animation: "skeleton-pulse 1.5s ease-in-out infinite" }} />
              <div className="mt-2 h-5 w-20 rounded bg-slate-100" style={{ animation: "skeleton-pulse 1.5s ease-in-out infinite" }} />
            </div>
          ))}
        </div>
      </div>
      <SkeletonDetailNav />
      <SkeletonTwoCol />
      <SkeletonTwoCol />
    </SkeletonShell>
  );
}
