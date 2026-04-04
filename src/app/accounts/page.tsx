import { desc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { createCompany } from "@/app/actions";
import { CollapsibleFormSection } from "@/components/collapsible-form-section";
import { CrmShell } from "@/components/crm-shell";
import { requireUser } from "@/lib/auth";
import { companyIndustries } from "@/lib/company-industries";
import { normalizeCompanyIndustry } from "@/lib/company-industry-utils";
import { getDb } from "@/lib/db";
import { companies, contacts, deals } from "@/lib/schema";

export const dynamic = "force-dynamic";

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

function SelectField({
  label,
  name,
  options,
}: {
  label: string;
  name: string;
  options: readonly string[];
}) {
  return (
    <label className="flex flex-col gap-1 text-sm text-slate-700">
      <span>{label}</span>
      <select
        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-xs outline-none transition focus:border-slate-500"
        name={name}
        defaultValue=""
      >
        <option value="">Select industry</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export default async function AccountsPage() {
  const session = await requireUser();
  const db = getDb();

  if (!db) {
    return null;
  }

  const today = new Date().toISOString().slice(0, 10);

  const rows = await db
    .select({
      id: companies.id,
      name: companies.name,
      website: companies.website,
      customerProjectUrl: companies.customerProjectUrl,
      industry: companies.industry,
      nextStep: companies.nextStep,
      nextStepDueDate: companies.nextStepDueDate,
      createdAt: companies.createdAt,
      contactCount: sql<number>`count(distinct ${contacts.id})`,
      dealCount: sql<number>`count(distinct ${deals.id})`,
      pipelineCents: sql<number>`coalesce(sum(${deals.valueCents}), 0)`,
    })
    .from(companies)
    .leftJoin(contacts, eq(contacts.companyId, companies.id))
    .leftJoin(deals, eq(deals.companyId, companies.id))
    .groupBy(companies.id)
    .orderBy(desc(companies.createdAt));

  return (
    <CrmShell
      username={session.username}
      title="Accounts"
      description="All account records with contacts, opportunities, and total tracked ARR."
    >
      <section>
        <CollapsibleFormSection title="Add account" description="Create a new account record.">
          <form action={createCompany}>
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
              <Field label="Account name" name="name" required />
              <Field label="Website" name="website" placeholder="https://example.com" />
              <Field label="Customer Project URL" name="customerProjectUrl" placeholder="https://app.example.com/project/123" />
              <SelectField label="Industry" name="industry" options={companyIndustries} />
              <Field label="Next step" name="nextStep" placeholder="Schedule onboarding review" />
              <Field label="Next step date" name="nextStepDueDate" type="date" />
            </div>
            <button className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white" type="submit">
              Save account
            </button>
          </form>
        </CollapsibleFormSection>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-slate-500">
              <tr>
                <th className="px-3 py-2">Account</th>
                <th className="px-3 py-2">Industry</th>
                <th className="px-3 py-2">Contacts</th>
                <th className="px-3 py-2">Opportunities</th>
                <th className="px-3 py-2">Total ARR</th>
                <th className="px-3 py-2">Next step</th>
                <th className="px-3 py-2">Next step due</th>
                <th className="px-3 py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-4 text-slate-500">
                    No accounts yet.
                  </td>
                </tr>
              ) : null}
              {rows.map((row) => {
                const nextStepLate = Boolean(row.nextStepDueDate && row.nextStepDueDate < today);

                return (
                  <tr key={row.id} className="border-b border-slate-100">
                    <td className="px-3 py-2">
                      <p className="font-medium text-slate-900">
                        <Link href={`/accounts/${row.id}`} className="underline decoration-slate-300 underline-offset-2">
                          {row.name}
                        </Link>
                      </p>
                      <p className="text-slate-500">{row.website ?? "No website"}</p>
                      <p className="text-slate-500">{row.customerProjectUrl ?? "No customer project URL"}</p>
                    </td>
                    <td className="px-3 py-2 text-slate-700">{normalizeCompanyIndustry(row.industry) ?? "-"}</td>
                    <td className="px-3 py-2 text-slate-700">{row.contactCount}</td>
                    <td className="px-3 py-2 text-slate-700">{row.dealCount}</td>
                    <td className="px-3 py-2 text-slate-700">${Math.round(row.pipelineCents / 100).toLocaleString()}</td>
                    <td className="px-3 py-2 text-slate-700">{row.nextStep || "-"}</td>
                    <td className={`px-3 py-2 ${nextStepLate ? "text-red-700" : "text-slate-500"}`}>
                      {row.nextStepDueDate ? new Date(`${row.nextStepDueDate}T00:00:00`).toLocaleDateString("en-US") : "-"}
                    </td>
                    <td className="px-3 py-2 text-slate-500">{new Date(row.createdAt).toLocaleDateString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </CrmShell>
  );
}
