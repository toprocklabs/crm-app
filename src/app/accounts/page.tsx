import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import Link from "next/link";
import { createCompany, updateCompanyField } from "@/app/actions";
import { AutoSaveCompanyField } from "@/components/auto-save-company-field";
import { AutoSaveCompanySelectField } from "@/components/auto-save-company-select-field";
import { CollapsibleFormSection } from "@/components/collapsible-form-section";
import { CrmShell } from "@/components/crm-shell";
import { EmptyState } from "@/components/empty-state";
import { SearchInput } from "@/components/search-input";
import { StageFilter } from "@/components/stage-filter";
import { accountStageOptions, getAccountStageLabel } from "@/lib/account-stage";
import { requireUser } from "@/lib/auth";
import { companyIndustries } from "@/lib/company-industries";
import { getDb } from "@/lib/db";
import { getPushRecency } from "@/lib/push-recency";
import { companies, deals, projectRepos, type AccountStage } from "@/lib/schema";

export const dynamic = "force-dynamic";

const defaultAccountStageFilter = "customer";
const allStagesFilterValue = "all";

type SortKey = "account" | "stage" | "mrr" | "lastPush" | "nextStep" | "nextStepDue" | "created";
type SortDirection = "asc" | "desc";
type SelectOption = { value: string; label: string };

type AccountsPageProps = {
  searchParams: Promise<{
    sort?: string;
    dir?: string;
    q?: string;
    stage?: string;
  }>;
};

const sortLabels: Record<SortKey, string> = {
  account: "Account",
  stage: "Stage",
  mrr: "Total MRR",
  lastPush: "Last push",
  nextStep: "Next step",
  nextStepDue: "Next step due",
  created: "Created",
};

function getSortKey(value: string | undefined): SortKey {
  const keys: SortKey[] = ["account", "stage", "mrr", "lastPush", "nextStep", "nextStepDue", "created"];
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

function getDueUrgency(date: string | null, today: string) {
  if (!date) return "missing";
  if (date < today) return "overdue";
  if (date === today) return "today";
  return "future";
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
  const search = (params.q ?? "").trim().toLowerCase();
  // Accounts default to the Customer stage; `stage=all` is the explicit opt-out.
  const stageParam = params.stage ?? defaultAccountStageFilter;
  const stageFilter = stageParam === allStagesFilterValue ? "" : stageParam;
  // One clock reading for the whole render, so the due dates and every push
  // pill in the table are measured against the same instant.
  const renderedAt = new Date();
  const today = renderedAt.toISOString().slice(0, 10);
  const nowMs = renderedAt.getTime();
  const accountStageSelectOptions = accountStageOptions.map((stage) => ({
    value: stage,
    label: getAccountStageLabel(stage),
  }));
  const industrySelectOptions = companyIndustries.map((industry) => ({
    value: industry,
    label: industry,
  }));

  const [accountRows, dealRows, repoRows, unlinkedRepoRows] = await Promise.all([
    db.select().from(companies).orderBy(desc(companies.createdAt)),
    db.select({ id: deals.id, companyId: deals.companyId, valueCents: deals.valueCents }).from(deals),
    // Read-only mirror (plan 005). Archived repos still hold their account link
    // but must not keep an account looking active, so they're excluded here.
    db
      .select({
        companyId: projectRepos.companyId,
        fullName: projectRepos.fullName,
        htmlUrl: projectRepos.htmlUrl,
        lastPushAt: projectRepos.lastPushAt,
      })
      .from(projectRepos)
      .where(and(isNotNull(projectRepos.companyId), eq(projectRepos.archived, false)))
      .orderBy(desc(projectRepos.lastPushAt)),
    // Delivery with no account behind it. Internal tooling is excluded or this
    // list is mostly us, and then nobody reads it.
    db
      .select({
        fullName: projectRepos.fullName,
        htmlUrl: projectRepos.htmlUrl,
        lastPushAt: projectRepos.lastPushAt,
      })
      .from(projectRepos)
      .where(
        and(
          isNull(projectRepos.companyId),
          eq(projectRepos.isInternal, false),
          eq(projectRepos.archived, false),
        ),
      )
      .orderBy(desc(projectRepos.lastPushAt)),
  ]);

  const pipelineTotals = new Map<number, number>();
  for (const row of dealRows) {
    if (!row.companyId) {
      continue;
    }

    pipelineTotals.set(row.companyId, (pipelineTotals.get(row.companyId) ?? 0) + row.valueCents);
  }

  // Repos arrive newest-push-first, so the first entry per company is also the
  // account's most recent push — no per-row MAX() needed.
  const reposByCompany = new Map<number, typeof repoRows>();
  for (const repo of repoRows) {
    if (!repo.companyId) {
      continue;
    }

    const bucket = reposByCompany.get(repo.companyId);
    if (bucket) {
      bucket.push(repo);
    } else {
      reposByCompany.set(repo.companyId, [repo]);
    }
  }

  const rows = accountRows.map((row) => {
    const repos = reposByCompany.get(row.id) ?? [];

    return {
      ...row,
      pipelineCents: pipelineTotals.get(row.id) ?? 0,
      repos,
      lastPushAt: repos[0]?.lastPushAt ?? null,
    };
  });

  rows.sort((a, b) => {
    const direction = dir === "asc" ? 1 : -1;

    switch (sort) {
      case "account":
        return a.name.localeCompare(b.name) * direction;
      case "stage":
        return a.stage.localeCompare(b.stage) * direction;
      case "mrr":
        return (a.pipelineCents - b.pipelineCents) * direction;
      case "lastPush": {
        // Accounts with no linked repo are unmeasured, not stale. They sort to
        // the bottom in BOTH directions so flipping the arrow never buries the
        // rows you're actually looking for under a block of blanks.
        const aTime = a.lastPushAt ? new Date(a.lastPushAt).getTime() : null;
        const bTime = b.lastPushAt ? new Date(b.lastPushAt).getTime() : null;
        if (aTime === null && bTime === null) return 0;
        if (aTime === null) return 1;
        if (bTime === null) return -1;
        return (aTime - bTime) * direction;
      }
      case "nextStep":
        return (a.nextStep ?? "").localeCompare(b.nextStep ?? "") * direction;
      case "nextStepDue":
        return (a.nextStepDueDate ?? "").localeCompare(b.nextStepDueDate ?? "") * direction;
      default:
        return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * direction;
    }
  });

  const searched = rows.filter((row) => {
    if (search && !row.name.toLowerCase().includes(search) && !(row.industry ?? "").toLowerCase().includes(search)) {
      return false;
    }
    return true;
  });

  const filtered = stageFilter ? searched.filter((row) => row.stage === stageFilter) : searched;

  const activeRows = filtered.filter((row) => row.stage !== "closed_lost");
  // The archive is its own view, so it ignores the stage filter (otherwise it always reads 0).
  const closedLostRows = searched.filter((row) => row.stage === "closed_lost");

  function sortHref(key: SortKey) {
    const nextDir: SortDirection = sort === key && dir === "asc" ? "desc" : "asc";
    const p = new URLSearchParams();
    p.set("sort", key);
    p.set("dir", nextDir);
    if (search) p.set("q", search);
    if (stageParam) p.set("stage", stageParam);
    return `/accounts?${p.toString()}`;
  }

  function sortIndicator(key: SortKey) {
    if (sort !== key) {
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
          <path d="M7 15l5 5 5-5" />
          <path d="M7 9l5-5 5 5" />
        </svg>
      );
    }

    if (dir === "asc") {
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-700">
          <path d="M18 15l-6-6-6 6" />
        </svg>
      );
    }

    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-700">
        <path d="M6 9l6 6 6-6" />
      </svg>
    );
  }

  function renderAccountsTable(tableRows: typeof rows, emptyLabel: string) {
    return (
      <div className="crm-table-wrap mt-4">
        <table className="crm-data-table">
          <thead className="text-left text-slate-500">
            <tr>
              {(["account", "stage", "mrr", "lastPush", "nextStep", "nextStepDue"] as SortKey[]).map((key) => (
                <th key={key} className={key === "mrr" ? "text-right" : undefined}>
                  <Link href={sortHref(key)} className={`inline-flex items-center gap-1 ${key === "mrr" ? "justify-end" : ""}`}>
                    <span>{sortLabels[key]}</span>
                    {sortIndicator(key)}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-4">
                  <EmptyState icon="account" message={emptyLabel} />
                </td>
              </tr>
            ) : null}
            {tableRows.map((row) => {
              const dueUrgency = getDueUrgency(row.nextStepDueDate, today);
              const push = getPushRecency(row.lastPushAt, nowMs);
              const [primaryRepo, ...otherRepos] = row.repos;

              return (
                <tr key={row.id}>
                  <td className="min-w-[240px]">
                    <p className="font-medium text-slate-900">
                      <Link href={`/accounts/${row.id}`} className="crm-table-link">
                        {row.name}
                      </Link>
                    </p>
                    <p className="text-slate-500">
                      {row.website ? (
                        <a
                          href={row.website}
                          target="_blank"
                          rel="noreferrer"
                          className="crm-table-link text-sm font-normal"
                        >
                          {getUrlLabel(row.website)}
                        </a>
                      ) : "No website"}
                    </p>
                    <p className="text-slate-500">
                      {primaryRepo ? (
                        <>
                          <a
                            href={primaryRepo.htmlUrl ?? `https://github.com/${primaryRepo.fullName}`}
                            target="_blank"
                            rel="noreferrer"
                            className="crm-table-link font-mono text-xs font-normal"
                          >
                            {primaryRepo.fullName.split("/").pop()}
                          </a>
                          {otherRepos.length > 0 ? (
                            <span
                              className="ml-1.5 text-xs text-slate-400"
                              title={otherRepos.map((repo) => repo.fullName).join("\n")}
                            >
                              +{otherRepos.length}
                            </span>
                          ) : null}
                        </>
                      ) : (
                        <span className="text-sm">No repo linked</span>
                      )}
                    </p>
                  </td>
                  <td className="min-w-[185px]">
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
                  <td className="crm-money font-semibold text-slate-800">${Math.round(row.pipelineCents / 100).toLocaleString()}</td>
                  <td className="min-w-[110px]">
                    <span
                      className="crm-push-pill"
                      data-band={push.band}
                      title={
                        row.lastPushAt
                          ? `Last push ${new Date(row.lastPushAt).toLocaleString()}`
                          : "No repo linked to this account"
                      }
                    >
                      {push.label}
                    </span>
                  </td>
                  <td className="min-w-[260px] text-slate-700">
                    <AutoSaveCompanyField
                      action={updateCompanyField}
                      companyId={row.id}
                      field="nextStep"
                      label="Next step"
                      defaultValue={row.nextStep}
                      emptyText="No next step"
                      helperText={null}
                      labelClassName="sr-only"
                    />
                  </td>
                  <td className="min-w-[185px] text-slate-700">
                    <span className="crm-due-pill mb-2" data-urgency={dueUrgency}>
                      {row.nextStepDueDate ? (dueUrgency === "overdue" ? "Overdue" : dueUrgency === "today" ? "Due today" : "Scheduled") : "No date"}
                    </span>
                    <AutoSaveCompanyField
                      action={updateCompanyField}
                      companyId={row.id}
                      field="nextStepDueDate"
                      label="Next step due"
                      type="date"
                      defaultValue={row.nextStepDueDate ?? ""}
                      emptyText="No next step date"
                      helperText={null}
                      labelClassName="sr-only"
                    />
                  </td>
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
      description="All account records with opportunities and total tracked MRR."
    >
      <section className="gong-panel rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-950">
              {stageFilter
                ? `${getAccountStageLabel(stageFilter as AccountStage)} accounts`
                : "Active account coverage"}
            </h2>
            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
              {activeRows.length} shown
            </span>
            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
              {rows.length} total
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput placeholder="Search accounts..." />
            <StageFilter
              options={accountStageSelectOptions}
              defaultValue={defaultAccountStageFilter}
              allValue={allStagesFilterValue}
            />
          </div>
        </div>
        <div className="mt-3">
          <CollapsibleFormSection
            id="add-account"
            variant="compact"
            title="Add account"
            description="Create a new account record."
          >
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
              <button type="submit" className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
                Save account
              </button>
            </form>
          </CollapsibleFormSection>
        </div>
        {renderAccountsTable(activeRows, "No active accounts yet.")}
      </section>

      {/* Kept as full-width siblings rather than a flex row: a compact
          disclosure in a flex container shrinks to its summary, which would
          squeeze the expanded table into a column. */}
      <div className="space-y-3">
        <CollapsibleFormSection
          variant="compact"
          title={`Closed Lost (${closedLostRows.length})`}
          description="Archived accounts stay editable here without crowding the active coverage table."
        >
          {renderAccountsTable(closedLostRows, "No closed-lost accounts yet.")}
        </CollapsibleFormSection>

        <CollapsibleFormSection
          variant="compact"
          title={`Unlinked repos (${unlinkedRepoRows.length})`}
          description="Active repos with no account behind them — delivery you may not be tracking as revenue."
        >
          <table className="crm-data-table">
            <thead className="text-left text-slate-500">
              <tr>
                <th>Repository</th>
                <th>Last push</th>
              </tr>
            </thead>
            <tbody>
              {unlinkedRepoRows.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-3 py-4">
                    <EmptyState icon="account" message="Every active repo is linked to an account." />
                  </td>
                </tr>
              ) : null}
              {unlinkedRepoRows.map((repo) => {
                const push = getPushRecency(repo.lastPushAt, nowMs);

                return (
                  <tr key={repo.fullName}>
                    <td className="min-w-[260px]">
                      <a
                        href={repo.htmlUrl ?? `https://github.com/${repo.fullName}`}
                        target="_blank"
                        rel="noreferrer"
                        className="crm-table-link font-mono text-xs"
                      >
                        {repo.fullName}
                      </a>
                    </td>
                    <td className="min-w-[110px]">
                      <span className="crm-push-pill" data-band={push.band}>
                        {push.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CollapsibleFormSection>
      </div>
    </CrmShell>
  );
}
