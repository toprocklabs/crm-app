import { Pulse, SkeletonShell } from "@/components/skeleton";

export default function NewBrainDocumentLoading() {
  return (
    <SkeletonShell>
      <div className="gong-panel rounded-xl p-5">
        <div className="flex gap-2">
          <Pulse className="h-5 w-16 rounded bg-slate-100" />
          <Pulse className="h-6 w-40 rounded-full bg-cyan-100" />
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Pulse className="h-16 rounded-md bg-slate-100" />
          <Pulse className="h-16 rounded-md bg-slate-100" />
          <Pulse className="h-16 rounded-md bg-slate-100 sm:col-span-2" />
          <Pulse className="h-16 rounded-md bg-slate-100 sm:col-span-2" />
          <Pulse className="h-64 rounded-lg bg-slate-100 sm:col-span-2" />
        </div>
      </div>
    </SkeletonShell>
  );
}
