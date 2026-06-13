import type { EdgeType } from "@/lib/schema";

export const edgeTypeOptions: EdgeType[] = [
  "referred_by",
  "colocated_with",
  "introduced_by",
  "knows",
  "vendor_of",
  "customer_of",
  "partner_of",
  "competitor_of",
];

export function getEdgeTypeLabel(edge: EdgeType) {
  switch (edge) {
    case "referred_by":
      return "Referred by";
    case "colocated_with":
      return "Colocated with";
    case "introduced_by":
      return "Introduced by";
    case "knows":
      return "Knows";
    case "vendor_of":
      return "Vendor of";
    case "customer_of":
      return "Customer of";
    case "partner_of":
      return "Partner of";
    case "competitor_of":
      return "Competitor of";
    default:
      return edge;
  }
}

export function getEdgeTypeTone(edge: EdgeType) {
  switch (edge) {
    case "referred_by":
    case "introduced_by":
      return "bg-emerald-100 text-emerald-800";
    case "colocated_with":
      return "bg-violet-100 text-violet-800";
    case "knows":
      return "bg-sky-100 text-sky-800";
    case "vendor_of":
    case "customer_of":
    case "partner_of":
      return "bg-cyan-100 text-cyan-800";
    case "competitor_of":
      return "bg-rose-100 text-rose-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export function getWarmthTone(warmth: "high" | "medium" | "low") {
  switch (warmth) {
    case "high":
      return "bg-emerald-100 text-emerald-800";
    case "medium":
      return "bg-amber-100 text-amber-800";
    case "low":
      return "bg-slate-100 text-slate-700";
  }
}
