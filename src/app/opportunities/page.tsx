import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { CrmShell } from "@/components/crm-shell";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { companies, deals } from "@/lib/schema";

export const dynamic = "force-dynamic";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function formatStageLabel(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, " ");
}

function getStageTone(stage: string) {
  switch (stage) {
    case "won":
      return "bg-emerald-100 text-emerald-800";
    case "lost":
      return "bg-rose-100 text-rose-800";
    case "negotiation":
      return "bg-amber-100 text-amber-800";
    case "proposal":
      return "bg-sky-100 text-sky-800";
    case "qualified":
      return "bg-cyan-100 text-cyan-800";
    case "lead":
      return "bg-slate-100 text-slate-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default async function OpportunitiesPage() {
  const session = await requireUser();
  const db = getDb();

  if (!db) {
    return null;
  }

  const rows = await db
    .select({
      id: deals.id,
      name: deals.name,
      stage: deals.stage,
      ownerName: deals.ownerName,
      nextStep: deals.nextStep,
      nextStepDueDate: deals.nextStepDueDate,
      valueCents: deals.valueCents,
      implementationCostCents: deals.implementationCostCents,
      expectedCloseDate: deals.expectedCloseDate,
      companyName: companies.name,
      createdAt: deals.createdAt,
    })
    .from(deals)
    .leftJoin(companies, eq(deals.companyId, companies.id))
    .orderBy(desc(deals.createdAt));

  const today = new Date().toISOString().slice(0, 10);

  return (
    <CrmShell
      username={session.username}
      title="Opportunities"
      description="Complete opportunity pipeline with owner accountability and next-step deadlines."
    >
      <section className="gong-panel rounded-xl p-5">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-slate-500">
              <tr>
                <th className="px-3 py-2">Opportunity</th>
                <th className="px-3 py-2">Stage</th>
                <th className="px-3 py-2">Owner</th>
                <th className="px-3 py-2">Next step</th>
                <th className="px-3 py-2">IARR</th>
                <th className="px-3 py-2">Implementation Cost</th>
                <th className="px-3 py-2">Expected close</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-slate-500">
                    No opportunities yet.
                  </td>
                </tr>
              ) : null}
              {rows.map((row) => {
                const overdue = Boolean(row.nextStepDueDate && row.nextStepDueDate < today && row.stage !== "won" && row.stage !== "lost");

                return (
                  <tr key={row.id} className="border-b border-slate-100">
                    <td className="px-3 py-2">
                      <p className="font-medium text-slate-900">
                        <Link href={`/opportunities/${row.id}`} className="underline decoration-slate-300 underline-offset-2">
                          {row.name}
                        </Link>
                      </p>
                      <p className="text-slate-500">{row.companyName ?? "No account"}</p>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStageTone(row.stage)}`}>
                        {formatStageLabel(row.stage)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-700">{row.ownerName ?? "Unassigned"}</td>
                    <td className="px-3 py-2">
                      <p className="text-slate-800">{row.nextStep || "No next step"}</p>
                      {row.nextStepDueDate ? (
                        <p className={`text-xs ${overdue ? "text-red-700" : "text-slate-500"}`}>Due {row.nextStepDueDate}</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-slate-700">{currency.format(Math.round(row.valueCents / 100))}</td>
                    <td className="px-3 py-2 text-slate-700">{currency.format(Math.round(row.implementationCostCents / 100))}</td>
                    <td className="px-3 py-2 text-slate-700">{row.expectedCloseDate ? new Date(`${row.expectedCloseDate}T00:00:00`).toLocaleDateString("en-US") : "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </CrmShell>
  );
}
