import type { DealStage } from "@/lib/schema";

export const dealStageOptions: DealStage[] = [
  "lead",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
];

export function getDealStageLabel(stage: DealStage) {
  switch (stage) {
    case "lead":
      return "Lead";
    case "qualified":
      return "Qualified";
    case "proposal":
      return "Proposal";
    case "negotiation":
      return "Negotiation";
    case "won":
      return "Won";
    case "lost":
      return "Lost";
    default:
      return stage;
  }
}

export function getDealStageTone(stage: DealStage) {
  switch (stage) {
    case "lead":
      return "bg-slate-100 text-slate-700";
    case "qualified":
      return "bg-cyan-100 text-cyan-800";
    case "proposal":
      return "bg-sky-100 text-sky-800";
    case "negotiation":
      return "bg-amber-100 text-amber-800";
    case "won":
      return "bg-emerald-100 text-emerald-800";
    case "lost":
      return "bg-rose-100 text-rose-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
}
