import { and, desc, eq, ne } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  completeTask,
  createContact,
  createDeal,
  enrichCompanyFromWebsite,
  updateActivityDate,
  updateCompanyField,
  updateContactField,
} from "@/app/actions";
import { AccountActionItemsPanel } from "@/components/account-action-items-panel";
import { AccountBrainPanel } from "@/components/account-brain-panel";
import { AccountRelationshipGraph } from "@/components/account-relationship-graph";
import { AccountTimelinePanel } from "@/components/account-timeline-panel";
import { AutoSaveActivityDateField } from "@/components/auto-save-activity-date-field";
import { AutoSaveCompanyField } from "@/components/auto-save-company-field";
import { AutoSaveCompanySelectField } from "@/components/auto-save-company-select-field";
import { AutoSaveContactField } from "@/components/auto-save-contact-field";
import { BillingPanel } from "@/components/billing-panel";
import { CallLink } from "@/components/call-link";
import { CollapsibleFormSection } from "@/components/collapsible-form-section";
import { CrmShell } from "@/components/crm-shell";
import { EmptyState } from "@/components/empty-state";
import { ProposalsPanel } from "@/components/proposals-panel";
import { getActivityMeta } from "@/lib/activity-ui";
import { accountStageOptions, getAccountStageLabel, getAccountStageTone } from "@/lib/account-stage";
import { requireUser } from "@/lib/auth";
import { companyIndustries } from "@/lib/company-industries";
import { normalizeCompanyIndustry } from "@/lib/company-industry-utils";
import { getDealStageLabel, getDealStageTone } from "@/lib/deal-stage";
import { currency, formatDate } from "@/lib/format";
import { getDb } from "@/lib/db";
import { formatMeetingDate } from "@/lib/meeting/action-ui";
import { listAccountBrainDocuments } from "@/lib/brain/queries";
import { listAccountMeetings, listAccountOpenActionItems } from "@/lib/meeting/queries";
import { getPushRecency } from "@/lib/push-recency";
import { activities, companies, contacts, deals, projectRepos, salesTasks, users } from "@/lib/schema";

export const dynamic = "force-dynamic";

function getContactInitials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
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

  const [
    company,
    companyContacts,
    companyDeals,
    companyTasks,
    companyActivities,
    accountMeetings,
    accountBrainDocuments,
    openActionItems,
    repos,
  ] = await Promise.all([
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
    listAccountMeetings(db, companyId),
    listAccountBrainDocuments(db, companyId),
    listAccountOpenActionItems(db, companyId),
    db
      .select({
        fullName: projectRepos.fullName,
        htmlUrl: projectRepos.htmlUrl,
        lastPushAt: projectRepos.lastPushAt,
      })
      .from(projectRepos)
      .where(and(eq(projectRepos.companyId, companyId), ne(projectRepos.archived, true)))
      .orderBy(desc(projectRepos.lastPushAt)),
  ]);

  if (!company) {
    notFound();
  }

  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  const normalizedIndustry = normalizeCompanyIndustry(company.industry) ?? "";
  const accountStageSelectOptions = accountStageOptions.map((stage) => ({
    value: stage,
    label: getAccountStageLabel(stage),
  }));
  const industrySelectOptions = companyIndustries.map((industry) => ({
    value: industry,
    label: industry,
  }));

  const openCompanyTasks = companyTasks.filter((task) => task.status === "open");
  const completedCompanyTasks = companyTasks.filter((task) => task.status === "done");
  const totalMrrCents = companyDeals.reduce((sum, deal) => sum + deal.valueCents, 0);
  const latestMeeting = accountMeetings[0] ?? null;
  const latestActivity = companyActivities[0] ?? null;
  const urgentCount = openActionItems.filter((item) => item.urgent).length;
  const accountNextStepLate = Boolean(company.nextStepDueDate && company.nextStepDueDate < today);

  // Open items per meeting, so a meeting card can show what it still owes
  // without a second query per row.
  const openCountsByMeeting = new Map<number, { open: number; urgent: number }>();
  for (const item of openActionItems) {
    const current = openCountsByMeeting.get(item.meetingId) ?? { open: 0, urgent: 0 };
    current.open += 1;
    if (item.urgent) {
      current.urgent += 1;
    }
    openCountsByMeeting.set(item.meetingId, current);
  }

  const freshestPush = repos[0]?.lastPushAt ?? null;
  const pushRecency = getPushRecency(freshestPush, now.getTime());

  return (
    <CrmShell
      username={session.username}
      title={company.name}
      description="Everything on this client: what they pay, and every conversation."
    >
      {/* Header strip — identity and the two facts you scan for, nothing else. */}
      <section className="gong-panel rounded-xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getAccountStageTone(company.stage)}`}>
                {getAccountStageLabel(company.stage)}
              </span>
              {normalizedIndustry ? (
                <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {normalizedIndustry}
                </span>
              ) : null}
              {urgentCount > 0 ? (
                <a
                  href="#account-action-items"
                  className="inline-flex rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-800 hover:bg-rose-200"
                >
                  {urgentCount} urgent
                </a>
              ) : null}
              {accountNextStepLate ? (
                <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                  Next step overdue
                </span>
              ) : null}
            </div>

            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{company.name}</h2>

            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-slate-600">
              <span>
                {latestMeeting ? (
                  <>
                    Last meeting{" "}
                    <Link href={`/meetings/${latestMeeting.slug}`} className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-2">
                      {formatMeetingDate(latestMeeting.meetingDate, "short")}
                    </Link>
                  </>
                ) : latestActivity ? (
                  <>
                    Last touch{" "}
                    <span className="font-medium text-slate-900">
                      {getActivityMeta(latestActivity.type).label} on {new Date(latestActivity.occurredAt).toLocaleDateString("en-US")}
                    </span>
                  </>
                ) : (
                  <span className="text-slate-500">No contact logged yet</span>
                )}
              </span>
              {repos.length > 0 ? (
                <span>
                  Last push <span className="font-medium text-slate-900">{pushRecency.label}</span>
                </span>
              ) : null}
              {company.nextStep ? (
                <span className="truncate">
                  Next step: <span className="font-medium text-slate-900">{company.nextStep}</span>
                  {company.nextStepDueDate ? ` (${formatDate(company.nextStepDueDate)})` : ""}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link href="/accounts" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700">
              Back
            </Link>
            {company.website ? (
              <a
                href={company.website}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"
              >
                Website
              </a>
            ) : null}
            {repos[0]?.htmlUrl ? (
              <a
                href={repos[0].htmlUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"
              >
                Repo{repos.length > 1 ? ` +${repos.length - 1}` : ""}
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
      </section>

      {/* 1. What they pay us. */}
      <BillingPanel companyId={company.id} />

      {/* 2. Everything we've said to each other. */}
      <AccountTimelinePanel
        companyId={company.id}
        companyName={company.name}
        meetings={accountMeetings}
        openCountsByMeeting={openCountsByMeeting}
        dealOptions={companyDeals.map((deal) => ({ id: deal.id, name: deal.name }))}
        contactOptions={companyContacts.map((contact) => ({
          id: contact.id,
          firstName: contact.firstName,
          lastName: contact.lastName,
        }))}
        today={today}
        activities={companyActivities.map((item) => ({
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

      {/* 3. What's owed, out of those conversations. */}
      <AccountActionItemsPanel companyId={company.id} items={openActionItems} />

      <AccountBrainPanel companyId={company.id} documents={accountBrainDocuments} />

      <AccountRelationshipGraph companyId={company.id} isProspect={company.stage !== "customer"} />

      <ProposalsPanel companyId={company.id} />

      {/* Everything below is supporting detail — folded away by default. A
          two-person agency does not need a pipeline board on every account. */}
      <section className="space-y-3">
        <CollapsibleFormSection
          id="account-people"
          title={`People (${companyContacts.length})`}
          description="Who we talk to at this account."
        >
          <ul className="space-y-3">
            {companyContacts.length === 0 ? (
              <li>
                <EmptyState icon="contact" message="No contacts yet." />
              </li>
            ) : null}
            {companyContacts.map((contact) => (
              <li key={contact.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-sm font-semibold tracking-[0.12em] text-cyan-300">
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

          <CollapsibleFormSection title="Add contact" description="Create a contact inside this account." className="mt-4" variant="compact">
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
                <label className="flex flex-col gap-1 text-sm text-slate-700">
                  <span>LinkedIn URL</span>
                  <input name="linkedinProfileUrl" type="url" className="rounded-md border border-slate-300 px-3 py-2 text-slate-900" />
                </label>
              </div>
              <button type="submit" className="mt-3 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
                Add contact
              </button>
            </form>
          </CollapsibleFormSection>
        </CollapsibleFormSection>

        {/* "Engagement", not "Pipeline" — these rows are the contract, and the
            billing panel above reads their MRR and build fee. Keep them
            maintained; just stop leading with them. */}
        <CollapsibleFormSection
          id="account-engagement"
          title={`Engagement (${companyDeals.length})`}
          description={`${currency.format(Math.round(totalMrrCents / 100))}/mo contracted — feeds the payments panel above.`}
        >
          <ul className="space-y-3">
            {companyDeals.length === 0 ? (
              <li>
                <EmptyState icon="opportunity" message="No engagement recorded. Add one so the billing panel knows what was agreed." />
              </li>
            ) : null}
            {companyDeals.map((deal) => (
              <li key={deal.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getDealStageTone(deal.stage)}`}>
                        {getDealStageLabel(deal.stage)}
                      </span>
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
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Monthly</p>
                      <p className="mt-1 text-base font-semibold text-slate-950">{currency.format(Math.round(deal.valueCents / 100))}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Build fee</p>
                      <p className="mt-1 text-base font-semibold text-slate-950">
                        {currency.format(Math.round(deal.implementationCostCents / 100))}
                      </p>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <CollapsibleFormSection title="Add engagement" description="Record what this client agreed to pay." className="mt-4" variant="compact">
            <form action={createDeal}>
              <input type="hidden" name="companyId" value={company.id} />
              <div className="grid gap-2 md:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm text-slate-700 md:col-span-2">
                  <span>Name</span>
                  <input name="name" required className="rounded-md border border-slate-300 px-3 py-2 text-slate-900" />
                </label>
                <label className="flex flex-col gap-1 text-sm text-slate-700">
                  <span>Stage</span>
                  <select name="stage" defaultValue="won" className="rounded-md border border-slate-300 px-3 py-2 text-slate-900">
                    <option value="lead">Lead</option>
                    <option value="qualified">Qualified</option>
                    <option value="proposal">Proposal</option>
                    <option value="negotiation">Negotiation</option>
                    <option value="won">Won</option>
                    <option value="lost">Lost</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm text-slate-700">
                  <span>Owner</span>
                  <input name="ownerName" placeholder="Justin" className="rounded-md border border-slate-300 px-3 py-2 text-slate-900" />
                </label>
                <label className="flex flex-col gap-1 text-sm text-slate-700">
                  <span>Monthly (USD)</span>
                  <input name="mrrUsd" type="number" placeholder="195" className="rounded-md border border-slate-300 px-3 py-2 text-slate-900" />
                </label>
                <label className="flex flex-col gap-1 text-sm text-slate-700">
                  <span>Build fee (USD)</span>
                  <input name="implementationCostUsd" type="number" placeholder="500" className="rounded-md border border-slate-300 px-3 py-2 text-slate-900" />
                </label>
                <label className="flex flex-col gap-1 text-sm text-slate-700 md:col-span-2">
                  <span>Next step</span>
                  <input name="nextStep" required placeholder="Send proposal draft" className="rounded-md border border-slate-300 px-3 py-2 text-slate-900" />
                </label>
              </div>
              <button type="submit" className="mt-3 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
                Add engagement
              </button>
            </form>
          </CollapsibleFormSection>
        </CollapsibleFormSection>

        <CollapsibleFormSection
          id="account-tasks"
          title={`Tasks (${openCompanyTasks.length} open)`}
          description="Dated follow-ups. Meeting homework lives in Open action items above."
        >
          <ul className="space-y-3">
            {openCompanyTasks.length === 0 ? (
              <li>
                <EmptyState icon="task" message="No open tasks right now." />
              </li>
            ) : null}
            {openCompanyTasks.map((task) => (
              <li key={task.id} className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{task.title}</p>
                    <p className="text-sm text-slate-600">Due {task.dueDate} • {task.assignedTo ?? "Unassigned"}</p>
                  </div>
                  <form action={completeTask}>
                    <input type="hidden" name="taskId" value={task.id} />
                    <input type="hidden" name="returnPath" value={`/accounts/${company.id}`} />
                    <button type="submit" className="rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-800">
                      Mark done
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
          {completedCompanyTasks.length > 0 ? (
            <p className="mt-3 text-sm text-slate-500">{completedCompanyTasks.length} completed.</p>
          ) : null}
        </CollapsibleFormSection>

        <CollapsibleFormSection
          id="account-details"
          title="Account details"
          description="Stage, industry, links, and the account-level next step."
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
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

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Delivery</p>
              {repos.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">No repo linked to this account.</p>
              ) : (
                <ul className="mt-2 space-y-1.5 text-sm">
                  {repos.map((repo) => (
                    <li key={repo.fullName} className="flex items-center justify-between gap-3">
                      <a
                        href={repo.htmlUrl ?? "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate font-mono text-xs text-cyan-700 hover:underline"
                      >
                        {repo.fullName}
                      </a>
                      <span className="shrink-0 text-xs text-slate-500">
                        {getPushRecency(repo.lastPushAt, now.getTime()).label}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Record</p>
              <p className="mt-2 text-sm text-slate-600">
                Created {new Date(company.createdAt).toLocaleDateString("en-US")}
              </p>
              {company.address ? <p className="mt-1 text-sm text-slate-600">{company.address}</p> : null}
              {company.stripeCustomerId ? (
                <p className="mt-1 font-mono text-xs text-slate-500">{company.stripeCustomerId}</p>
              ) : null}
            </div>
          </div>

          {company.website ? (
            <form action={enrichCompanyFromWebsite} className="mt-4">
              <input type="hidden" name="companyId" value={company.id} />
              <input type="hidden" name="returnPath" value={`/accounts/${company.id}`} />
              <button
                type="submit"
                className="rounded-xl border border-cyan-300 bg-cyan-50 px-3 py-2 text-sm font-medium text-cyan-800 hover:bg-cyan-100"
              >
                Enrich from website
              </button>
            </form>
          ) : null}
        </CollapsibleFormSection>
      </section>
    </CrmShell>
  );
}
