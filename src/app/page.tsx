import { desc, eq, sql } from "drizzle-orm";
import {
  completeTask,
  createTask,
} from "@/app/actions";
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
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
    </article>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = false,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm text-slate-700">
      <span>{label}</span>
      <input
        className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-xs outline-none transition focus:border-slate-500"
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
      />
    </label>
  );
}

export default async function Home() {
  const session = await requireUser();
  const db = getDb();

  if (!db) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-6 py-10">
        <h1 className="text-3xl font-semibold text-slate-900">Simple CRM</h1>
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-amber-900">
          <p className="font-medium">Setup needed before the app can run.</p>
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

  const [companyRows, dealRows, taskRows, activityRows, statsRows] = await Promise.all([
    db.select().from(companies).orderBy(desc(companies.createdAt)).limit(10),
    db
      .select({
        id: deals.id,
        name: deals.name,
        stage: deals.stage,
        valueCents: deals.valueCents,
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
        dealName: deals.name,
        companyName: companies.name,
      })
      .from(activities)
      .leftJoin(deals, eq(activities.dealId, deals.id))
      .leftJoin(companies, eq(activities.companyId, companies.id))
      .orderBy(desc(activities.occurredAt))
      .limit(16),
    db
      .select({
        companies: sql<number>`count(distinct ${companies.id})`,
        contacts: sql<number>`(select count(*) from ${contacts})`,
        pipelineCents: sql<number>`coalesce(sum(${deals.valueCents}), 0)`,
        openTasks: sql<number>`(select count(*) from ${salesTasks} where ${salesTasks.status} = 'open')`,
      })
      .from(companies)
      .leftJoin(deals, eq(companies.id, deals.companyId)),
  ]);

  const stats = statsRows[0] ?? { companies: 0, contacts: 0, pipelineCents: 0, openTasks: 0 };

  return (
    <CrmShell
      username={session.username}
      title="Simple HubSpot-style control center"
      description="Track pipeline, enforce next steps, and run a clean follow-up cadence for your SMB opportunities."
    >

      <section className="grid gap-4 md:grid-cols-4">
        <Card title="Accounts" value={String(stats.companies)} subtitle="Active SMB accounts" />
        <Card title="Contacts" value={String(stats.contacts)} subtitle="People in your funnel" />
        <Card
          title="Pipeline Value"
          value={currency.format(Math.round((stats.pipelineCents ?? 0) / 100))}
          subtitle="Total tracked opportunity value"
        />
        <Card title="Open Tasks" value={String(stats.openTasks)} subtitle="Follow-ups due soon" />
      </section>

      <section className="grid gap-6">
        <form action={createTask} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Create follow-up task</h2>
          <div className="mt-4 space-y-3">
            <Field label="Task title" name="title" required placeholder="Call procurement manager" />
            <Field label="Due date" name="dueDate" type="date" required />
            <Field label="Assigned to" name="assignedTo" placeholder="Austin" />
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              <span>Opportunity</span>
              <select name="dealId" className="rounded-md border border-slate-300 px-3 py-2 text-slate-900">
                <option value="">None</option>
                {dealRows.map((deal) => (
                  <option key={deal.id} value={deal.id}>
                    {deal.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              <span>Account</span>
              <select name="companyId" className="rounded-md border border-slate-300 px-3 py-2 text-slate-900">
                <option value="">None</option>
                {companyRows.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white" type="submit">
            Save task
          </button>
        </form>

      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Opportunities with next steps</h2>
          <ul className="mt-4 space-y-3">
            {dealRows.length === 0 ? <li className="text-sm text-slate-500">No opportunities yet.</li> : null}
            {dealRows.map((deal) => {
              const stepLate = Boolean(deal.nextStepDueDate && deal.nextStepDueDate < today && deal.stage !== "won" && deal.stage !== "lost");

              return (
                <li key={deal.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-slate-900">{deal.name}</p>
                      <p className="text-sm text-slate-600">
                        {deal.companyName ?? "No account"} • {deal.stage} • Owner: {deal.ownerName ?? "Unassigned"}
                      </p>
                      <p className="mt-2 text-sm text-slate-800">Next step: {deal.nextStep || "Not set"}</p>
                    </div>
                    <p className="text-sm font-medium text-slate-700">{currency.format(Math.round(deal.valueCents / 100))}</p>
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

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Task reminders</h2>
          <ul className="mt-4 space-y-3">
            {taskRows.length === 0 ? <li className="text-sm text-slate-500">No tasks yet.</li> : null}
            {taskRows.map((task) => {
              const overdue = task.status === "open" && task.dueDate < today;
              return (
                <li key={task.id} className="rounded-lg border border-slate-200 p-3">
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
                        <button type="submit" className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700">
                          Mark done
                        </button>
                      </form>
                    ) : (
                      <span className="rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">Done</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </article>
      </section>

      <section>
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Recent activity timeline</h2>
          <ul className="mt-4 space-y-3">
            {activityRows.length === 0 ? <li className="text-sm text-slate-500">No activity logged yet.</li> : null}
            {activityRows.map((item) => (
              <li key={item.id} className="rounded-lg border border-slate-200 p-3">
                <p className="text-sm uppercase tracking-wide text-slate-500">{item.type}</p>
                <p className="mt-1 font-medium text-slate-900">{item.notes}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {item.dealName ?? item.companyName ?? "General"} • {new Date(item.occurredAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        </article>
      </section>

    </CrmShell>
  );
}






