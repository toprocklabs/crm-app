import type { AccountStage } from "@/lib/schema";

export const accountStageOptions: AccountStage[] = [
  "new_lead",
  "attempting_to_engage",
  "engaged",
  "in_pipeline",
  "customer",
  "closed_lost",
];

export function getAccountStageLabel(stage: AccountStage) {
  switch (stage) {
    case "new_lead":
      return "New Lead";
    case "attempting_to_engage":
      return "Attempting to Engage";
    case "engaged":
      return "Engaged";
    case "in_pipeline":
      return "In-Pipeline";
    case "customer":
      return "Customer";
    case "closed_lost":
      return "Closed Lost";
    default:
      return stage;
  }
}

export function getAccountStageTone(stage: AccountStage) {
  switch (stage) {
    case "new_lead":
      return "bg-slate-100 text-slate-700";
    case "attempting_to_engage":
      return "bg-amber-100 text-amber-800";
    case "engaged":
      return "bg-sky-100 text-sky-800";
    case "in_pipeline":
      return "bg-indigo-100 text-indigo-800";
    case "customer":
      return "bg-emerald-100 text-emerald-800";
    case "closed_lost":
      return "bg-rose-100 text-rose-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
}
