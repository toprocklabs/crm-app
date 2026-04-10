import { desc, eq } from "drizzle-orm";
import { completeTask, createTask } from "@/app/actions";
import { CollapsibleFormSection } from "@/components/collapsible-form-section";
import { CrmShell } from "@/components/crm-shell";
import { EmptyState } from "@/components/empty-state";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { companies, deals, salesTasks, users } from "@/lib/schema";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const session = await requireUser();
  const db = getDb();

  if (!db) {
    return null;
  }

  const [taskRows, dealRows, companyRows, userRows] = await Promise.all([
    db
      .select({
        id: salesTasks.id,
        title: salesTasks.title,
        status: salesTasks.status,
        dueDate: salesTasks.dueDate,
        assignedTo: salesTasks.assignedTo,
        dealName: deals.name,
        companyName: companies.name,
      })
      .from(salesTasks)
      .leftJoin(deals, eq(salesTasks.dealId, deals.id))
      .leftJoin(companies, eq(salesTasks.companyId, companies.id))
      .orderBy(salesTasks.dueDate, desc(salesTasks.createdAt)),
    db.select({ id: deals.id, name: deals.name }).from(deals).orderBy(desc(deals.createdAt)),
    db.select({ id: companies.id, name: companies.name }).from(companies).orderBy(desc(companies.createdAt)),
    db.select({ id: users.id, username: users.username, displayName: users.displayName }).from(users).orderBy(users.username),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const openTasks = taskRows.filter((task) => task.status === "open");
  const completedTasks = taskRows.filter((task) => task.status === "done");

  return (
    <CrmShell
      username={session.username}
      title="Tasks"
      description="Manage follow-up reminders and close the loop on every open opportunity."
    >
      <section className="grid gap-6 lg:grid-cols-3">
        <CollapsibleFormSection
          title="New task"
          description="Expand to create a follow-up reminder."
          className="lg:col-span-1"
        >
          <form action={createTask}>
            <input type="hidden" name="returnPath" value="/tasks" />
            <div className="space-y-3">
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                <span>Title</span>
                <input name="title" required className="rounded-md border border-slate-300 px-3 py-2 text-slate-900" />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                <span>Due date</span>
                <input name="dueDate" type="date" required className="rounded-md border border-slate-300 px-3 py-2 text-slate-900" />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                <span>Assigned to</span>
                <select
                  name="assignedTo"
                  defaultValue={session.username}
                  className="rounded-md border border-slate-300 px-3 py-2 text-slate-900"
                >
                  <option value="">Unassigned</option>
                  {userRows.map((user) => (
                    <option key={user.id} value={user.username}>
                      {user.displayName ? `${user.displayName} (${user.username})` : user.username}
                    </option>
                  ))}
                </select>
              </label>
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
            <button type="submit" className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
              Save task
            </button>
          </form>
        </CollapsibleFormSection>

        <article className="gong-panel rounded-xl p-5 lg:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Open reminders</h2>
              <p className="mt-1 text-sm text-slate-600">Work the active follow-ups here. Completed tasks stay tucked away below.</p>
            </div>
            <span className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700">
              {openTasks.length} open
            </span>
          </div>
          <ul className="mt-4 space-y-3">
            {openTasks.length === 0 ? <li><EmptyState icon="task" message="No open tasks right now." /></li> : null}
            {openTasks.map((task) => {
              const overdue = task.status === "open" && task.dueDate < today;
              return (
                <li key={task.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">{task.title}</p>
                      <p className="text-sm text-slate-600">
                        {task.dealName ?? task.companyName ?? "General"} • {task.assignedTo ?? "Unassigned"}
                      </p>
                      <p className={`mt-1 text-xs ${overdue ? "text-red-700" : "text-slate-500"}`}>Due {task.dueDate}</p>
                    </div>
                    {task.status === "open" ? (
                      <form action={completeTask}>
                        <input type="hidden" name="taskId" value={task.id} />
                        <input type="hidden" name="returnPath" value="/tasks" />
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
            title={`Completed tasks (${completedTasks.length})`}
            description="Expand to review finished follow-ups."
            className="mt-5 border-slate-200 bg-slate-50/70"
          >
            <ul className="space-y-3">
              {completedTasks.length === 0 ? <li><EmptyState icon="task" message="No completed tasks yet." /></li> : null}
              {completedTasks.map((task) => (
                <li key={task.id} className="rounded-lg border border-slate-200 bg-white p-3">
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
    </CrmShell>
  );
}
