import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { CallLink } from "@/components/call-link";
import { CrmShell } from "@/components/crm-shell";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { companies, contacts } from "@/lib/schema";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const session = await requireUser();
  const db = getDb();

  if (!db) {
    return null;
  }

  const rows = await db
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
    .orderBy(desc(contacts.createdAt));

  return (
    <CrmShell
      username={session.username}
      title="Contacts"
      description="Every person in your CRM with linked account context."
    >
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="overflow-x-auto">
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
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-slate-500">No contacts yet.</td>
                </tr>
              ) : null}
              {rows.map((row) => (
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
