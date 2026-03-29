import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { logActivity, updateContactField } from "@/app/actions";
import { AutoSaveContactField } from "@/components/auto-save-contact-field";
import { CallLink } from "@/components/call-link";
import { CollapsibleFormSection } from "@/components/collapsible-form-section";
import { CrmShell } from "@/components/crm-shell";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { activities, companies, contacts, deals } from "@/lib/schema";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export default async function ContactDetailPage({ params }: Props) {
  const session = await requireUser();
  const db = getDb();

  if (!db) {
    return null;
  }

  const { id } = await params;
  const contactId = Number(id);

  if (!Number.isInteger(contactId) || contactId <= 0) {
    notFound();
  }

  const contact = await db
    .select({
      id: contacts.id,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      email: contacts.email,
      phone: contacts.phone,
      title: contacts.title,
      createdAt: contacts.createdAt,
      companyId: companies.id,
      companyName: companies.name,
    })
    .from(contacts)
    .leftJoin(companies, eq(contacts.companyId, companies.id))
    .where(eq(contacts.id, contactId))
    .then((rows) => rows[0]);

  if (!contact) {
    notFound();
  }

  const [activityRows, relatedDeals, accountDeals] = await Promise.all([
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
      .where(eq(activities.contactId, contactId))
      .orderBy(desc(activities.occurredAt)),
    db
      .select({
        id: deals.id,
        name: deals.name,
        stage: deals.stage,
        valueCents: deals.valueCents,
        expectedCloseDate: deals.expectedCloseDate,
      })
      .from(deals)
      .where(eq(deals.primaryContactId, contactId))
      .orderBy(desc(deals.createdAt)),
    contact.companyId
      ? db
          .select({
            id: deals.id,
            name: deals.name,
          })
          .from(deals)
          .where(eq(deals.companyId, contact.companyId))
          .orderBy(desc(deals.createdAt))
      : Promise.resolve([]),
  ]);

  const dealOptions = accountDeals.length > 0 ? accountDeals : relatedDeals.map((deal) => ({ id: deal.id, name: deal.name }));

  return (
    <CrmShell
      username={session.username}
      title={`${contact.firstName} ${contact.lastName}`}
      description="Contact profile with linked account context, activity history, and related opportunities."
    >
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div className="w-full max-w-3xl rounded-xl border border-slate-200 bg-white p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <AutoSaveContactField
              action={updateContactField}
              contactId={contact.id}
              field="title"
              label="Title"
              defaultValue={contact.title ?? ""}
            />
            <AutoSaveContactField
              action={updateContactField}
              contactId={contact.id}
              field="email"
              label="Email"
              type="email"
              defaultValue={contact.email ?? ""}
            />
            <div className="space-y-2">
              <AutoSaveContactField
                action={updateContactField}
                contactId={contact.id}
                field="phone"
                label="Phone"
                type="tel"
                defaultValue={contact.phone ?? ""}
              />
              <CallLink phone={contact.phone} />
            </div>
          </div>

          <p className="mt-3 text-sm text-slate-600">
            Account:{" "}
            {contact.companyId ? (
              <Link href={`/accounts/${contact.companyId}`} className="underline decoration-slate-300 underline-offset-2">
                {contact.companyName}
              </Link>
            ) : (
              "No account"
            )}
          </p>
        </div>

        <div className="text-sm text-slate-600">Created: {new Date(contact.createdAt).toLocaleDateString()}</div>

        <Link href="/contacts" className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700">
          Back to Contacts
        </Link>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Activity Timeline</h2>
          <CollapsibleFormSection title="Log activity" description="Capture a note, call, meeting, or email." className="mt-4">
            <form action={logActivity}>
              <input type="hidden" name="contactId" value={contact.id} />
              <input type="hidden" name="companyId" value={contact.companyId ?? ""} />
              <input type="hidden" name="returnPath" value={`/contacts/${contact.id}`} />
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
                  <span>Opportunity (optional)</span>
                  <select name="dealId" className="rounded-md border border-slate-300 px-3 py-2 text-slate-900">
                    <option value="">None</option>
                    {dealOptions.map((deal) => (
                      <option key={deal.id} value={deal.id}>
                        {deal.name}
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
                    placeholder="Add a quick note about this contact interaction."
                  />
                </label>
              </div>
              <button type="submit" className="mt-3 rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white">
                Save activity
              </button>
            </form>
          </CollapsibleFormSection>
          <ul className="mt-4 space-y-3">
            {activityRows.length === 0 ? <li className="text-sm text-slate-500">No activity yet for this contact.</li> : null}
            {activityRows.map((item) => (
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

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Related Opportunities</h2>
          <ul className="mt-4 space-y-3">
            {relatedDeals.length === 0 ? <li className="text-sm text-slate-500">No opportunities set with this as primary contact yet.</li> : null}
            {relatedDeals.map((deal) => (
              <li key={deal.id} className="rounded-lg border border-slate-200 p-3">
                <p className="font-medium text-slate-900">{deal.name}</p>
                <p className="text-sm text-slate-600">{deal.stage}</p>
                <p className="text-sm text-slate-700">{currency.format(Math.round(deal.valueCents / 100))}</p>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </CrmShell>
  );
}
