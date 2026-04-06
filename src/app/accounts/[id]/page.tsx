import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  createContact,
  createDeal,
  logActivity,
  updateActivityDate,
  updateCompanyField,
  updateContactField,
} from "@/app/actions";
import { ActivityTimeline } from "@/components/activity-timeline";
import { AutoSaveActivityDateField } from "@/components/auto-save-activity-date-field";
import { AutoSaveCompanyField } from "@/components/auto-save-company-field";
import { AutoSaveCompanySelectField } from "@/components/auto-save-company-select-field";
import { AutoSaveContactField } from "@/components/auto-save-contact-field";
import { CallLink } from "@/components/call-link";
import { CollapsibleFormSection } from "@/components/collapsible-form-section";
import { CrmShell } from "@/components/crm-shell";
import { activityTypeOptions, getActivityMeta } from "@/lib/activity-ui";
import { accountStageOptions, getAccountStageLabel, getAccountStageTone } from "@/lib/account-stage";
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

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Not set";
  }

  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US");
}

function getDueTone(dueDate: string | null | undefined, today: string) {
  if (!dueDate) {
    return "bg-slate-100 text-slate-700";
  }

  if (dueDate < today) {
    return "bg-rose-100 text-rose-800";
  }

  return "bg-amber-100 text-amber-800";
}

function getDaysFromToday(value: Date | string, today: string) {
  const current = new Date(`${today}T00:00:00`);
  const target = typeof value === "string" ? new Date(value) : value;
  const utcCurrent = Date.UTC(current.getFullYear(), current.getMonth(), current.getDate());
  const utcTarget = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((utcCurrent - utcTarget) / 86400000);
}

function formatRecencyLabel(value: Date | string, today: string) {
  const days = getDaysFromToday(value, today);

  if (days <= 0) {
    return "Today";
  }

  if (days === 1) {
    return "Yesterday";
  }

  return `${days} days ago`;
}

function getContactInitials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

function getDealStageTone(stage: string) {
  switch (stage) {
    case "lead":
      return "bg-slate-100 text-slate-700";
    case "qualified":
      return "bg-sky-100 text-sky-800";
    case "proposal":
      return "bg-violet-100 text-violet-800";
    case "negotiation":
      return "bg-amber-100 text-amber-800";
    case "won":
      return "bg-emerald-100 text-emerald-800";
    case "lost":
      return "bg-rose-100 text-rose-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getDealStageLabel(stage: string) {
  return stage.charAt(0).toUpperCase() + stage.slice(1);
}

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
        dealId: deals.id,
        dealName: deals.name,
        contactId: contacts.id,
        contactFirstName: contacts.firstName,
        contactLastName: contacts.lastName,
        loggedByUsername: users.username,
      })
      .from(activities)
      .leftJoin(deals, eq(activities.dealId, deals.id))
      .leftJoin(contacts, eq(activities.contactId, contacts.id))
      .leftJoin(users, eq(activities.loggedByUserId, users.id))
      .where(eq(activities.companyId, companyId))
      .orderBy(desc(activities.occurredAt)),
  ]);

  if (!company) {
    notFound();
  }

  const normalizedIndustry = normalizeCompanyIndustry(company.industry) ?? "";
  const accountStageSelectOptions = accountStageOptions.map((stage) => ({
    value: stage,
    label: getAccountStageLabel(stage),
  }));
  const industrySelectOptions = companyIndustries.map((industry) => ({
    value: industry,
    label: industry,
  }));
  const openTasks = companyTasks.filter((task) => task.status === "open").length;
  const totalIarrCents = companyDeals.reduce((sum, deal) => sum + deal.valueCents, 0);
  const totalImplementationCostCents = companyDeals.reduce((sum, deal) => sum + deal.implementationCostCents, 0);
  const today = new Date().toISOString().slice(0, 10);
  const latestActivity = companyActivities[0] ?? null;
  const reachableContacts = companyContacts.filter(
    (contact) => Boolean(contact.email || contact.phone || contact.linkedinProfileUrl),
  ).length;
  const overdueOpportunities = companyDeals.filter(
    (deal) => Boolean(deal.nextStepDueDate && deal.nextStepDueDate < today && deal.stage !== "won" && deal.stage !== "lost"),
  ).length;
  const nextDueOpportunity = companyDeals.find(
    (deal) => Boolean(deal.nextStepDueDate && deal.stage !== "won" && deal.stage !== "lost"),
  );
  const accountNextStepLate = Boolean(company.nextStepDueDate && company.nextStepDueDate < today);
  const accountHealthLabel = accountNextStepLate
    ? "Attention needed"
    : company.nextStep
      ? "On track"
      : "Needs next step";
  const accountHealthTone = accountNextStepLate
    ? "bg-rose-100 text-rose-800"
    : company.nextStep
      ? "bg-emerald-100 text-emerald-800"
      : "bg-amber-100 text-amber-800";
  const activitySummary = latestActivity
    ? `${getActivityMeta(latestActivity.type).label} ${formatRecencyLabel(latestActivity.occurredAt, today)}`
    : "No activity logged yet";

  return (
    <CrmShell
      username={session.username}
      title={company.name}
      description="Account detail with all associated people, opportunities, tasks, and timeline."
    >
      <section className="gong-panel rounded-[2rem] p-6">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.85fr)]">
          <div className="rounded-[1.75rem] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.95),rgba(240,249,255,0.88))] p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${accountHealthTone}`}>
                    {accountHealthLabel}
                  </span>
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getAccountStageTone(company.stage)}`}>
                    {getAccountStageLabel(company.stage)}
                  </span>
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getDueTone(company.nextStepDueDate, today)}`}>
                    Next step due {formatDate(company.nextStepDueDate)}
                  </span>
                  {normalizedIndustry ? (
                    <span className="inline-flex rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-800">
                      {normalizedIndustry}
                    </span>
                  ) : null}
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Account Command</p>
                  <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{company.name}</h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                    {company.nextStep
                      ? `Current next step: ${company.nextStep}`
                      : "No account-level next step is set yet. Add one so follow-up work is visible in the account workspace."}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-white/90 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Execution</p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">
                      {company.nextStepDueDate ? formatDate(company.nextStepDueDate) : "Set due date"}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {accountNextStepLate ? "Account next step is overdue." : company.nextStep ? "Next action is active." : "No active next step yet."}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white/90 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Last Activity</p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">{activitySummary}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {latestActivity ? new Date(latestActivity.occurredAt).toLocaleDateString() : "Use the timeline to capture context."}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white/90 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Opportunity Risk</p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">{overdueOpportunities} overdue</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {nextDueOpportunity?.nextStepDueDate
                        ? `Next due opportunity step: ${formatDate(nextDueOpportunity.nextStepDueDate)}`
                        : "No upcoming opportunity step dates."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Link href="/accounts" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700">
                  Back to Accounts
                </Link>
                {company.website ? (
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                  >
                    Open Website
                  </a>
                ) : null}
                {company.customerProjectUrl ? (
                  <a
                    href={company.customerProjectUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white"
                  >
                    Open Project
                  </a>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
            <article className="gong-kpi rounded-[1.6rem] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Stakeholders</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">{companyContacts.length}</p>
              <p className="mt-1 text-sm text-slate-600">{reachableContacts} reachable across phone, email, or LinkedIn</p>
            </article>
            <article className="gong-kpi rounded-[1.6rem] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Open Pipeline ARR</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">{currency.format(Math.round(totalIarrCents / 100))}</p>
              <p className="mt-1 text-sm text-slate-600">{companyDeals.length} opportunities on this account</p>
            </article>
            <article className="gong-kpi rounded-[1.6rem] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Follow-up Queue</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">{openTasks}</p>
              <p className="mt-1 text-sm text-slate-600">Open tasks protecting the next action</p>
            </article>
            <article className="gong-kpi rounded-[1.6rem] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Implementation Cost</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">
                {currency.format(Math.round(totalImplementationCostCents / 100))}
              </p>
              <p className="mt-1 text-sm text-slate-600">Tracked delivery cost across opportunities</p>
            </article>
          </div>
        </div>
      </section>

      <section className="sticky top-4 z-10 rounded-2xl border border-white/80 bg-white/90 p-3 shadow-lg shadow-slate-900/5 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <a href="#account-overview" className="rounded-xl border border-slate-300 px-3 py-1.5 text-sm text-slate-700">Overview</a>
            <a href="#account-people" className="rounded-xl border border-slate-300 px-3 py-1.5 text-sm text-slate-700">People</a>
            <a href="#account-pipeline" className="rounded-xl border border-slate-300 px-3 py-1.5 text-sm text-slate-700">Pipeline</a>
            <a href="#account-tasks" className="rounded-xl border border-slate-300 px-3 py-1.5 text-sm text-slate-700">Tasks</a>
            <a href="#account-activity" className="rounded-xl border border-slate-300 px-3 py-1.5 text-sm text-slate-700">Activity</a>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a href="#contact-create" className="rounded-xl border border-slate-300 px-3 py-1.5 text-sm text-slate-700">Add contact</a>
            <a href="#opportunity-create" className="rounded-xl border border-slate-300 px-3 py-1.5 text-sm text-slate-700">Create opportunity</a>
            <a href="#activity-create" className="rounded-xl bg-slate-900 px-3 py-1.5 text-sm font-medium text-white">Log activity</a>
          </div>
        </div>
      </section>

      <section id="account-overview" className="gong-panel rounded-[1.8rem] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Overview</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">Account Details</h2>
            <p className="mt-2 text-sm text-slate-600">Keep account metadata, links, and the top-level next step current without leaving the workspace.</p>
          </div>
          <div className="grid gap-2 rounded-[1.4rem] border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600 md:grid-cols-3">
            <p>Website: {company.website ? "Connected" : "Missing"}</p>
            <p>Customer project: {company.customerProjectUrl ? "Connected" : "Missing"}</p>
            <p>Created: {new Date(company.createdAt).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_320px]">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)]">
            <AutoSaveCompanySelectField
              action={updateCompanyField}
              companyId={company.id}
              field="stage"
              label="Stage"
              defaultValue={company.stage}
              options={accountStageSelectOptions}
            />
            <AutoSaveCompanySelectField
              action={updateCompanyField}
              companyId={company.id}
              field="industry"
              label="Industry"
              defaultValue={normalizedIndustry}
              options={industrySelectOptions}
              emptyOptionLabel="No industry"
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
          <aside className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Account Signals</p>
            <div className="mt-3 space-y-3 text-sm text-slate-600">
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                <p className="font-medium text-slate-900">Coverage</p>
                <p className="mt-1">{reachableContacts} of {companyContacts.length} contacts are directly reachable.</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                <p className="font-medium text-slate-900">Pipeline pressure</p>
                <p className="mt-1">
                  {overdueOpportunities > 0
                    ? `${overdueOpportunities} opportunity next steps are overdue.`
                    : "No overdue opportunity next steps right now."}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                <p className="font-medium text-slate-900">Recent touch</p>
                <p className="mt-1">{activitySummary}</p>
              </div>
              <form action={updateCompanyField} className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-3">
                <input type="hidden" name="companyId" value={company.id} />
                <input type="hidden" name="field" value="stage" />
                <input type="hidden" name="value" value="closed_lost" />
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-rose-950">Archive as Closed Lost</p>
                    <p className="mt-1 text-rose-800">
                      Move this account out of active coverage and into the closed-lost archive section.
                    </p>
                  </div>
                  <button
                    type="submit"
                    className="rounded-xl border border-rose-300 bg-white px-3 py-2 text-sm font-medium text-rose-900 hover:bg-rose-100"
                  >
                    Mark closed lost
                  </button>
                </div>
              </form>
            </div>
          </aside>
        </div>
      </section>

      <section id="account-people" className="grid gap-6 lg:grid-cols-2">
        <article className="gong-panel rounded-[1.8rem] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">People</p>
              <h2 className="mt-2 text-lg font-semibold text-slate-900">Stakeholders</h2>
              <p className="mt-2 text-sm text-slate-600">Keep account stakeholders current, reachable, and easy to hand off.</p>
            </div>
            <div className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700">
              {companyContacts.length} total
            </div>
          </div>
          <div id="contact-create">
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
                    <span>LinkedIn URL</span>
                    <input name="linkedinProfileUrl" type="url" className="rounded-md border border-slate-300 px-3 py-2 text-slate-900" />
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
          </div>
          <ul className="mt-4 space-y-3">
            {companyContacts.length === 0 ? <li className="text-sm text-slate-500">No contacts yet.</li> : null}
            {companyContacts.map((contact) => (
              <li key={contact.id} className="rounded-[1.35rem] border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold tracking-[0.12em] text-cyan-300">
                      {getContactInitials(contact.firstName, contact.lastName)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">
                        <Link href={`/contacts/${contact.id}`} className="underline decoration-slate-300 underline-offset-2">
                          {contact.firstName} {contact.lastName}
                        </Link>
                      </p>
                      <p className="mt-1 text-sm text-slate-600">{contact.title || "No title set"}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                        <CallLink phone={contact.phone} />
                        {contact.email ? (
                          <a
                            href={`mailto:${contact.email}`}
                            className="inline-flex items-center rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                          >
                            Email
                          </a>
                        ) : null}
                        {contact.linkedinProfileUrl ? (
                          <a
                            href={contact.linkedinProfileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                          >
                            LinkedIn
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                    {contact.email || contact.phone || contact.linkedinProfileUrl ? "Reachable" : "Needs info"}
                  </div>
                </div>
                <div className="mt-4 grid gap-2 md:grid-cols-2">
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
                  <AutoSaveContactField
                    action={updateContactField}
                    contactId={contact.id}
                    field="linkedinProfileUrl"
                    label="LinkedIn"
                    type="url"
                    defaultValue={contact.linkedinProfileUrl ?? ""}
                    returnPath={`/accounts/${company.id}`}
                  />
                </div>
              </li>
            ))}
          </ul>
        </article>

        <article id="account-pipeline" className="gong-panel rounded-[1.8rem] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Pipeline</p>
              <h2 className="mt-2 text-lg font-semibold text-slate-900">Opportunities</h2>
              <p className="mt-2 text-sm text-slate-600">Track every revenue motion tied to this account and make the next step obvious.</p>
            </div>
            <div className="rounded-2xl bg-slate-100 px-3 py-2 text-right text-sm font-medium text-slate-700">
              <p>{companyDeals.length} tracked</p>
              <p className="text-xs text-slate-500">{currency.format(Math.round(totalIarrCents / 100))} total ARR</p>
            </div>
          </div>
          <div id="opportunity-create">
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
          </div>
          <ul className="mt-4 space-y-3">
            {companyDeals.length === 0 ? <li className="text-sm text-slate-500">No opportunities yet.</li> : null}
            {companyDeals.map((deal) => {
              const opportunityOverdue = Boolean(
                deal.nextStepDueDate && deal.nextStepDueDate < today && deal.stage !== "won" && deal.stage !== "lost",
              );

              return (
                <li key={deal.id} className="rounded-[1.35rem] border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getDealStageTone(deal.stage)}`}>
                          {getDealStageLabel(deal.stage)}
                        </span>
                        {opportunityOverdue ? (
                          <span className="inline-flex rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-800">
                            Next step overdue
                          </span>
                        ) : null}
                        {deal.expectedCloseDate ? (
                          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                            Closes {formatDate(deal.expectedCloseDate)}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-3 font-medium text-slate-900">
                        <Link href={`/opportunities/${deal.id}`} className="underline decoration-slate-300 underline-offset-2">
                          {deal.name}
                        </Link>
                      </p>
                      <p className="mt-1 text-sm text-slate-600">Owner: {deal.ownerName ?? "Unassigned"}</p>
                    </div>
                    <div className="grid min-w-[180px] gap-2 sm:grid-cols-2">
                      <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">IARR</p>
                        <p className="mt-1 text-base font-semibold text-slate-950">{currency.format(Math.round(deal.valueCents / 100))}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Implementation</p>
                        <p className="mt-1 text-base font-semibold text-slate-950">
                          {currency.format(Math.round(deal.implementationCostCents / 100))}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1.3fr)_220px]">
                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Next step</p>
                      <p className="mt-2 text-sm leading-6 text-slate-800">{deal.nextStep || "No next step set for this opportunity."}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Due</p>
                      <p className={`mt-2 text-sm font-medium ${opportunityOverdue ? "text-rose-700" : "text-slate-800"}`}>
                        {deal.nextStepDueDate ? formatDate(deal.nextStepDueDate) : "No date set"}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article id="account-tasks" className="gong-panel rounded-[1.8rem] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Tasks</p>
              <h2 className="mt-2 text-lg font-semibold text-slate-900">Follow-up Queue</h2>
              <p className="mt-2 text-sm text-slate-600">Use this list to protect the next action on the account.</p>
            </div>
            <div className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700">
              {openTasks} open
            </div>
          </div>
          <ul className="mt-4 space-y-3">
            {companyTasks.length === 0 ? <li className="text-sm text-slate-500">No tasks yet.</li> : null}
            {companyTasks.map((task) => (
              <li key={task.id} className="rounded-[1.25rem] border border-slate-200 bg-slate-50/70 p-4">
                <p className="font-medium text-slate-900">{task.title}</p>
                <p className="text-sm text-slate-600">Due {task.dueDate} • {task.assignedTo ?? "Unassigned"}</p>
                <p className="mt-1">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                      task.status === "open" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {task.status}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        </article>

        <article id="account-activity" className="gong-panel rounded-[1.8rem] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Activity</p>
              <h2 className="mt-2 text-lg font-semibold text-slate-900">Timeline</h2>
              <p className="mt-2 text-sm text-slate-600">Capture context so the whole team can pick up the thread.</p>
            </div>
            <div className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700">
              {companyActivities.length} entries
            </div>
          </div>
          <div id="activity-create">
            <CollapsibleFormSection title="Log activity" description="Capture a note, call, meeting, or email." className="mt-4">
              <form action={logActivity}>
                <input type="hidden" name="companyId" value={company.id} />
                <input type="hidden" name="returnPath" value={`/accounts/${company.id}`} />
                <div className="grid gap-2 md:grid-cols-2">
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
          </div>
          <ActivityTimeline
            emptyMessage="No activity yet."
            items={companyActivities.map((item) => ({
              id: item.id,
              type: item.type,
              notes: item.notes,
              occurredAt: item.occurredAt,
              loggedByUsername: item.loggedByUsername,
              contextLinks: [
                ...(item.dealName && item.dealId ? [{ label: item.dealName, href: `/opportunities/${item.dealId}` }] : []),
                ...(item.contactFirstName && item.contactId
                  ? [{ label: `${item.contactFirstName} ${item.contactLastName}`, href: `/contacts/${item.contactId}` }]
                  : []),
              ],
              footer: (
                <AutoSaveActivityDateField
                  action={updateActivityDate}
                  activityId={item.id}
                  defaultValue={new Date(item.occurredAt).toISOString().slice(0, 10)}
                  returnPath={`/accounts/${company.id}`}
                />
              ),
            }))}
          />
        </article>
      </section>
    </CrmShell>
  );
}
