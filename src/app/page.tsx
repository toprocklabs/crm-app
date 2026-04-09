import { and, desc, eq, ne, sql } from "drizzle-orm";
import { completeTask } from "@/app/actions";
import { ActivityTimeline } from "@/components/activity-timeline";
import { CollapsibleFormSection } from "@/components/collapsible-form-section";
import { CrmShell } from "@/components/crm-shell";
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

function Card({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <article className="gong-panel gong-kpi rounded-lg p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</p>
      <p className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p>
    </article>
  );
}

export default async function Home() {
  const session = await requireUser();
  const db = getDb();

  if (!db) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-6 py-10">
        <h1 className="text-3xl font-semibold text-slate-900">Toprock CRM</h1>
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-amber-900">
          <p className="font-medium">Toprock CRM needs setup before it can run.</p>
          <p className="mt-2 text-sm">
            Add your Neon connection string as <code>DATABASE_URL</code>, then run
            <code className="mx-1">npm run db:generate</code> and
            <code className="mx-1">npm run db:push</code>.
          </p>
        </div>
      </main>
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  const [dealRows, taskRows, activityRows, statsRows] = await Promise.all([
    db
      .select({
        id: deals.id,
        name: deals.name,
        stage: deals.stage,
        valueCents: deals.valueCents,
        implementationCostCents: deals.implementationCostCents,
        companyName: companies.name,
        ownerName: deals.ownerName,
        nextStep: deals.nextStep,
        nextStepDueDate: deals.nextStepDueDate,
      })
      .from(deals)
      .leftJoin(companies, eq(deals.companyId, companies.id))
      .orderBy(desc(deals.createdAt))
      .limit(12),
    db
      .select({
        id: salesTasks.id,
        title: salesTasks.title,
        dueDate: salesTasks.dueDate,
        status: salesTasks.status,
        assignedTo: salesTasks.assignedTo,
        dealName: deals.name,
        companyName: companies.name,
      })
      .from(salesTasks)
      .leftJoin(deals, eq(salesTasks.dealId, deals.id))
      .leftJoin(companies, eq(salesTasks.companyId, companies.id))
      .orderBy(salesTasks.dueDate, desc(salesTasks.createdAt))
      .limit(14),
    db
      .select({
        id: activities.id,
        type: activities.type,
        notes: activities.notes,
        occurredAt: activities.occurredAt,
        dealId: deals.id,
        dealName: deals.name,
        companyId: companies.id,
        companyName: companies.name,
        loggedByUsername: users.username,
      })
      .from(activities)
      .leftJoin(deals, eq(activities.dealId, deals.id))
      .leftJoin(companies, eq(activities.companyId, companies.id))
      .leftJoin(users, eq(activities.loggedByUserId, users.id))
      .orderBy(desc(activities.occurredAt))
      .limit(16),
    db
      .select({
        companies: sql<number>`count(distinct ${companies.id})`,
        contacts: sql<number>`(select count(*) from ${contacts})`,
        pipelineCents: sql<number>`coalesce(sum(${deals.valueCents}) filter (where ${deals.stage} not in ('won', 'lost')), 0)`,
        openTasks: sql<number>`(select count(*) from ${salesTasks} where ${salesTasks.status} = 'open')`,
      })
      .from(companies)
      .leftJoin(deals, eq(companies.id, deals.companyId)),
  ]);

  const stats = statsRows[0] ?? { companies: 0, contacts: 0, pipelineCents: 0, openTasks: 0 };
  const openTaskRows = taskRows.filter((task) => task.status === "open");
  const completedTaskRows = taskRows.filter((task) => task.status === "done");
  const overdueTasks = openTaskRows.filter((task) => task.dueDate < today);

  return (
    <CrmShell
      username={session.username}
      title="Dashboard"
      description="Track pipeline, enforce next steps, and run a clean follow-up cadence for your SMB opportunities."
    >
      <section>
        <article className="gong-panel rounded-xl p-6">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-700">Executive Summary</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Revenue motion at a glance</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Prioritize open revenue, overdue next steps, and the follow-up work blocking pipeline movement.
              </p>
            </div>
            <div className="grid min-w-[250px] gap-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Active accounts</span>
                <span className="font-semibold text-slate-950">{stats.companies}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Open tasks</span>
                <span className="font-semibold text-slate-950">{stats.openTasks}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Overdue tasks</span>
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${overdueTasks.length > 0 ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"}`}>
                  {overdueTasks.length}
                </span>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <Card title="Accounts" value={String(stats.companies)} subtitle="Active SMB accounts" />
        <Card title="Contacts" value={String(stats.contacts)} subtitle="People in your funnel" />
        <Card
          title="Pipeline ARR"
          value={currency.format(Math.round((stats.pipelineCents ?? 0) / 100))}
          subtitle="Active pipeline (excl. won/lost)"
        />
        <Card title="Open Tasks" value={String(stats.openTasks)} subtitle="Follow-ups due soon" />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="gong-panel rounded-xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Pipeline Focus</p>
              <h2 className="mt-2 text-lg font-semibold text-slate-950">Opportunities with next steps</h2>
            </div>
            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{dealRows.length} tracked</span>
          </div>
          <ul className="mt-4 space-y-3">
            {dealRows.length === 0 ? <li className="text-sm text-slate-500">No opportunities yet.</li> : null}
            {dealRows.map((deal) => {
              const stepLate = Boolean(deal.nextStepDueDate && deal.nextStepDueDate < today && deal.stage !== "won" && deal.stage !== "lost");

              return (
                <li key={deal.id} className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-slate-900">{deal.name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-slate-600">
                        <span>{deal.companyName ?? "No account"}</span>
                        <span>•</span>
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getDealStageTone(deal.stage)}`}>
                          {getDealStageLabel(deal.stage)}
                        </span>
                        <span>•</span>
                        <span>{deal.ownerName ?? "Unassigned"}</span>
                      </div>
                      <p className="mt-2 text-sm text-slate-800">Next step: {deal.nextStep || "Not set"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-700">IARR {currency.format(Math.round(deal.valueCents / 100))}</p>
                      <p className="text-xs text-slate-500">Impl. {currency.format(Math.round(deal.implementationCostCents / 100))}</p>
                    </div>
                  </div>
                  {deal.nextStepDueDate ? (
                    <p className={`mt-2 text-xs ${stepLate ? "text-red-700" : "text-slate-500"}`}>
                      Next step due: {deal.nextStepDueDate}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </article>

        <article className="gong-panel rounded-xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Execution Queue</p>
              <h2 className="mt-2 text-lg font-semibold text-slate-950">Task reminders</h2>
            </div>
            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{openTaskRows.length} open</span>
          </div>
          <ul className="mt-4 space-y-3">
            {openTaskRows.length === 0 ? <li className="text-sm text-slate-500">No open tasks right now.</li> : null}
            {openTaskRows.map((task) => {
              const overdue = task.status === "open" && task.dueDate < today;
              return (
                <li key={task.id} className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">{task.title}</p>
                      <p className="text-sm text-slate-600">
                        {task.dealName ?? task.companyName ?? "General"} • {task.assignedTo ?? "Unassigned"}
                      </p>
                      <p className={`mt-1 text-xs ${overdue ? "text-red-700" : "text-slate-500"}`}>
                        Due {task.dueDate}
                      </p>
                    </div>
                    {task.status === "open" ? (
                      <form action={completeTask}>
                        <input type="hidden" name="taskId" value={task.id} />
                        <button type="submit" className="rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-800">
                          Mark done
                        </button>
                      </form>
                    ) : (
                      <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">Done</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <CollapsibleFormSection
            title={`Completed tasks (${completedTaskRows.length})`}
            description="Expand to review finished reminders."
            className="mt-5 border-slate-200 bg-slate-50/70"
          >
            <ul className="space-y-3">
              {completedTaskRows.length === 0 ? <li className="text-sm text-slate-500">No completed tasks yet.</li> : null}
              {completedTaskRows.map((task) => (
                <li key={task.id} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">{task.title}</p>
                      <p className="text-sm text-slate-600">
                        {task.dealName ?? task.companyName ?? "General"} • {task.assignedTo ?? "Unassigned"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">Due {task.dueDate}</p>
                    </div>
                    <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">Done</span>
                  </div>
                </li>
              ))}
            </ul>
          </CollapsibleFormSection>
        </article>
      </section>

      <section className="gong-panel rounded-xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Signals</p>
            <h2 className="mt-2 text-lg font-semibold text-slate-950">Recent activity timeline</h2>
          </div>
          <span className="inline-flex rounded-full bg-cyan-100 px-2.5 py-1 text-xs font-semibold text-cyan-800">Live feed</span>
        </div>
        <ActivityTimeline
          emptyMessage="No activity logged yet."
          items={activityRows.map((item) => ({
            id: item.id,
            type: item.type,
            notes: item.notes,
            occurredAt: item.occurredAt,
            loggedByUsername: item.loggedByUsername,
            contextLinks: [
              ...(item.dealName && item.dealId ? [{ label: item.dealName, href: `/opportunities/${item.dealId}` }] : []),
              ...(item.companyName && item.companyId ? [{ label: item.companyName, href: `/accounts/${item.companyId}` }] : []),
            ],
          }))}
        />
      </section>
    </CrmShell>
  );
}
