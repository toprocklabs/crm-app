import type { ProposalStatus } from "@/lib/schema";

export const proposalStatusOptions: ProposalStatus[] = [
  "draft",
  "sent",
  "viewed",
  "signed",
  "declined",
  "superseded",
];

export const proposalStatusLabels: Record<ProposalStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  viewed: "Viewed",
  signed: "Signed",
  declined: "Declined",
  superseded: "Superseded",
};

export const proposalStatusPillClasses: Record<ProposalStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  sent: "bg-sky-100 text-sky-800",
  viewed: "bg-cyan-100 text-cyan-800",
  signed: "bg-emerald-100 text-emerald-800",
  declined: "bg-red-100 text-red-800",
  superseded: "bg-amber-100 text-amber-800",
};
