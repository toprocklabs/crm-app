import {
  SkeletonDetailHero,
  SkeletonDetailNav,
  SkeletonShell,
  SkeletonTwoCol,
} from "@/components/skeleton";

export default function AccountDetailLoading() {
  return (
    <SkeletonShell>
      <SkeletonDetailHero />
      <SkeletonDetailNav />
      <div className="gong-panel rounded-xl p-5">
        <div className="h-5 w-20 rounded bg-slate-200" style={{ animation: "skeleton-pulse 1.5s ease-in-out infinite" }} />
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-16 rounded bg-slate-200" style={{ animation: "skeleton-pulse 1.5s ease-in-out infinite" }} />
              <div className="h-9 w-full rounded-md bg-slate-100" style={{ animation: "skeleton-pulse 1.5s ease-in-out infinite" }} />
            </div>
          ))}
        </div>
      </div>
      <SkeletonTwoCol />
      <SkeletonTwoCol />
    </SkeletonShell>
  );
}
