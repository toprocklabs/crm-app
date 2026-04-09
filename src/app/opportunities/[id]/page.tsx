import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { completeTask, logActivity, updateDeal, updateDealStage } from "@/app/actions";
import { ActivityTimeline } from "@/components/activity-timeline";
import { CollapsibleFormSection } from "@/components/collapsible-form-section";
import { CrmShell } from "@/components/crm-shell";
import { activityTypeOptions, getActivityMeta } from "@/lib/activity-ui";
import { requireUser } from "@/lib/auth";
import { getDealStageLabel, getDealStageTone } from "@/lib/deal-stage";
import { getDb } from "@/lib/db";
import { activities, companies, contacts, deals, salesTasks, users } from "@/lib/schema";

export const dynamic = "force-dynamic";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Not set";
  }

  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US");
}

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
        loggedByUsername: users.username,
      })
      .from(activities)
      .leftJoin(users, eq(activities.loggedByUserId, users.id))
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
  const openTaskRows = taskRows.filter((task) => task.status === "open");
  const completedTaskRows = taskRows.filter((task) => task.status === "done");
  const today = new Date().toISOString().slice(0, 10);
  const nextStepLate = Boolean(
    opportunity.nextStepDueDate &&
      opportunity.nextStepDueDate < today &&
      opportunity.stage !== "won" &&
      opportunity.stage !== "lost",
  );
  const healthLabel = nextStepLate
    ? "Action overdue"
    : opportunity.nextStep
      ? "Next step set"
      : "Missing next step";
  const healthTone = nextStepLate
    ? "bg-rose-100 text-rose-800"
    : opportunity.nextStep
      ? "bg-emerald-100 text-emerald-800"
      : "bg-amber-100 text-amber-800";

  return (
    <CrmShell
      username={session.username}
      title={opportunity.name}
      description="Opportunity detail with editable fields, stage management, and timeline."
    >
      <section className="gong-panel rounded-xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getDealStageTone(opportunity.stage)}`}>
                {getDealStageLabel(opportunity.stage)}
              </span>
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${healthTone}`}>
                {healthLabel}
              </span>
              <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                Expected close {formatDate(opportunity.expectedCloseDate)}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">Overview</p>
              <p className="mt-2 max-w-3xl text-sm text-slate-600">
                {opportunity.nextStep
                  ? `Current next step: ${opportunity.nextStep}`
                  : "No next step is set yet for this opportunity."}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/opportunities" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700">
              Back to Opportunities
            </Link>
            {opportunity.companyId ? (
              <Link href={`/accounts/${opportunity.companyId}`} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700">
                Open Account
              </Link>
            ) : null}
            {opportunity.primaryContactId ? (
              <Link href={`/contacts/${opportunity.primaryContactId}`} className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white">
                Open Contact
              </Link>
            ) : null}
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <article className="rounded-lg border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">IARR</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{currency.format(Math.round(opportunity.valueCents / 100))}</p>
          </article>
          <article className="rounded-lg border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Implementation Cost</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {currency.format(Math.round(opportunity.implementationCostCents / 100))}
            </p>
          </article>
          <article className="rounded-lg border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Owner</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{opportunity.ownerName ?? "Unassigned"}</p>
          </article>
          <article className="rounded-lg border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Account</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{opportunity.companyName ?? "None"}</p>
          </article>
          <article className="rounded-lg border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Primary Contact</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {opportunity.primaryContactFirstName
                ? `${opportunity.primaryContactFirstName} ${opportunity.primaryContactLastName}`
                : "None"}
            </p>
          </article>
        </div>
      </section>

      <section className="sticky top-4 z-10 rounded-xl border border-white/80 bg-white/90 p-3 shadow-lg shadow-slate-900/5 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <a href="#opportunity-overview" className="rounded-xl border border-slate-300 px-3 py-1.5 text-sm text-slate-700">Overview</a>
            <a href="#opportunity-details" className="rounded-xl border border-slate-300 px-3 py-1.5 text-sm text-slate-700">Details</a>
            <a href="#opportunity-stage" className="rounded-xl border border-slate-300 px-3 py-1.5 text-sm text-slate-700">Stage</a>
            <a href="#opportunity-activity" className="rounded-xl border border-slate-300 px-3 py-1.5 text-sm text-slate-700">Activity</a>
            <a href="#opportunity-tasks" className="rounded-xl border border-slate-300 px-3 py-1.5 text-sm text-slate-700">Tasks</a>
          </div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
            {nextStepLate ? "This opportunity needs immediate follow-up" : "Keep stage and next step aligned"}
          </p>
        </div>
      </section>

      <section id="opportunity-overview" className="gong-panel rounded-xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">Overview</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">Deal Snapshot</h2>
            <p className="mt-1 text-sm text-slate-600">Review owner, timing, and relationship context before editing the record.</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <p>Created: {new Date(opportunity.createdAt).toLocaleDateString()}</p>
            <p className="mt-1">Next step due: {formatDate(opportunity.nextStepDueDate)}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article id="opportunity-details" className="gong-panel rounded-xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">Details</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">Opportunity Details</h2>
              <p className="mt-1 text-sm text-slate-600">Update commercial fields, owner, and relationship mapping.</p>
            </div>
            <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700">
              {getDealStageLabel(opportunity.stage)}
            </div>
          </div>
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
            <button type="submit" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
              Save details
            </button>
          </form>
        </article>

        <article id="opportunity-stage" className="gong-panel rounded-xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">Stage</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">Stage Workflow</h2>
              <p className="mt-1 text-sm text-slate-600">Keep stage changes explicit and document why the deal moved.</p>
            </div>
            <div className={`rounded-lg px-3 py-2 text-sm font-medium ${getDealStageTone(opportunity.stage)}`}>
              {getDealStageLabel(opportunity.stage)}
            </div>
          </div>
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
            <button type="submit" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
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
        <article id="opportunity-activity" className="gong-panel rounded-xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">Activity</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">Timeline</h2>
              <p className="mt-1 text-sm text-slate-600">Log interactions and keep the deal narrative current.</p>
            </div>
            <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700">
              {activityRows.length} entries
            </div>
          </div>
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
                    {activityTypeOptions.map((type) => (
                      <option key={type} value={type}>
                        {getActivityMeta(type).label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm text-slate-700">
                  <span>Activity date</span>
                  <input name="occurredOn" type="date" className="rounded-md border border-slate-300 px-3 py-2 text-slate-900" />
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
              <button type="submit" className="mt-3 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
                Save activity
              </button>
            </form>
          </CollapsibleFormSection>

          <ActivityTimeline
            emptyMessage="No activity yet."
            items={activityRows.map((item) => ({
              id: item.id,
              type: item.type,
              notes: item.notes,
              occurredAt: item.occurredAt,
              loggedByUsername: item.loggedByUsername,
              contextLinks: [
                ...(opportunity.companyId ? [{ label: opportunity.companyName ?? "Account", href: `/accounts/${opportunity.companyId}` }] : []),
                ...(opportunity.primaryContactId && opportunity.primaryContactFirstName
                  ? [{
                      label: `${opportunity.primaryContactFirstName} ${opportunity.primaryContactLastName}`,
                      href: `/contacts/${opportunity.primaryContactId}`,
                    }]
                  : []),
              ],
            }))}
          />
        </article>

        <article id="opportunity-tasks" className="gong-panel rounded-xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">Tasks</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">Linked Tasks</h2>
              <p className="mt-1 text-sm text-slate-600">Use linked tasks to enforce the next action outside the timeline.</p>
            </div>
            <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700">
              {openTaskRows.length} open
            </div>
          </div>
          <ul className="mt-4 space-y-3">
            {openTaskRows.length === 0 ? <li className="text-sm text-slate-500">No open tasks linked to this opportunity.</li> : null}
            {openTaskRows.map((task) => (
              <li key={task.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{task.title}</p>
                    <p className="text-sm text-slate-600">Due {task.dueDate}</p>
                    <p className="mt-1 text-xs text-slate-500">{task.assignedTo ?? "Unassigned"}</p>
                  </div>
                  <form action={completeTask}>
                    <input type="hidden" name="taskId" value={task.id} />
                    <button type="submit" className="rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-800">
                      Mark done
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
          <CollapsibleFormSection
            title={`Completed tasks (${completedTaskRows.length})`}
            description="Expand to review finished opportunity tasks."
            className="mt-5 border-slate-200 bg-slate-50/70"
          >
            <ul className="space-y-3">
              {completedTaskRows.length === 0 ? <li className="text-sm text-slate-500">No completed tasks yet.</li> : null}
              {completedTaskRows.map((task) => (
                <li key={task.id} className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="font-medium text-slate-900">{task.title}</p>
                  <p className="text-sm text-slate-600">Due {task.dueDate}</p>
                  <p className="mt-1 text-xs text-slate-500">{task.assignedTo ?? "Unassigned"}</p>
                  <p className="mt-2">
                    <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                      Done
                    </span>
                  </p>
                </li>
              ))}
            </ul>
          </CollapsibleFormSection>
        </article>
      </section>
    </CrmShell>
  );
}
