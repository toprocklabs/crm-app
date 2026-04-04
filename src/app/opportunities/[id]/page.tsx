import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { logActivity, updateDeal, updateDealStage } from "@/app/actions";
import { CollapsibleFormSection } from "@/components/collapsible-form-section";
import { CrmShell } from "@/components/crm-shell";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { activities, companies, contacts, deals, salesTasks } from "@/lib/schema";

export const dynamic = "force-dynamic";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

type Props = {
  params: Promise<{ id: string }>;
};

export default async function OpportunityDetailPage({ params }: Props) {
  const session = await requireUser();
  const db = getDb();

  if (!db) {
    return null;
  }

  const { id } = await params;
  const dealId = Number(id);

  if (!Number.isInteger(dealId) || dealId <= 0) {
    notFound();
  }

  const opportunity = await db
    .select({
      id: deals.id,
      name: deals.name,
      stage: deals.stage,
      valueCents: deals.valueCents,
      implementationCostCents: deals.implementationCostCents,
      ownerName: deals.ownerName,
      nextStep: deals.nextStep,
      nextStepDueDate: deals.nextStepDueDate,
      expectedCloseDate: deals.expectedCloseDate,
      companyId: deals.companyId,
      companyName: companies.name,
      primaryContactId: deals.primaryContactId,
      primaryContactFirstName: contacts.firstName,
      primaryContactLastName: contacts.lastName,
      createdAt: deals.createdAt,
    })
    .from(deals)
    .leftJoin(companies, eq(deals.companyId, companies.id))
    .leftJoin(contacts, eq(deals.primaryContactId, contacts.id))
    .where(eq(deals.id, dealId))
    .then((rows) => rows[0]);

  if (!opportunity) {
    notFound();
  }

  const [activityRows, taskRows, companyRows, contactRows] = await Promise.all([
    db
      .select({
        id: activities.id,
        type: activities.type,
        notes: activities.notes,
        occurredAt: activities.occurredAt,
      })
      .from(activities)
      .where(eq(activities.dealId, dealId))
      .orderBy(desc(activities.occurredAt)),
    db
      .select({
        id: salesTasks.id,
        title: salesTasks.title,
        dueDate: salesTasks.dueDate,
        status: salesTasks.status,
        assignedTo: salesTasks.assignedTo,
      })
      .from(salesTasks)
      .where(eq(salesTasks.dealId, dealId))
      .orderBy(salesTasks.dueDate),
    db.select({ id: companies.id, name: companies.name }).from(companies).orderBy(desc(companies.createdAt)),
    db
      .select({
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        companyId: contacts.companyId,
      })
      .from(contacts)
      .orderBy(desc(contacts.createdAt)),
  ]);

  const stageHistory = activityRows.filter((item) => item.notes.startsWith("Stage changed:"));

  return (
    <CrmShell
      username={session.username}
      title={opportunity.name}
      description="Opportunity detail with editable fields, stage management, and timeline."
    >
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-slate-600">
          <p>Created: {new Date(opportunity.createdAt).toLocaleDateString()}</p>
          <p>
            Current stage: <span className="font-medium text-slate-900">{opportunity.stage}</span>
          </p>
        </div>
        <Link href="/opportunities" className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700">
          Back to Opportunities
        </Link>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">IARR</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{currency.format(Math.round(opportunity.valueCents / 100))}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Implementation Cost</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {currency.format(Math.round(opportunity.implementationCostCents / 100))}
          </p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Owner</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{opportunity.ownerName ?? "Unassigned"}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Account</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{opportunity.companyName ?? "None"}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Primary Contact</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {opportunity.primaryContactFirstName
              ? `${opportunity.primaryContactFirstName} ${opportunity.primaryContactLastName}`
              : "None"}
          </p>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Opportunity Details</h2>
          <form action={updateDeal} className="mt-4 space-y-3">
            <input type="hidden" name="dealId" value={opportunity.id} />
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              <span>Name</span>
              <input name="name" required defaultValue={opportunity.name} className="rounded-md border border-slate-300 px-3 py-2 text-slate-900" />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              <span>IARR (USD)</span>
              <input
                name="iarrUsd"
                type="number"
                min={0}
                defaultValue={Math.round(opportunity.valueCents / 100)}
                className="rounded-md border border-slate-300 px-3 py-2 text-slate-900"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              <span>Implementation Cost (USD)</span>
              <input
                name="implementationCostUsd"
                type="number"
                min={0}
                defaultValue={Math.round(opportunity.implementationCostCents / 100)}
                className="rounded-md border border-slate-300 px-3 py-2 text-slate-900"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              <span>Owner</span>
              <input name="ownerName" defaultValue={opportunity.ownerName ?? ""} className="rounded-md border border-slate-300 px-3 py-2 text-slate-900" />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              <span>Next step</span>
              <input name="nextStep" required defaultValue={opportunity.nextStep} className="rounded-md border border-slate-300 px-3 py-2 text-slate-900" />
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                <span>Next step due</span>
                <input
                  name="nextStepDueDate"
                  type="date"
                  defaultValue={opportunity.nextStepDueDate ?? ""}
                  className="rounded-md border border-slate-300 px-3 py-2 text-slate-900"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                <span>Expected close</span>
                <input
                  name="expectedCloseDate"
                  type="date"
                  defaultValue={opportunity.expectedCloseDate ?? ""}
                  className="rounded-md border border-slate-300 px-3 py-2 text-slate-900"
                />
              </label>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                <span>Account</span>
                <select name="companyId" defaultValue={opportunity.companyId ?? ""} className="rounded-md border border-slate-300 px-3 py-2 text-slate-900">
                  <option value="">None</option>
                  {companyRows.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                <span>Primary contact</span>
                <select
                  name="primaryContactId"
                  defaultValue={opportunity.primaryContactId ?? ""}
                  className="rounded-md border border-slate-300 px-3 py-2 text-slate-900"
                >
                  <option value="">None</option>
                  {contactRows.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.firstName} {contact.lastName}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button type="submit" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white">
              Save details
            </button>
          </form>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Stage Workflow</h2>
          <form action={updateDealStage} className="mt-4 space-y-3">
            <input type="hidden" name="dealId" value={opportunity.id} />
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              <span>Stage</span>
              <select name="stage" defaultValue={opportunity.stage} className="rounded-md border border-slate-300 px-3 py-2 text-slate-900">
                <option value="lead">Lead</option>
                <option value="qualified">Qualified</option>
                <option value="proposal">Proposal</option>
                <option value="negotiation">Negotiation</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              <span>Close/Lost reason (required for Lost)</span>
              <textarea
                name="reason"
                rows={3}
                placeholder="Example: Lost to incumbent due to pricing and timing."
                className="rounded-md border border-slate-300 px-3 py-2 text-slate-900"
              />
            </label>
            <button type="submit" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white">
              Update stage
            </button>
          </form>

          <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-slate-500">Stage History</h3>
          <ul className="mt-2 space-y-2">
            {stageHistory.length === 0 ? <li className="text-sm text-slate-500">No stage changes logged yet.</li> : null}
            {stageHistory.map((entry) => (
              <li key={entry.id} className="rounded-lg border border-slate-200 p-3">
                <p className="text-sm text-slate-900">{entry.notes}</p>
                <p className="mt-1 text-xs text-slate-500">{new Date(entry.occurredAt).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Activity Timeline</h2>
          <CollapsibleFormSection title="Log activity" description="Attach notes, calls, emails, or meetings." className="mt-4">
            <form action={logActivity}>
              <input type="hidden" name="dealId" value={opportunity.id} />
              <input type="hidden" name="companyId" value={opportunity.companyId ?? ""} />
              <input type="hidden" name="contactId" value={opportunity.primaryContactId ?? ""} />
              <input type="hidden" name="returnPath" value={`/opportunities/${opportunity.id}`} />
              <div className="space-y-3">
                <label className="flex flex-col gap-1 text-sm text-slate-700">
                  <span>Type</span>
                  <select name="type" defaultValue="note" className="rounded-md border border-slate-300 px-3 py-2 text-slate-900">
                    <option value="note">Note</option>
                    <option value="call">Call</option>
                    <option value="meeting">Meeting</option>
                    <option value="email">Email</option>
                    <option value="task">Task</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm text-slate-700">
                  <span>Notes</span>
                  <textarea
                    name="notes"
                    required
                    rows={3}
                    className="rounded-md border border-slate-300 px-3 py-2 text-slate-900"
                    placeholder="Add context about this opportunity update."
                  />
                </label>
              </div>
              <button type="submit" className="mt-3 rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white">
                Save activity
              </button>
            </form>
          </CollapsibleFormSection>

          <ul className="mt-4 space-y-3">
            {activityRows.length === 0 ? <li className="text-sm text-slate-500">No activity yet.</li> : null}
            {activityRows.map((item) => (
              <li key={item.id} className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">{item.type}</p>
                <p className="mt-1 font-medium text-slate-900">{item.notes}</p>
                <p className="mt-1 text-xs text-slate-500">{new Date(item.occurredAt).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Linked Tasks</h2>
          <ul className="mt-4 space-y-3">
            {taskRows.length === 0 ? <li className="text-sm text-slate-500">No tasks linked to this opportunity.</li> : null}
            {taskRows.map((task) => (
              <li key={task.id} className="rounded-lg border border-slate-200 p-3">
                <p className="font-medium text-slate-900">{task.title}</p>
                <p className="text-sm text-slate-600">Due {task.dueDate}</p>
                <p className="text-xs text-slate-500">{task.assignedTo ?? "Unassigned"} • {task.status}</p>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </CrmShell>
  );
}
