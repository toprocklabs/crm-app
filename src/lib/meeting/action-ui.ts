import type { MeetingActionStatus } from "@/lib/schema";

export const meetingActionStatusOptions: MeetingActionStatus[] = ["todo", "doing", "done", "deferred"];

export const meetingActionStatusLabels: Record<MeetingActionStatus, string> = {
  todo: "To do",
  doing: "In progress",
  done: "Done",
  deferred: "Deferred",
};

export const meetingActionStatusPillClasses: Record<MeetingActionStatus, string> = {
  todo: "bg-amber-100 text-amber-800",
  doing: "bg-sky-100 text-sky-800",
  done: "bg-emerald-100 text-emerald-800",
  deferred: "bg-slate-100 text-slate-600",
};

// "Open" means it still needs doing. `deferred` is a decision, not a backlog
// item, so it stays out of the roll-up counts — matching how the notes used it
// ("E-learning deferred until scheduling is solid").
const OPEN_STATUSES = new Set<MeetingActionStatus>(["todo", "doing"]);

export function isOpenMeetingAction(status: MeetingActionStatus) {
  return OPEN_STATUSES.has(status);
}

// Owner is free text (the notes use 'Dev', 'Kate', 'Justin', 'Team', 'Both'),
// so the tone is derived rather than looked up: our side reads warm, the
// client's side reads cyan, anything unrecognised stays neutral.
const OURS = new Set(["dev", "team", "austin", "justin", "toprock", "both"]);

export function getMeetingOwnerTone(owner: string) {
  const key = owner.trim().toLowerCase();
  if (OURS.has(key)) {
    return "bg-orange-100 text-orange-800";
  }
  if (key === "client") {
    return "bg-cyan-100 text-cyan-800";
  }
  return "bg-slate-100 text-slate-700";
}

// Meeting dates are `date` columns — plain "YYYY-MM-DD" strings with no zone.
// Parsing them with `new Date(value)` would shift them a day backwards west of
// UTC, so pin them to local midnight the way formatDate does.
export function formatMeetingDate(value: string, style: "long" | "short" = "long") {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: style === "long" ? "long" : "short",
    day: "numeric",
    year: "numeric",
  });
}
