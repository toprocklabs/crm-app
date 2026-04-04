import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createContact, createDeal, logActivity, updateActivityDate, updateCompanyField, updateContactField } from "@/app/actions";
import { AutoSaveActivityDateField } from "@/components/auto-save-activity-date-field";
import { AutoSaveCompanyField } from "@/components/auto-save-company-field";
import { AutoSaveCompanySelectField } from "@/components/auto-save-company-select-field";
import { AutoSaveContactField } from "@/components/auto-save-contact-field";
import { CallLink } from "@/components/call-link";
import { CollapsibleFormSection } from "@/components/collapsible-form-section";
import { CrmShell } from "@/components/crm-shell";
import { requireUser } from "@/lib/auth";
import { companyIndustries } from "@/lib/company-industries";
import { normalizeCompanyIndustry } from "@/lib/company-industry-utils";
import { getDb } from "@/lib/db";
import { activities, companies, contacts, deals, salesTasks, users } from "@/lib/schema";

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
        loggedByUsername: users.username,
      })
      .from(activities)
      .leftJoin(deals, eq(activities.dealId, deals.id))
      .leftJoin(users, eq(activities.loggedByUserId, users.id))
      .where(eq(activities.companyId, companyId))
      .orderBy(desc(activities.occurredAt)),
  ]);

  if (!company) {
    notFound();
  }

  const normalizedIndustry = normalizeCompanyIndustry(company.industry) ?? "";
  const openTasks = companyTasks.filter((task) => task.status === "open").length;
  const totalIarrCents = companyDeals.reduce((sum, deal) => sum + deal.valueCents, 0);
  const totalImplementationCostCents = companyDeals.reduce((sum, deal) => sum + deal.implementationCostCents, 0);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <CrmShell
      username={session.username}
      title={company.name}
      description="Account detail with all associated people, opportunities, tasks, and timeline."
    >
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div className="w-full max-w-4xl rounded-xl border border-slate-200 bg-white p-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)]">
            <AutoSaveCompanySelectField
              action={updateCompanyField}
              companyId={company.id}
              field="industry"
              label="Industry"
              defaultValue={normalizedIndustry}
              options={companyIndustries}
            />
            <AutoSaveCompanyField
              action={updateCompanyField}
              companyId={company.id}
              field="website"
              label="Website"
              type="url"
              defaultValue={company.website ?? ""}
              emptyText="No website"
            />
            <AutoSaveCompanyField
              action={updateCompanyField}
              companyId={company.id}
              field="customerProjectUrl"
              label="Customer Project URL"
              type="url"
              defaultValue={company.customerProjectUrl ?? ""}
            />
            <AutoSaveCompanyField
              action={updateCompanyField}
              companyId={company.id}
              field="nextStep"
              label="Account next step"
              defaultValue={company.nextStep}
              emptyText="No account next step"
            />
            <AutoSaveCompanyField
              action={updateCompanyField}
              companyId={company.id}
              field="nextStepDueDate"
              label="Account next step date"
              type="date"
              defaultValue={company.nextStepDueDate ?? ""}
              emptyText="No next step date"
            />
          </div>
        </div>
        <div className="flex flex-col items-start gap-3 md:items-end">
          <div className="text-sm text-slate-600">Created: {new Date(company.createdAt).toLocaleDateString()}</div>
          <Link href="/accounts" className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700">
            Back to Accounts
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
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
          <p className="text-xs uppercase tracking-wide text-slate-500">Total ARR</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {currency.format(Math.round(totalIarrCents / 100))}
          </p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total Implementation Cost</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {currency.format(Math.round(totalImplementationCostCents / 100))}
          </p>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Contacts</h2>
          <CollapsibleFormSection title="Add contact" description="Create a contact inside this account." className="mt-4">
            <form action={createContact}>
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
          </CollapsibleFormSection>
          <ul className="mt-4 space-y-3">
            {companyContacts.length === 0 ? <li className="text-sm text-slate-500">No contacts yet.</li> : null}
            {companyContacts.map((contact) => (
              <li key={contact.id} className="rounded-lg border border-slate-200 p-3">
                <p className="font-medium text-slate-900">
                  <Link href={`/contacts/${contact.id}`} className="underline decoration-slate-300 underline-offset-2">
                    {contact.firstName} {contact.lastName}
                  </Link>
                </p>
                <div className="mt-2 grid gap-2">
                  <AutoSaveContactField
                    action={updateContactField}
                    contactId={contact.id}
                    field="title"
                    label="Title"
                    defaultValue={contact.title ?? ""}
                    returnPath={`/accounts/${company.id}`}
                  />
                  <AutoSaveContactField
                    action={updateContactField}
                    contactId={contact.id}
                    field="email"
                    label="Email"
                    type="email"
                    defaultValue={contact.email ?? ""}
                    returnPath={`/accounts/${company.id}`}
                  />
                  <AutoSaveContactField
                    action={updateContactField}
                    contactId={contact.id}
                    field="phone"
                    label="Phone"
                    type="tel"
                    defaultValue={contact.phone ?? ""}
                    returnPath={`/accounts/${company.id}`}
                  />
                </div>
                <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                  <CallLink phone={contact.phone} />
                </div>
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Opportunities</h2>
          <CollapsibleFormSection title="Create Opportunity" description="Add a new opportunity for this account." className="mt-4">
            <form action={createDeal}>
              <input type="hidden" name="companyId" value={company.id} />
              <div className="grid gap-2 md:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm text-slate-700 md:col-span-2">
                  <span>Opportunity name</span>
                  <input name="name" required className="rounded-md border border-slate-300 px-3 py-2 text-slate-900" />
                </label>
                <label className="flex flex-col gap-1 text-sm text-slate-700">
                  <span>Stage</span>
                  <select name="stage" defaultValue="lead" className="rounded-md border border-slate-300 px-3 py-2 text-slate-900">
                    <option value="lead">Lead</option>
                    <option value="qualified">Qualified</option>
                    <option value="proposal">Proposal</option>
                    <option value="negotiation">Negotiation</option>
                    <option value="won">Won</option>
                    <option value="lost">Lost</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm text-slate-700">
                  <span>IARR (USD)</span>
                  <input name="iarrUsd" type="number" placeholder="5000" className="rounded-md border border-slate-300 px-3 py-2 text-slate-900" />
                </label>
                <label className="flex flex-col gap-1 text-sm text-slate-700">
                  <span>Implementation Cost (USD)</span>
                  <input
                    name="implementationCostUsd"
                    type="number"
                    placeholder="1500"
                    className="rounded-md border border-slate-300 px-3 py-2 text-slate-900"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm text-slate-700">
                  <span>Opportunity owner</span>
                  <input name="ownerName" placeholder="Justin" className="rounded-md border border-slate-300 px-3 py-2 text-slate-900" />
                </label>
                <label className="flex flex-col gap-1 text-sm text-slate-700 md:col-span-2">
                  <span>Next step</span>
                  <input
                    name="nextStep"
                    required
                    placeholder="Send proposal draft"
                    className="rounded-md border border-slate-300 px-3 py-2 text-slate-900"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm text-slate-700">
                  <span>Next step due</span>
                  <input name="nextStepDueDate" type="date" className="rounded-md border border-slate-300 px-3 py-2 text-slate-900" />
                </label>
                <label className="flex flex-col gap-1 text-sm text-slate-700">
                  <span>Expected close</span>
                  <input name="expectedCloseDate" type="date" className="rounded-md border border-slate-300 px-3 py-2 text-slate-900" />
                </label>
              </div>
              <button type="submit" className="mt-3 rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white">
                Create Opportunity
              </button>
            </form>
          </CollapsibleFormSection>
          <ul className="mt-4 space-y-3">
            {companyDeals.length === 0 ? <li className="text-sm text-slate-500">No opportunities yet.</li> : null}
            {companyDeals.map((deal) => (
              <li key={deal.id} className="rounded-lg border border-slate-200 p-3">
                <p className="font-medium text-slate-900"><Link href={`/opportunities/${deal.id}`} className="underline decoration-slate-300 underline-offset-2">{deal.name}</Link></p>
                <p className="text-sm text-slate-600">{deal.stage} • Owner: {deal.ownerName ?? "Unassigned"}</p>
                <p className="text-sm text-slate-700">
                  IARR: {currency.format(Math.round(deal.valueCents / 100))} • Implementation Cost: {currency.format(Math.round(deal.implementationCostCents / 100))}
                </p>
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
          <CollapsibleFormSection title="Log activity" description="Capture a note, call, meeting, or email." className="mt-4">
            <form action={logActivity}>
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
                    <option value="linkedin">LinkedIn</option>
                    <option value="task">Task</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm text-slate-700">
                  <span>Opportunity (optional)</span>
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
                <label className="flex flex-col gap-1 text-sm text-slate-700">
                  <span>Activity date</span>
                  <input
                    name="occurredOn"
                    type="date"
                    defaultValue={today}
                    className="rounded-md border border-slate-300 px-3 py-2 text-slate-900"
                  />
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
          </CollapsibleFormSection>
          <ul className="mt-4 space-y-3">
            {companyActivities.length === 0 ? <li className="text-sm text-slate-500">No activity yet.</li> : null}
            {companyActivities.map((item) => (
              <li key={item.id} className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">{item.type}</p>
                <p className="mt-1 font-medium text-slate-900">{item.notes}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {item.dealName ?? "General"} • {new Date(item.occurredAt).toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-slate-500">Logged by {item.loggedByUsername ?? "Unknown user"}</p>
                <AutoSaveActivityDateField
                  action={updateActivityDate}
                  activityId={item.id}
                  defaultValue={new Date(item.occurredAt).toISOString().slice(0, 10)}
                  returnPath={`/accounts/${company.id}`}
                />
              </li>
            ))}
          </ul>
        </article>
      </section>
    </CrmShell>
  );
}
