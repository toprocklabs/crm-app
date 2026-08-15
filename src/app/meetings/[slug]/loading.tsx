import { Pulse, SkeletonPanel, SkeletonShell } from "@/components/skeleton";

export default function MeetingDetailLoading() {
  return (
    <SkeletonShell>
      <div className="gong-panel rounded-xl p-6">
        <Pulse className="h-4 w-40 rounded bg-slate-100" />
        <Pulse className="mt-3 h-8 w-2/3 rounded bg-slate-200" />
        <div className="mt-4 flex flex-wrap gap-3">
          <Pulse className="h-5 w-28 rounded bg-slate-100" />
          <Pulse className="h-5 w-40 rounded bg-slate-100" />
          <Pulse className="h-5 w-32 rounded bg-slate-100" />
        </div>
        <Pulse className="mt-5 h-24 w-full rounded-lg bg-cyan-50" />
      </div>

      <div className="gong-panel rounded-xl p-6">
        {Array.from({ length: 5 }).map((_, section) => (
          <div key={section} className="mb-7">
            <Pulse className="h-5 w-56 rounded bg-slate-200" />
            <div className="mt-3 space-y-2">
              {Array.from({ length: 3 }).map((_, line) => (
                <Pulse
                  key={line}
                  className="h-4 rounded bg-slate-100"
                  style={{ width: `${92 - line * 11}%` }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <SkeletonPanel rows={5} />
    </SkeletonShell>
  );
}
