function Pulse({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={className}
      style={{ animation: "skeleton-pulse 1.5s ease-in-out infinite", ...style }}
    />
  );
}

export function SkeletonShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="crm-shell flex min-h-screen">
      <aside className="crm-sidebar hidden w-60 shrink-0 md:block" />
      <div className="flex-1 bg-[var(--app-bg)] p-5 md:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="gong-panel rounded-xl px-5 py-4 md:px-6">
            <Pulse className="h-6 w-32 rounded bg-slate-200" />
            <Pulse className="mt-2 h-4 w-64 rounded bg-slate-100" />
          </div>
          <div className="mt-5 space-y-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function SkeletonKPI({ count = 5 }: { count?: number }) {
  return (
    <div className={`grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-${Math.min(count, 5)}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="gong-panel gong-kpi rounded-lg p-5">
          <Pulse className="h-3 w-16 rounded bg-slate-200" />
          <Pulse className="mt-3 h-9 w-20 rounded bg-slate-200" />
          <Pulse className="mt-2 h-4 w-28 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonPanel({ rows = 4 }: { rows?: number }) {
  return (
    <div className="gong-panel rounded-xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Pulse className="h-3 w-20 rounded bg-slate-200" />
          <Pulse className="mt-2 h-5 w-48 rounded bg-slate-200" />
        </div>
        <Pulse className="h-6 w-16 rounded-full bg-slate-100" />
      </div>
      <ul className="mt-4 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <li key={i} className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <Pulse className="h-4 w-40 rounded bg-slate-200" />
                <Pulse className="h-3 w-56 rounded bg-slate-100" />
              </div>
              <Pulse className="h-4 w-20 rounded bg-slate-100" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SkeletonTable({ cols = 7, rows = 5 }: { cols?: number; rows?: number }) {
  return (
    <div className="gong-panel rounded-xl p-5">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <Pulse className="h-3 w-20 rounded bg-slate-200" />
          <Pulse className="mt-2 h-5 w-40 rounded bg-slate-200" />
        </div>
        <div className="flex items-center gap-3">
          <Pulse className="h-9 w-48 rounded-md bg-slate-100" />
          <Pulse className="h-9 w-28 rounded-md bg-slate-100" />
        </div>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="border-b border-slate-200 text-left">
            <tr>
              {Array.from({ length: cols }).map((_, i) => (
                <th key={i} className="px-3 py-2">
                  <Pulse className="h-3 w-16 rounded bg-slate-200" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, r) => (
              <tr key={r} className="border-b border-slate-100">
                {Array.from({ length: cols }).map((_, c) => (
                  <td key={c} className="px-3 py-3">
                    <Pulse className="h-4 rounded bg-slate-100" style={{ width: `${50 + ((c + r) % 3) * 20}px` }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SkeletonDetailHero() {
  return (
    <div className="gong-panel rounded-xl p-6">
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.85fr]">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Pulse className="h-6 w-20 rounded-full bg-slate-200" />
            <Pulse className="h-6 w-24 rounded-full bg-slate-100" />
            <Pulse className="h-6 w-28 rounded-full bg-slate-100" />
          </div>
          <Pulse className="h-8 w-64 rounded bg-slate-200" />
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                <Pulse className="h-3 w-12 rounded bg-slate-200" />
                <Pulse className="mt-2 h-5 w-20 rounded bg-slate-100" />
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="gong-panel gong-kpi rounded-lg p-4">
              <Pulse className="h-3 w-16 rounded bg-slate-200" />
              <Pulse className="mt-2 h-6 w-20 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SkeletonDetailNav() {
  return (
    <div className="sticky top-4 z-10 flex items-center gap-2 rounded-xl border border-white/80 bg-white/90 p-2 shadow-lg shadow-slate-900/5 backdrop-blur">
      {Array.from({ length: 5 }).map((_, i) => (
        <Pulse key={i} className="h-8 w-20 rounded-lg bg-slate-100" />
      ))}
    </div>
  );
}

export function SkeletonTwoCol() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="gong-panel rounded-xl p-5">
        <Pulse className="h-5 w-24 rounded bg-slate-200" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-slate-200 p-3">
              <div className="space-y-2">
                <Pulse className="h-4 w-32 rounded bg-slate-200" />
                <Pulse className="h-3 w-48 rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="gong-panel rounded-xl p-5">
        <Pulse className="h-5 w-28 rounded bg-slate-200" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-slate-200 p-3">
              <div className="space-y-2">
                <Pulse className="h-4 w-36 rounded bg-slate-200" />
                <Pulse className="h-3 w-52 rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SkeletonTimeline() {
  return (
    <div className="gong-panel rounded-xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Pulse className="h-3 w-14 rounded bg-slate-200" />
          <Pulse className="mt-2 h-5 w-44 rounded bg-slate-200" />
        </div>
        <Pulse className="h-6 w-16 rounded-full bg-cyan-100" />
      </div>
      <div className="mt-4 border-l border-slate-200/90 pl-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="relative mb-4 rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex items-start gap-3">
              <Pulse className="h-11 w-11 shrink-0 rounded-lg bg-slate-200" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Pulse className="h-5 w-16 rounded-full bg-slate-100" />
                  <Pulse className="h-4 w-20 rounded bg-slate-100" />
                </div>
                <Pulse className="h-4 w-full rounded bg-slate-100" />
                <Pulse className="h-3 w-24 rounded bg-slate-100" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
