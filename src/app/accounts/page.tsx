import { desc } from "drizzle-orm";
import Link from "next/link";
import { createCompany, updateCompanyField } from "@/app/actions";
import { AutoSaveCompanySelectField } from "@/components/auto-save-company-select-field";
import { CollapsibleFormSection } from "@/components/collapsible-form-section";
import { CrmShell } from "@/components/crm-shell";
import { accountStageOptions, getAccountStageLabel } from "@/lib/account-stage";
import { requireUser } from "@/lib/auth";
import { companyIndustries } from "@/lib/company-industries";
import { normalizeCompanyIndustry } from "@/lib/company-industry-utils";
import { getDb } from "@/lib/db";
import { companies, deals } from "@/lib/schema";

export const dynamic = "force-dynamic";

type SortKey = "account" | "stage" | "industry" | "opportunities" | "arr" | "nextStep" | "nextStepDue" | "created";
type SortDirection = "asc" | "desc";
type SelectOption = { value: string; label: string };

type AccountsPageProps = {
  searchParams: Promise<{
    sort?: string;
    dir?: string;
  }>;
};

const sortLabels: Record<SortKey, string> = {
  account: "Account",
  stage: "Stage",
  industry: "Industry",
  opportunities: "Opportunities",
  arr: "Total ARR",
  nextStep: "Next step",
  nextStepDue: "Next step due",
  created: "Created",
};

function getSortKey(value: string | undefined): SortKey {
  const keys: SortKey[] = ["account", "stage", "industry", "opportunities", "arr", "nextStep", "nextStepDue", "created"];
  return keys.includes(value as SortKey) ? (value as SortKey) : "created";
}

function getSortDirection(value: string | undefined): SortDirection {
  return value === "asc" ? "asc" : "desc";
}

function getUrlLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function Field({
  label,
  name,
  type = "text",
  required = false,
  placeholder,
  className,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 text-sm text-slate-700 ${className ?? ""}`}>
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
  defaultValue,
  className,
}: {
  label: string;
  name: string;
  options: readonly SelectOption[];
  defaultValue?: string;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 text-sm text-slate-700 ${className ?? ""}`}>
      <span>{label}</span>
      <select
        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-xs outline-none transition focus:border-slate-500"
        name={name}
        defaultValue={defaultValue ?? ""}
      >
        {defaultValue ? null : <option value="">Select {label.toLowerCase()}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default async function AccountsPage({ searchParams }: AccountsPageProps) {
  const session = await requireUser();
  const db = getDb();

  if (!db) {
    return null;
  }

  const params = await searchParams;
  const sort = getSortKey(params.sort);
  const dir = getSortDirection(params.dir);
  const today = new Date().toISOString().slice(0, 10);
  const accountStageSelectOptions = accountStageOptions.map((stage) => ({
    value: stage,
    label: getAccountStageLabel(stage),
  }));
  const industrySelectOptions = companyIndustries.map((industry) => ({
    value: industry,
    label: industry,
  }));

  const [accountRows, dealRows] = await Promise.all([
    db.select().from(companies).orderBy(desc(companies.createdAt)),
    db.select({ id: deals.id, companyId: deals.companyId, valueCents: deals.valueCents }).from(deals),
  ]);

  const dealCounts = new Map<number, number>();
  const pipelineTotals = new Map<number, number>();
  for (const row of dealRows) {
    if (!row.companyId) {
      continue;
    }

    dealCounts.set(row.companyId, (dealCounts.get(row.companyId) ?? 0) + 1);
    pipelineTotals.set(row.companyId, (pipelineTotals.get(row.companyId) ?? 0) + row.valueCents);
  }

  const rows = accountRows.map((row) => ({
    ...row,
    dealCount: dealCounts.get(row.id) ?? 0,
    pipelineCents: pipelineTotals.get(row.id) ?? 0,
  }));

  rows.sort((a, b) => {
    const direction = dir === "asc" ? 1 : -1;

    switch (sort) {
      case "account":
        return a.name.localeCompare(b.name) * direction;
      case "stage":
        return a.stage.localeCompare(b.stage) * direction;
      case "industry":
        return (a.industry ?? "").localeCompare(b.industry ?? "") * direction;
      case "opportunities":
        return (a.dealCount - b.dealCount) * direction;
      case "arr":
        return (a.pipelineCents - b.pipelineCents) * direction;
      case "nextStep":
        return (a.nextStep ?? "").localeCompare(b.nextStep ?? "") * direction;
      case "nextStepDue":
        return (a.nextStepDueDate ?? "").localeCompare(b.nextStepDueDate ?? "") * direction;
      case "created":
      default:
        return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * direction;
    }
  });

  const activeRows = rows.filter((row) => row.stage !== "closed_lost");
  const closedLostRows = rows.filter((row) => row.stage === "closed_lost");

  function sortHref(key: SortKey) {
    const nextDir: SortDirection = sort === key && dir === "asc" ? "desc" : "asc";
    return `/accounts?sort=${key}&dir=${nextDir}`;
  }

  function sortIndicator(key: SortKey) {
    if (sort !== key) {
      return "↕";
    }

    return dir === "asc" ? "↑" : "↓";
  }

  function renderAccountsTable(tableRows: typeof rows, emptyLabel: string) {
    return (
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="border-b border-slate-200 text-left text-slate-500">
            <tr>
              {(["account", "stage", "industry", "opportunities", "arr", "nextStep", "nextStepDue", "created"] as SortKey[]).map((key) => (
                <th key={key} className="px-3 py-2">
                  <Link href={sortHref(key)} className="inline-flex items-center gap-1 hover:text-slate-700">
                    <span>{sortLabels[key]}</span>
                    <span className="text-xs">{sortIndicator(key)}</span>
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-4 text-slate-500">
                  {emptyLabel}
                </td>
              </tr>
            ) : null}
            {tableRows.map((row) => {
              const nextStepLate = Boolean(row.nextStepDueDate && row.nextStepDueDate < today);

              return (
                <tr key={row.id} className="border-b border-slate-100">
                  <td className="px-3 py-3">
                    <p className="font-medium text-slate-900">
                      <Link href={`/accounts/${row.id}`} className="underline decoration-slate-300 underline-offset-2">
                        {row.name}
                      </Link>
                    </p>
                    <p className="text-slate-500">
                      {row.website ? (
                        <a
                          href={row.website}
                          target="_blank"
                          rel="noreferrer"
                          className="underline decoration-slate-300 underline-offset-2 hover:text-slate-700"
                        >
                          {getUrlLabel(row.website)}
                        </a>
                      ) : "No website"}
                    </p>
                    <p className="text-slate-500">
                      {row.customerProjectUrl ? (
                        <a
                          href={row.customerProjectUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="underline decoration-slate-300 underline-offset-2 hover:text-slate-700"
                        >
                          {getUrlLabel(row.customerProjectUrl)}
                        </a>
                      ) : "No customer project URL"}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    <AutoSaveCompanySelectField
                      action={updateCompanyField}
                      companyId={row.id}
                      field="stage"
                      label="Stage"
                      defaultValue={row.stage}
                      options={accountStageSelectOptions}
                      helperText={null}
                      labelClassName="sr-only"
                      stageToneStyle
                    />
                  </td>
                  <td className="px-3 py-3 text-slate-700">{normalizeCompanyIndustry(row.industry) ?? "-"}</td>
                  <td className="px-3 py-3 text-slate-700">{row.dealCount}</td>
                  <td className="px-3 py-3 text-slate-700">${Math.round(row.pipelineCents / 100).toLocaleString()}</td>
                  <td className="px-3 py-3 text-slate-700">{row.nextStep || "-"}</td>
                  <td className={`px-3 py-3 ${nextStepLate ? "text-red-700" : "text-slate-500"}`}>
                    {row.nextStepDueDate ? new Date(`${row.nextStepDueDate}T00:00:00`).toLocaleDateString("en-US") : "-"}
                  </td>
                  <td className="px-3 py-3 text-slate-500">{new Date(row.createdAt).toLocaleDateString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <CrmShell
      username={session.username}
      title="Accounts"
      description="All account records with opportunities and total tracked ARR."
    >
      <section className="gong-panel rounded-[1.9rem] p-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Quick Capture</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">Add account</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Create a new account record and assign its stage without leaving the accounts workspace.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">{rows.length} accounts</span>
            <span className="inline-flex rounded-full bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-800">{closedLostRows.length} closed lost</span>
          </div>
        </div>
        <div className="mt-4">
          <CollapsibleFormSection title="Open account form" description="Create a new account record.">
              <form action={createCompany}>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Account name" name="name" required />
                  <SelectField label="Stage" name="stage" options={accountStageSelectOptions} defaultValue="new_lead" />
                  <SelectField label="Industry" name="industry" options={industrySelectOptions} />
                  <Field label="Next step date" name="nextStepDueDate" type="date" />
                  <Field label="Website" name="website" placeholder="https://example.com" className="md:col-span-2" />
                  <Field
                    label="Customer Project URL"
                    name="customerProjectUrl"
                    placeholder="https://app.example.com/project/123"
                    className="md:col-span-2"
                  />
                  <Field
                    label="Next step"
                    name="nextStep"
                    placeholder="Schedule onboarding review"
                    className="md:col-span-2"
                  />
                </div>
                <button className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white" type="submit">
                  Save account
                </button>
              </form>
          </CollapsibleFormSection>
        </div>
      </section>

      <section className="gong-panel rounded-[1.9rem] p-5">
        <div className="border-b border-slate-200 pb-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Account Table</p>
            <h2 className="mt-2 text-lg font-semibold text-slate-950">Active account coverage</h2>
          </div>
        </div>
        {renderAccountsTable(activeRows, "No active accounts yet.")}
      </section>

      <section className="gong-panel rounded-[1.9rem] p-5">
        <div className="border-b border-slate-200 pb-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Archive</p>
            <h2 className="mt-2 text-lg font-semibold text-slate-950">Closed Lost</h2>
            <p className="mt-2 text-sm text-slate-600">Archived accounts stay editable here without crowding the active coverage table.</p>
          </div>
        </div>
        <div className="mt-4">
          <CollapsibleFormSection
            title={`View closed-lost accounts (${closedLostRows.length})`}
            description="Expand to review or update archived accounts."
            className="border-slate-200 bg-slate-50/70"
          >
            {renderAccountsTable(closedLostRows, "No closed-lost accounts yet.")}
          </CollapsibleFormSection>
        </div>
      </section>
    </CrmShell>
  );
}
