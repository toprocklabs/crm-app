import { desc, eq } from "drizzle-orm";
import { logActivity } from "@/app/actions";
import { ActivityTimeline } from "@/components/activity-timeline";
import { CollapsibleFormSection } from "@/components/collapsible-form-section";
import { CrmShell } from "@/components/crm-shell";
import { activityTypeOptions, getActivityMeta } from "@/lib/activity-ui";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { activities, companies, contacts, deals, users } from "@/lib/schema";

export const dynamic = "force-dynamic";

export default async function ActivitiesPage() {
  const session = await requireUser();
  const db = getDb();

  if (!db) {
    return null;
  }

  const [activityRows, dealRows, contactRows, companyRows] = await Promise.all([
    db
      .select({
        id: activities.id,
        type: activities.type,
        notes: activities.notes,
        occurredAt: activities.occurredAt,
        dealId: deals.id,
        dealName: deals.name,
        contactFirstName: contacts.firstName,
        contactLastName: contacts.lastName,
        contactId: contacts.id,
        companyId: companies.id,
        companyName: companies.name,
        loggedByUsername: users.username,
      })
      .from(activities)
      .leftJoin(deals, eq(activities.dealId, deals.id))
      .leftJoin(contacts, eq(activities.contactId, contacts.id))
      .leftJoin(companies, eq(activities.companyId, companies.id))
      .leftJoin(users, eq(activities.loggedByUserId, users.id))
      .orderBy(desc(activities.occurredAt)),
    db.select({ id: deals.id, name: deals.name }).from(deals).orderBy(desc(deals.createdAt)),
    db.select({ id: contacts.id, firstName: contacts.firstName, lastName: contacts.lastName }).from(contacts).orderBy(desc(contacts.createdAt)),
    db.select({ id: companies.id, name: companies.name }).from(companies).orderBy(desc(companies.createdAt)),
  ]);

  return (
    <CrmShell
      username={session.username}
      title="Activities"
      description="A full timeline of opportunity and account interactions across your team."
    >
      <section className="grid gap-6 lg:grid-cols-3">
        <CollapsibleFormSection
          title="Log activity"
          description="Expand to add a call, meeting, note, or email."
          className="lg:col-span-1"
        >
          <form action={logActivity}>
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
                <span>Notes</span>
                <textarea
                  name="notes"
                  required
                  rows={4}
                  className="rounded-md border border-slate-300 px-3 py-2 text-slate-900"
                  placeholder="Shared ROI estimate and waiting on budget confirmation."
                />
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
                <span>Contact</span>
                <select name="contactId" className="rounded-md border border-slate-300 px-3 py-2 text-slate-900">
                  <option value="">None</option>
                  {contactRows.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.firstName} {contact.lastName}
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
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                <span>Activity date</span>
                <input name="occurredOn" type="date" className="rounded-md border border-slate-300 px-3 py-2 text-slate-900" />
              </label>
            </div>
            <button type="submit" className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white">
              Save activity
            </button>
          </form>
        </CollapsibleFormSection>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-900">Timeline</h2>
          <ActivityTimeline
            emptyMessage="No activity yet."
            items={activityRows.map((item) => ({
              id: item.id,
              type: item.type,
              notes: item.notes,
              occurredAt: item.occurredAt,
              loggedByUsername: item.loggedByUsername,
              contextLinks: [
                item.dealName && item.dealId ? { label: item.dealName, href: `/opportunities/${item.dealId}` } : null,
                item.companyName && item.companyId ? { label: item.companyName, href: `/accounts/${item.companyId}` } : null,
                item.contactFirstName && item.contactId
                  ? { label: `${item.contactFirstName} ${item.contactLastName}`, href: `/contacts/${item.contactId}` }
                  : null,
              ].filter((value): value is { label: string; href?: string } => Boolean(value)),
            }))}
          />
        </article>
      </section>
    </CrmShell>
  );
}
