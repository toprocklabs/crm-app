import { asc, eq, inArray } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  createMeetingActionItem,
  deleteMeetingActionItem,
  updateMeetingActionStatus,
  updateMeetingField,
} from "@/app/actions";
import { AutoSaveMeetingField } from "@/components/auto-save-meeting-field";
import { CollapsibleFormSection } from "@/components/collapsible-form-section";
import { AppShell } from "@/components/app-shell";
import { MeetingActionStatusSelect } from "@/components/meeting-action-status-select";
import { MeetingBody } from "@/components/meeting-body";
import { MeetingBodyEditor } from "@/components/meeting-body-editor";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { formatMeetingDate, getMeetingOwnerTone, isOpenMeetingAction } from "@/lib/meeting/action-ui";
import { companies, meetingActionItems, meetingCompanies, meetings } from "@/lib/schema";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function MeetingDetailPage({ params }: Props) {
  const session = await requireUser();
  const db = getDb();

  if (!db) {
    return null;
  }

  const { slug } = await params;

  // This is the one route allowed to read `body_md` — see plan 006's schema
  // note. Everything else selects the header columns only.
  const meeting = await db.query.meetings.findFirst({
    where: eq(meetings.slug, decodeURIComponent(slug)),
  });

  if (!meeting) {
    notFound();
  }

  const [primaryAccount, secondaryLinks, actionItems] = await Promise.all([
    db.query.companies.findFirst({
      columns: { id: true, name: true },
      where: eq(companies.id, meeting.companyId),
    }),
    db
      .select({ id: companies.id, name: companies.name })
      .from(meetingCompanies)
      .innerJoin(companies, eq(companies.id, meetingCompanies.companyId))
      .where(eq(meetingCompanies.meetingId, meeting.id)),
    db
      .select()
      .from(meetingActionItems)
      .where(eq(meetingActionItems.meetingId, meeting.id))
      .orderBy(asc(meetingActionItems.id)),
  ]);

  const returnPath = `/meetings/${meeting.slug}`;
  const openItems = actionItems.filter((item) => isOpenMeetingAction(item.status));
  const urgentItems = openItems.filter((item) => item.urgent);

  // Newest-first sibling notes for the same account, so a note is navigable
  // without going back out to the account page.
  const relatedAccountIds = [meeting.companyId, ...secondaryLinks.map((row) => row.id)];
  const siblings = await db
    .select({ slug: meetings.slug, title: meetings.title, meetingDate: meetings.meetingDate })
    .from(meetings)
    .where(inArray(meetings.companyId, relatedAccountIds))
    .orderBy(meetings.meetingDate);
  const ordered = [...siblings].reverse();
  const currentIndex = ordered.findIndex((row) => row.slug === meeting.slug);
  const newer = currentIndex > 0 ? ordered[currentIndex - 1] : null;
  const older = currentIndex >= 0 && currentIndex < ordered.length - 1 ? ordered[currentIndex + 1] : null;

  return (
    <AppShell
      username={session.username}
      title={meeting.title}
      description={`Meeting note · ${formatMeetingDate(meeting.meetingDate)}`}
    >
      <section className="gong-panel rounded-xl p-6">
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <Link href={`/accounts/${meeting.companyId}`} className="font-medium text-cyan-700 hover:underline">
            ← {primaryAccount?.name ?? "Account"}
          </Link>
          {secondaryLinks.map((account) => (
            <Link
              key={account.id}
              href={`/accounts/${account.id}`}
              className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
            >
              also {account.name}
            </Link>
          ))}
        </div>

        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
          <AutoSaveMeetingField
            meetingId={meeting.id}
            field="title"
            label="Meeting title"
            defaultValue={meeting.title}
            emptyText="Untitled meeting"
            action={updateMeetingField}
            returnPath={returnPath}
            className="inline-block w-full"
            valueClassName="text-2xl font-semibold tracking-tight text-slate-950"
          />
        </h2>

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-600">
          <AutoSaveMeetingField
            meetingId={meeting.id}
            field="meetingDate"
            label="Meeting date"
            type="date"
            defaultValue={meeting.meetingDate}
            emptyText="Set a date"
            action={updateMeetingField}
            returnPath={returnPath}
            valueClassName="font-medium text-slate-900"
          />
          <AutoSaveMeetingField
            meetingId={meeting.id}
            field="format"
            label="Format"
            defaultValue={meeting.format ?? ""}
            emptyText="Add a format"
            action={updateMeetingField}
            returnPath={returnPath}
          />
          <AutoSaveMeetingField
            meetingId={meeting.id}
            field="statusLabel"
            label="Status"
            defaultValue={meeting.statusLabel ?? ""}
            emptyText="Add a status"
            action={updateMeetingField}
            returnPath={returnPath}
          />
          {openItems.length > 0 ? (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
              {openItems.length} open
            </span>
          ) : null}
          {urgentItems.length > 0 ? (
            <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-800">
              {urgentItems.length} urgent
            </span>
          ) : null}
        </div>

        {meeting.tldr ? (
          <div className="mt-5 rounded-lg border-l-[3px] border-cyan-600 bg-cyan-50/70 px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-800">TL;DR</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">{meeting.tldr}</p>
          </div>
        ) : null}
      </section>

      <section className="gong-panel rounded-xl p-6">
        <MeetingBody markdown={meeting.bodyMd} />

        <CollapsibleFormSection
          title="Edit note"
          description="The full markdown source for this note."
          className="mt-8"
        >
          <MeetingBodyEditor
            meetingId={meeting.id}
            defaultValue={meeting.bodyMd}
            action={updateMeetingField}
            returnPath={returnPath}
          />
        </CollapsibleFormSection>
      </section>

      <section className="gong-panel rounded-xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Homework</p>
            <h2 className="mt-2 text-lg font-semibold text-slate-900">Action items</h2>
            <p className="mt-2 text-sm text-slate-600">
              These roll up onto the account and across every client — change a status here and it moves everywhere.
            </p>
          </div>
          <div className="rounded-xl bg-slate-100 px-3 py-2 text-right text-sm font-medium text-slate-700">
            <p>{openItems.length} open</p>
            <p className="text-xs text-slate-500">{actionItems.length} total</p>
          </div>
        </div>

        <ul className="mt-4 space-y-2">
          {actionItems.length === 0 ? (
            <li className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">
              No action items on this note yet.
            </li>
          ) : null}
          {actionItems.map((item) => (
            <li
              key={item.id}
              className={`flex flex-wrap items-start gap-3 rounded-lg border p-3 ${
                item.status === "done" ? "border-slate-200 bg-slate-50/60" : "border-slate-200 bg-white"
              }`}
            >
              <span
                className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${getMeetingOwnerTone(item.owner)}`}
              >
                {item.owner}
              </span>
              {item.urgent ? (
                <span className="inline-flex shrink-0 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-800">
                  Urgent
                </span>
              ) : null}
              <p
                className={`min-w-[12rem] flex-1 text-sm leading-6 ${
                  item.status === "done" ? "text-slate-500 line-through" : "text-slate-800"
                }`}
              >
                {item.action}
              </p>
              <MeetingActionStatusSelect
                actionItemId={item.id}
                defaultValue={item.status}
                action={updateMeetingActionStatus}
                returnPath={returnPath}
              />
              <form action={deleteMeetingActionItem}>
                <input type="hidden" name="actionItemId" value={item.id} />
                <input type="hidden" name="returnPath" value={returnPath} />
                <button
                  type="submit"
                  title="Remove action item"
                  className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-500 hover:bg-rose-50 hover:text-rose-700"
                >
                  Remove
                </button>
              </form>
            </li>
          ))}
        </ul>

        <CollapsibleFormSection title="Add action item" description="Owner plus what they owe." className="mt-5">
          <form action={createMeetingActionItem}>
            <input type="hidden" name="meetingId" value={meeting.id} />
            <input type="hidden" name="returnPath" value={returnPath} />
            <div className="grid gap-2 md:grid-cols-[160px_minmax(0,1fr)]">
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                <span>Owner</span>
                <input
                  name="owner"
                  required
                  placeholder="Dev"
                  className="rounded-md border border-slate-300 px-3 py-2 text-slate-900"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                <span>Action</span>
                <input
                  name="action"
                  required
                  placeholder="Send the onboarding doc"
                  className="rounded-md border border-slate-300 px-3 py-2 text-slate-900"
                />
              </label>
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="urgent" className="h-4 w-4 rounded border-slate-300" />
              <span>Urgent</span>
            </label>
            <button
              type="submit"
              className="mt-3 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Add action item
            </button>
          </form>
        </CollapsibleFormSection>
      </section>

      {newer || older ? (
        <nav className="flex flex-wrap items-center justify-between gap-3">
          {older ? (
            <Link
              href={`/meetings/${older.slug}`}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 hover:border-slate-300"
            >
              <span className="block text-[11px] uppercase tracking-[0.18em] text-slate-500">Previous meeting</span>
              <span className="mt-1 block font-medium text-slate-900">{older.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {newer ? (
            <Link
              href={`/meetings/${newer.slug}`}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-right text-sm text-slate-700 hover:border-slate-300"
            >
              <span className="block text-[11px] uppercase tracking-[0.18em] text-slate-500">Next meeting</span>
              <span className="mt-1 block font-medium text-slate-900">{newer.title}</span>
            </Link>
          ) : null}
        </nav>
      ) : null}
    </AppShell>
  );
}
