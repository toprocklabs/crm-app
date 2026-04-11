import {
  SkeletonShell,
  SkeletonTable,
} from "@/components/skeleton";

export default function AccountsLoading() {
  return (
    <SkeletonShell>
      <div className="gong-panel rounded-xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="h-3 w-20 rounded bg-slate-200" style={{ animation: "skeleton-pulse 1.5s ease-in-out infinite" }} />
            <div className="mt-2 h-5 w-32 rounded bg-slate-200" style={{ animation: "skeleton-pulse 1.5s ease-in-out infinite" }} />
          </div>
          <div className="flex gap-2">
            <div className="h-6 w-20 rounded-full bg-slate-100" style={{ animation: "skeleton-pulse 1.5s ease-in-out infinite" }} />
            <div className="h-6 w-24 rounded-full bg-rose-100" style={{ animation: "skeleton-pulse 1.5s ease-in-out infinite" }} />
          </div>
        </div>
      </div>
      <SkeletonTable cols={7} rows={6} />
      <div className="gong-panel rounded-xl p-5">
        <div className="border-b border-slate-200 pb-4">
          <div className="h-3 w-14 rounded bg-slate-200" style={{ animation: "skeleton-pulse 1.5s ease-in-out infinite" }} />
          <div className="mt-2 h-5 w-28 rounded bg-slate-200" style={{ animation: "skeleton-pulse 1.5s ease-in-out infinite" }} />
        </div>
      </div>
    </SkeletonShell>
  );
}
