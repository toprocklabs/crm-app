import { SkeletonShell, SkeletonTwoCol } from "@/components/skeleton";

export default function ContactDetailLoading() {
  return (
    <SkeletonShell>
      <div className="gong-panel rounded-xl p-5">
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-12 rounded bg-slate-200" style={{ animation: "skeleton-pulse 1.5s ease-in-out infinite" }} />
              <div className="h-8 w-full rounded bg-slate-100" style={{ animation: "skeleton-pulse 1.5s ease-in-out infinite" }} />
            </div>
          ))}
        </div>
      </div>
      <SkeletonTwoCol />
    </SkeletonShell>
  );
}
