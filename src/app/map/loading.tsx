import { Pulse, SkeletonShell } from "@/components/skeleton";

// Mirrors /map: one thin panel wrapping the Leaflet canvas. The tall block
// reserves the canvas height so the shell doesn't jump when the map mounts.
export default function MapLoading() {
  return (
    <SkeletonShell>
      <div className="gong-panel rounded-xl p-3">
        <div className="flex items-center justify-between gap-4 px-2 py-1">
          <Pulse className="h-5 w-36 rounded bg-slate-200" />
          <div className="flex gap-2">
            <Pulse className="h-6 w-20 rounded-full bg-slate-100" />
            <Pulse className="h-6 w-24 rounded-full bg-slate-100" />
          </div>
        </div>
        <Pulse className="mt-3 h-[70vh] w-full rounded-lg bg-slate-100" />
      </div>
    </SkeletonShell>
  );
}
