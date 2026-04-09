import { desc, eq, isNull, ne, or } from "drizzle-orm";
import Link from "next/link";
import { createContact } from "@/app/actions";
import { CallLink } from "@/components/call-link";
import { CollapsibleFormSection } from "@/components/collapsible-form-section";
import { CrmShell } from "@/components/crm-shell";
import { SearchInput } from "@/components/search-input";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { companies, contacts } from "@/lib/schema";

export const dynamic = "force-dynamic";

type ContactsPageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function ContactsPage({ searchParams }: ContactsPageProps) {
  const session = await requireUser();
  const db = getDb();

  if (!db) {
    return null;
  }

  const [rows, companyRows] = await Promise.all([
    db
      .select({
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        email: contacts.email,
        phone: contacts.phone,
        linkedinProfileUrl: contacts.linkedinProfileUrl,
        title: contacts.title,
        companyId: companies.id,
        companyName: companies.name,
        createdAt: contacts.createdAt,
      })
      .from(contacts)
      .leftJoin(companies, eq(contacts.companyId, companies.id))
      .where(or(isNull(contacts.companyId), ne(companies.stage, "closed_lost")))
      .orderBy(desc(contacts.createdAt)),
    db
      .select({ id: companies.id, name: companies.name })
      .from(companies)
      .where(ne(companies.stage, "closed_lost"))
      .orderBy(desc(companies.createdAt)),
  ]);

  const params = await searchParams;
  const search = (params.q ?? "").trim().toLowerCase();
  const filtered = rows.filter((row) => {
    if (!search) return true;
    const name = `${row.firstName} ${row.lastName}`.toLowerCase();
    const email = (row.email ?? "").toLowerCase();
    const company = (row.companyName ?? "").toLowerCase();
    return name.includes(search) || email.includes(search) || company.includes(search);
  });

  return (
    <CrmShell
      username={session.username}
      title="Contacts"
      description="Every person in your CRM with linked account context."
    >
      <section className="gong-panel rounded-xl p-5">
        <CollapsibleFormSection title="Add contact" description="Create a new contact and optionally assign to an account.">
          <form action={createContact}>
            <div className="grid gap-3 md:grid-cols-2">
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
                <input name="phone" className="rounded-md border border-slate-300 px-3 py-2 text-slate-900" />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                <span>Title</span>
                <input name="title" className="rounded-md border border-slate-300 px-3 py-2 text-slate-900" />
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
              <label className="flex flex-col gap-1 text-sm text-slate-700 md:col-span-2">
                <span>LinkedIn URL</span>
                <input name="linkedinProfileUrl" placeholder="https://linkedin.com/in/..." className="rounded-md border border-slate-300 px-3 py-2 text-slate-900" />
              </label>
            </div>
            <button type="submit" className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
              Save contact
            </button>
          </form>
        </CollapsibleFormSection>
      </section>

      <section className="gong-panel rounded-xl p-5">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <p className="text-sm font-semibold text-slate-700">{filtered.length} contacts</p>
          <SearchInput placeholder="Search contacts..." />
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-slate-500">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Account</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Phone</th>
                <th className="px-3 py-2">LinkedIn</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-slate-500">{search ? `No contacts matching "${search}".` : "No contacts yet."}</td>
                </tr>
              ) : null}
              {filtered.map((row) => (
                <tr key={row.id} className="border-b border-slate-100">
                  <td className="px-3 py-2">
                    <Link href={`/contacts/${row.id}`} className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-2">
                      {row.firstName} {row.lastName}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-slate-700">{row.title ?? "-"}</td>
                  <td className="px-3 py-2 text-slate-700">
                    {row.companyId ? <Link href={`/accounts/${row.companyId}`} className="underline decoration-slate-300 underline-offset-2">{row.companyName}</Link> : "-"}
                  </td>
                  <td className="px-3 py-2 text-slate-700">{row.email ?? "-"}</td>
                  <td className="px-3 py-2 text-slate-700">
                    {row.phone ? (
                      <div className="flex items-center gap-2">
                        <span>{row.phone}</span>
                        <CallLink phone={row.phone} />
                      </div>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-700">
                    {row.linkedinProfileUrl ? (
                      <a
                        href={row.linkedinProfileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      >
                        View
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </CrmShell>
  );
}
