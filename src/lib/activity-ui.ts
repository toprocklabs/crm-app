import type { ActivityType } from "@/lib/schema";

export const activityTypeOptions: ActivityType[] = [
  "note",
  "call",
  "meeting",
  "email",
  "linkedin",
  "task",
];

export function getActivityMeta(type: ActivityType) {
  switch (type) {
    case "call":
      return {
        icon: "CL",
        label: "Call",
        tone: "bg-emerald-100 text-emerald-800",
      };
    case "meeting":
      return {
        icon: "MT",
        label: "Meeting",
        tone: "bg-sky-100 text-sky-800",
      };
    case "email":
      return {
        icon: "EM",
        label: "Email",
        tone: "bg-violet-100 text-violet-800",
      };
    case "linkedin":
      return {
        icon: "LI",
        label: "LinkedIn",
        tone: "bg-cyan-100 text-cyan-800",
      };
    case "task":
      return {
        icon: "TS",
        label: "Task",
        tone: "bg-amber-100 text-amber-800",
      };
    case "note":
    default:
      return {
        icon: "NT",
        label: "Note",
        tone: "bg-slate-100 text-slate-700",
      };
  }
}
