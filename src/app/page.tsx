import { desc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { ActivityTimeline } from "@/components/activity-timeline";
import { CrmShell } from "@/components/crm-shell";
import { EmptyState } from "@/components/empty-state";
import { OpenActionItemsRollup } from "@/components/open-action-items-rollup";
import { requireUser } from "@/lib/auth";
import { getDealStageLabel, getDealStageTone } from "@/lib/deal-stage";
import { currency } from "@/lib/format";
import { getDb } from "@/lib/db";
import { activities, companies, contacts, deals, users } from "@/lib/schema";

export const dynamic = "force-dynamic";

// Every KPI drills into the view it summarizes; `href` is required so a card
// can't silently go back to being a dead end.
function Card({
  title,
  value,
  subtitle,
  href,
}: {
  title: string;
  value: string;
  subtitle: string;
  href: string;
}) {
  return (
    <Link href={href} className="gong-panel gong-kpi gong-kpi-link block rounded-lg p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</p>
      <p className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p>
    </Link>
  );
}

export default async function Home() {
  const session = await requireUser();
  const db = getDb();

  if (!db) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-6 py-10">
        <h1 className="text-3xl font-semibold text-slate-900">Toprock OS</h1>
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-amber-900">
          <p className="font-medium">Toprock OS needs setup before it can run.</p>
          <p className="mt-2 text-sm">
            Add your Neon connection string as <code>DATABASE_URL</code>, then run
            <code className="mx-1">npm run db:generate</code> and
            <code className="mx-1">npm run db:push</code>.
          </p>
        </div>
      </main>
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  const [dealRows, activityRows, statsRows] = await Promise.all([
    db
      .select({
        id: deals.id,
        name: deals.name,
        stage: deals.stage,
        valueCents: deals.valueCents,
        implementationCostCents: deals.implementationCostCents,
        companyId: companies.id,
        companyName: companies.name,
        ownerName: deals.ownerName,
        nextStep: deals.nextStep,
        nextStepDueDate: deals.nextStepDueDate,
      })
      .from(deals)
      .leftJoin(companies, eq(deals.companyId, companies.id))
      .orderBy(desc(deals.createdAt))
      .limit(12),
    db
      .select({
        id: activities.id,
        type: activities.type,
        notes: activities.notes,
        occurredAt: activities.occurredAt,
        dealId: deals.id,
        dealName: deals.name,
        companyId: companies.id,
        companyName: companies.name,
        loggedByUsername: users.username,
      })
      .from(activities)
      .leftJoin(deals, eq(activities.dealId, deals.id))
      .leftJoin(companies, eq(activities.companyId, companies.id))
      .leftJoin(users, eq(activities.loggedByUserId, users.id))
      .orderBy(desc(activities.occurredAt))
      .limit(16),
    db
      .select({
        companies: sql<number>`count(distinct ${companies.id})`,
        contacts: sql<number>`(select count(*) from ${contacts})`,
        pipelineCents: sql<number>`coalesce(sum(${deals.valueCents}) filter (where ${deals.stage} not in ('won', 'lost')), 0)`,
        wonMrrCents: sql<number>`coalesce(sum(${deals.valueCents}) filter (where ${deals.stage} = 'won'), 0)`,
        pipelineImplementationCents: sql<number>`coalesce(sum(${deals.implementationCostCents}) filter (where ${deals.stage} not in ('won', 'lost')), 0)`,
        wonImplementationCents: sql<number>`coalesce(sum(${deals.implementationCostCents}) filter (where ${deals.stage} = 'won'), 0)`,
      })
      .from(companies)
      .leftJoin(deals, eq(companies.id, deals.companyId)),
  ]);

  const stats = statsRows[0] ?? {
    companies: 0,
    contacts: 0,
    pipelineCents: 0,
    wonMrrCents: 0,
    pipelineImplementationCents: 0,
    wonImplementationCents: 0,
  };

  return (
    <CrmShell
      username={session.username}
      title="Dashboard"
      description="Track pipeline, enforce next steps, and run a clean follow-up cadence for your SMB opportunities."
    >
      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Card title="Accounts" value={String(stats.companies)} subtitle="Active SMB accounts" href="/accounts" />
        <Card title="Contacts" value={String(stats.contacts)} subtitle="People in your funnel" href="/contacts" />
        <Card
          title="Pipeline MRR"
          value={currency.format(Math.round((stats.pipelineCents ?? 0) / 100))}
          subtitle="Active pipeline (excl. won/lost)"
          href="/opportunities"
        />
        <Card
          title="Won MRR"
          value={currency.format(Math.round((stats.wonMrrCents ?? 0) / 100))}
          subtitle="Closed-won opportunities"
          href="/opportunities?stage=won"
        />
        <Card
          title="Pipeline Impl."
          value={currency.format(Math.round((stats.pipelineImplementationCents ?? 0) / 100))}
          subtitle="Active implementation fees"
          href="/opportunities"
        />
        <Card
          title="Won Impl."
          value={currency.format(Math.round((stats.wonImplementationCents ?? 0) / 100))}
          subtitle="Closed-won implementation fees"
          href="/opportunities?stage=won"
        />
      </section>

      {/* What we owe clients, ahead of the pipeline board — plan 006. */}
      <OpenActionItemsRollup returnPath="/" limitPerAccount={4} />

      <section className="gong-panel rounded-xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Pipeline Focus</p>
            <h2 className="mt-2 text-lg font-semibold text-slate-950">Opportunities with next steps</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{dealRows.length} tracked</span>
            <Link
              href="/opportunities"
              className="inline-flex rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              View all
            </Link>
          </div>
        </div>
        <ul className="mt-4 space-y-3">
          {dealRows.length === 0 ? <li><EmptyState icon="opportunity" message="No opportunities yet." action={{ label: "Create opportunity", href: "/opportunities" }} /></li> : null}
          {dealRows.map((deal) => {
            const stepLate = Boolean(deal.nextStepDueDate && deal.nextStepDueDate < today && deal.stage !== "won" && deal.stage !== "lost");

            return (
              // `relative` + the stretched link on the deal name makes the whole
              // row clickable; the account link sits above it via z-10.
              <li
                key={deal.id}
                className="relative rounded-lg border border-slate-200 bg-slate-50/70 p-4 transition hover:border-cyan-300 hover:bg-white"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-slate-900">
                      <Link
                        href={`/opportunities/${deal.id}`}
                        className="underline decoration-slate-300 underline-offset-2 after:absolute after:inset-0 after:content-['']"
                      >
                        {deal.name}
                      </Link>
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-slate-600">
                      {deal.companyId && deal.companyName ? (
                        <Link
                          href={`/accounts/${deal.companyId}`}
                          className="relative z-10 underline decoration-slate-300 underline-offset-2 hover:text-slate-900"
                        >
                          {deal.companyName}
                        </Link>
                      ) : (
                        <span>No account</span>
                      )}
                      <span>•</span>
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getDealStageTone(deal.stage)}`}>
                        {getDealStageLabel(deal.stage)}
                      </span>
                      <span>•</span>
                      <span>{deal.ownerName ?? "Unassigned"}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-800">Next step: {deal.nextStep || "Not set"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-700">MRR {currency.format(Math.round(deal.valueCents / 100))}</p>
                    <p className="text-xs text-slate-500">Impl. {currency.format(Math.round(deal.implementationCostCents / 100))}</p>
                  </div>
                </div>
                {deal.nextStepDueDate ? (
                  <p className={`mt-2 text-xs ${stepLate ? "text-red-700" : "text-slate-500"}`}>
                    Next step due: {deal.nextStepDueDate}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="gong-panel rounded-xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Signals</p>
            <h2 className="mt-2 text-lg font-semibold text-slate-950">Recent activity timeline</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex rounded-full bg-cyan-100 px-2.5 py-1 text-xs font-semibold text-cyan-800">Live feed</span>
            <Link
              href="/activities"
              className="inline-flex rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              View all
            </Link>
          </div>
        </div>
        <ActivityTimeline
          emptyMessage="No activity logged yet."
          items={activityRows.map((item) => ({
            id: item.id,
            type: item.type,
            notes: item.notes,
            occurredAt: item.occurredAt,
            loggedByUsername: item.loggedByUsername,
            contextLinks: [
              ...(item.dealName && item.dealId ? [{ label: item.dealName, href: `/opportunities/${item.dealId}` }] : []),
              ...(item.companyName && item.companyId ? [{ label: item.companyName, href: `/accounts/${item.companyId}` }] : []),
            ],
          }))}
        />
      </section>
    </CrmShell>
  );
}
