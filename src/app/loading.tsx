import {
  SkeletonKPI,
  SkeletonPanel,
  SkeletonShell,
  SkeletonTimeline,
} from "@/components/skeleton";

export default function DashboardLoading() {
  return (
    <SkeletonShell>
      <SkeletonKPI />
      <div className="grid gap-6 lg:grid-cols-2">
        <SkeletonPanel rows={4} />
        <SkeletonPanel rows={4} />
      </div>
      <SkeletonTimeline />
    </SkeletonShell>
  );
}
