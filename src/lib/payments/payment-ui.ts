import type { PaymentStatus, PaymentType } from "@/lib/schema";

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  succeeded: "Paid",
  refunded: "Refunded",
  partially_refunded: "Partly refunded",
  failed: "Failed",
};

export const paymentStatusPillClasses: Record<PaymentStatus, string> = {
  succeeded: "bg-emerald-100 text-emerald-800",
  refunded: "bg-slate-100 text-slate-700",
  partially_refunded: "bg-amber-100 text-amber-800",
  failed: "bg-red-100 text-red-800",
};

export const paymentTypeLabels: Record<PaymentType, string> = {
  one_time: "One-off",
  recurring: "Recurring",
};

export const paymentTypePillClasses: Record<PaymentType, string> = {
  one_time: "bg-indigo-100 text-indigo-800",
  recurring: "bg-cyan-100 text-cyan-800",
};

export const subscriptionStatusPillClasses: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800",
  trialing: "bg-sky-100 text-sky-800",
  past_due: "bg-amber-100 text-amber-800",
  unpaid: "bg-red-100 text-red-800",
  canceled: "bg-slate-100 text-slate-700",
  incomplete: "bg-amber-100 text-amber-800",
  incomplete_expired: "bg-slate-100 text-slate-700",
  paused: "bg-slate-100 text-slate-700",
};
