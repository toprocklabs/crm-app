import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createContact, logActivity } from "@/app/actions";
import { CallLink } from "@/components/call-link";
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

export default async function AccountDetailPage({ params }: Props) {
  const session = await requireUser();
  const db = getDb();

  if (!db) {
    return null;
  }

  const { id } = await params;
  const companyId = Number(id);

  if (!Number.isInteger(companyId) || companyId <= 0) {
    notFound();
  }

  const [company, companyContacts, companyDeals, companyTasks, companyActivities] = await Promise.all([
    db.query.companies.findFirst({ where: eq(companies.id, companyId) }),
    db.select().from(contacts).where(eq(contacts.companyId, companyId)).orderBy(desc(contacts.createdAt)),
    db.select().from(deals).where(eq(deals.companyId, companyId)).orderBy(desc(deals.createdAt)),
    db.select().from(salesTasks).where(eq(salesTasks.companyId, companyId)).orderBy(salesTasks.dueDate),
    db
      .select({
        id: activities.id,
        type: activities.type,
        notes: activities.notes,
        occurredAt: activities.occurredAt,
        dealName: deals.name,
      })
      .from(activities)
      .leftJoin(deals, eq(activities.dealId, deals.id))
      .where(eq(activities.companyId, companyId))
      .orderBy(desc(activities.occurredAt)),
  ]);

  if (!company) {
    notFound();
  }

  const openTasks = companyTasks.filter((task) => task.status === "open").length;

  return (
    <CrmShell
      username={session.username}
      title={company.name}
      description="Account detail with all associated people, opportunities, tasks, and timeline."
    >
      <section className="flex items-center justify-between gap-4">
        <div className="text-sm text-slate-600">
          <p>{company.industry ?? "No industry"}</p>
          <p>{company.website ?? "No website"}</p>
        </div>
        <Link href="/accounts" className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700">
          Back to Accounts
        </Link>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Contacts</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{companyContacts.length}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Opportunities</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{companyDeals.length}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Open Tasks</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{openTasks}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Pipeline Value</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {currency.format(Math.round(companyDeals.reduce((sum, deal) => sum + deal.valueCents, 0) / 100))}
          </p>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Contacts</h2>
          <form action={createContact} className="mt-4 rounded-lg border border-slate-200 p-3">
            <input type="hidden" name="companyId" value={company.id} />
            <div className="grid gap-2 md:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                <span>First name</span>
                <input name="firstName" required className="rounded-md border border-slate-300 px-3 py-2 text-slate-900" />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                <span>Last name</span>
                <input name="lastName" required className="rounded-md border border-slate-300 px-3 py-2 text-slate-900" />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                <span>Email</span>
                <input name="email" type="email" className="rounded-md border border-slate-300 px-3 py-2 text-slate-900" />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                <span>Phone</span>
                <input name="phone" type="tel" className="rounded-md border border-slate-300 px-3 py-2 text-slate-900" />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                <span>Title</span>
                <input name="title" className="rounded-md border border-slate-300 px-3 py-2 text-slate-900" />
              </label>
            </div>
            <button type="submit" className="mt-3 rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white">
              Add contact
            </button>
          </form>
          <ul className="mt-4 space-y-3">
            {companyContacts.length === 0 ? <li className="text-sm text-slate-500">No contacts yet.</li> : null}
            {companyContacts.map((contact) => (
              <li key={contact.id} className="rounded-lg border border-slate-200 p-3">
                <p className="font-medium text-slate-900">
                  <Link href={`/contacts/${contact.id}`} className="underline decoration-slate-300 underline-offset-2">
                    {contact.firstName} {contact.lastName}
                  </Link>
                </p>
                <p className="text-sm text-slate-600">{contact.title ?? "No title"}</p>
                <p className="text-sm text-slate-600">{contact.email ?? "No email"}</p>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <span>{contact.phone ?? "No phone"}</span>
                  <CallLink phone={contact.phone} />
                </div>
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Opportunities</h2>
          <ul className="mt-4 space-y-3">
            {companyDeals.length === 0 ? <li className="text-sm text-slate-500">No opportunities yet.</li> : null}
            {companyDeals.map((deal) => (
              <li key={deal.id} className="rounded-lg border border-slate-200 p-3">
                <p className="font-medium text-slate-900">{deal.name}</p>
                <p className="text-sm text-slate-600">{deal.stage} • Owner: {deal.ownerName ?? "Unassigned"}</p>
                <p className="text-sm text-slate-700">{currency.format(Math.round(deal.valueCents / 100))}</p>
                <p className="mt-1 text-xs text-slate-500">Next step: {deal.nextStep || "No next step"}</p>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Tasks</h2>
          <ul className="mt-4 space-y-3">
            {companyTasks.length === 0 ? <li className="text-sm text-slate-500">No tasks yet.</li> : null}
            {companyTasks.map((task) => (
              <li key={task.id} className="rounded-lg border border-slate-200 p-3">
                <p className="font-medium text-slate-900">{task.title}</p>
                <p className="text-sm text-slate-600">Due {task.dueDate} • {task.assignedTo ?? "Unassigned"}</p>
                <p className="text-xs text-slate-500">Status: {task.status}</p>
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Activity Timeline</h2>
          <form action={logActivity} className="mt-4 rounded-lg border border-slate-200 p-3">
            <input type="hidden" name="companyId" value={company.id} />
            <input type="hidden" name="returnPath" value={`/accounts/${company.id}`} />
            <div className="grid gap-2 md:grid-cols-2">
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
                <span>Deal (optional)</span>
                <select name="dealId" className="rounded-md border border-slate-300 px-3 py-2 text-slate-900">
                  <option value="">None</option>
                  {companyDeals.map((deal) => (
                    <option key={deal.id} value={deal.id}>
                      {deal.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700 md:col-span-2">
                <span>Contact (optional)</span>
                <select name="contactId" className="rounded-md border border-slate-300 px-3 py-2 text-slate-900">
                  <option value="">None</option>
                  {companyContacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.firstName} {contact.lastName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700 md:col-span-2">
                <span>Notes</span>
                <textarea
                  name="notes"
                  required
                  rows={3}
                  className="rounded-md border border-slate-300 px-3 py-2 text-slate-900"
                  placeholder="Add a quick note about this account interaction."
                />
              </label>
            </div>
            <button type="submit" className="mt-3 rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white">
              Save activity
            </button>
          </form>
          <ul className="mt-4 space-y-3">
            {companyActivities.length === 0 ? <li className="text-sm text-slate-500">No activity yet.</li> : null}
            {companyActivities.map((item) => (
              <li key={item.id} className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">{item.type}</p>
                <p className="mt-1 font-medium text-slate-900">{item.notes}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {item.dealName ?? "General"} • {new Date(item.occurredAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </CrmShell>
  );
}
