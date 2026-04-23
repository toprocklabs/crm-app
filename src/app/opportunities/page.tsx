import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { createDeal } from "@/app/actions";
import { CollapsibleFormSection } from "@/components/collapsible-form-section";
import { CrmShell } from "@/components/crm-shell";
import { EmptyState } from "@/components/empty-state";
import { SearchInput } from "@/components/search-input";
import { StageFilter } from "@/components/stage-filter";
import { requireUser } from "@/lib/auth";
import { dealStageOptions, getDealStageLabel, getDealStageTone } from "@/lib/deal-stage";
import { getDb } from "@/lib/db";
import { currency } from "@/lib/format";
import { companies, deals } from "@/lib/schema";

export const dynamic = "force-dynamic";

const stageOptions = dealStageOptions.map((stage) => ({
  value: stage,
  label: getDealStageLabel(stage),
}));

function getDueUrgency(date: string | null, today: string) {
  if (!date) return "missing";
  if (date < today) return "overdue";
  if (date === today) return "today";
  return "future";
}

type OpportunitiesPageProps = {
  searchParams: Promise<{ q?: string; stage?: string }>;
};

export default async function OpportunitiesPage({ searchParams }: OpportunitiesPageProps) {
  const session = await requireUser();
  const db = getDb();

  if (!db) {
    return null;
  }

  const [rows, companyRows] = await Promise.all([
    db
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
      .orderBy(desc(deals.createdAt)),
    db.select({ id: companies.id, name: companies.name }).from(companies).orderBy(desc(companies.createdAt)),
  ]);

  const today = new Date().toISOString().slice(0, 10);

  const params = await searchParams;
  const search = (params.q ?? "").trim().toLowerCase();
  const stageFilterValue = params.stage ?? "";
  const filtered = rows.filter((row) => {
    if (search && !row.name.toLowerCase().includes(search) && !(row.companyName ?? "").toLowerCase().includes(search) && !(row.ownerName ?? "").toLowerCase().includes(search)) {
      return false;
    }
    if (stageFilterValue && row.stage !== stageFilterValue) {
      return false;
    }
    return true;
  });

  return (
    <CrmShell
      username={session.username}
      title="Opportunities"
      description="Complete opportunity pipeline with owner accountability and next-step deadlines."
    >
      <section className="gong-panel rounded-xl p-5">
        <CollapsibleFormSection id="add-opportunity" title="Add opportunity" description="Create a new deal and set its stage, value, and next step.">
          <form action={createDeal}>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                <span>Opportunity name</span>
                <input name="name" required className="rounded-md border border-slate-300 px-3 py-2 text-slate-900" />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                <span>Stage</span>
                <select name="stage" defaultValue="lead" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900">
                  <option value="lead">Lead</option>
                  <option value="qualified">Qualified</option>
                  <option value="proposal">Proposal</option>
                  <option value="negotiation">Negotiation</option>
                  <option value="won">Won</option>
                  <option value="lost">Lost</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                <span>MRR (USD)</span>
                <input name="mrrUsd" type="number" min="0" defaultValue="0" className="rounded-md border border-slate-300 px-3 py-2 text-slate-900" />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                <span>Implementation Cost (USD)</span>
                <input name="implementationCostUsd" type="number" min="0" defaultValue="0" className="rounded-md border border-slate-300 px-3 py-2 text-slate-900" />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                <span>Account</span>
                <select name="companyId" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900">
                  <option value="">None</option>
                  {companyRows.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                <span>Owner</span>
                <input name="ownerName" className="rounded-md border border-slate-300 px-3 py-2 text-slate-900" />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                <span>Next step</span>
                <input name="nextStep" required className="rounded-md border border-slate-300 px-3 py-2 text-slate-900" />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                <span>Next step due</span>
                <input name="nextStepDueDate" type="date" className="rounded-md border border-slate-300 px-3 py-2 text-slate-900" />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700 md:col-span-2">
                <span>Expected close date</span>
                <input name="expectedCloseDate" type="date" className="rounded-md border border-slate-300 px-3 py-2 text-slate-900" />
              </label>
            </div>
            <button type="submit" className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
              Save opportunity
            </button>
          </form>
        </CollapsibleFormSection>
      </section>

      <section className="gong-panel rounded-xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <p className="text-sm font-semibold text-slate-700">{filtered.length} opportunities</p>
          <div className="flex items-center gap-3">
            <SearchInput placeholder="Search opportunities..." />
            <StageFilter options={stageOptions} />
          </div>
        </div>
        <div className="crm-table-wrap mt-4">
          <table className="crm-data-table">
            <thead className="text-left text-slate-500">
              <tr>
                <th>Opportunity</th>
                <th>Stage</th>
                <th>Owner</th>
                <th>Next step</th>
                <th className="text-right">MRR</th>
                <th className="text-right">Implementation Cost</th>
                <th>Expected close</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-4">
                    <EmptyState icon={search || stageFilterValue ? "search" : "opportunity"} message={search || stageFilterValue ? "No opportunities matching your filters." : "No opportunities yet."} action={search || stageFilterValue ? undefined : { label: "Create opportunity", href: "/opportunities" }} />
                  </td>
                </tr>
              ) : null}
              {filtered.map((row) => {
                const dueUrgency = row.stage === "won" || row.stage === "lost" ? "future" : getDueUrgency(row.nextStepDueDate, today);

                return (
                  <tr key={row.id}>
                    <td className="min-w-[240px]">
                      <p className="font-medium text-slate-900">
                        <Link href={`/opportunities/${row.id}`} className="crm-table-link">
                          {row.name}
                        </Link>
                      </p>
                      <p className="text-slate-500">{row.companyName ?? "No account"}</p>
                    </td>
                    <td className="min-w-[135px]">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getDealStageTone(row.stage)}`}>
                        {getDealStageLabel(row.stage)}
                      </span>
                    </td>
                    <td className="min-w-[130px] text-slate-700">{row.ownerName ?? "Unassigned"}</td>
                    <td className="min-w-[260px]">
                      <p className="text-slate-800">{row.nextStep || "No next step"}</p>
                      {row.nextStepDueDate ? (
                        <span className="crm-due-pill mt-1" data-urgency={dueUrgency}>
                          {dueUrgency === "overdue" ? "Overdue" : dueUrgency === "today" ? "Due today" : `Due ${row.nextStepDueDate}`}
                        </span>
                      ) : (
                        <span className="crm-due-pill mt-1" data-urgency="missing">No due date</span>
                      )}
                    </td>
                    <td className="crm-money font-semibold text-slate-800">{currency.format(Math.round(row.valueCents / 100))}</td>
                    <td className="crm-money text-slate-700">{currency.format(Math.round(row.implementationCostCents / 100))}</td>
                    <td className="min-w-[145px] text-slate-700">{row.expectedCloseDate ? new Date(`${row.expectedCloseDate}T00:00:00`).toLocaleDateString("en-US") : "-"}</td>
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
