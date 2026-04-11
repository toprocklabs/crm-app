import { SkeletonShell, SkeletonTable } from "@/components/skeleton";

export default function ContactsLoading() {
  return (
    <SkeletonShell>
      <div className="gong-panel rounded-xl p-5">
        <div className="h-5 w-24 rounded bg-slate-200" style={{ animation: "skeleton-pulse 1.5s ease-in-out infinite" }} />
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-16 rounded bg-slate-200" style={{ animation: "skeleton-pulse 1.5s ease-in-out infinite" }} />
              <div className="h-9 w-full rounded-md bg-slate-100" style={{ animation: "skeleton-pulse 1.5s ease-in-out infinite" }} />
            </div>
          ))}
        </div>
      </div>
      <SkeletonTable cols={6} rows={6} />
    </SkeletonShell>
  );
}
