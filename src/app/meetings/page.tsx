import { desc, eq, inArray, sql } from "drizzle-orm";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { formatMeetingDate } from "@/lib/meeting/action-ui";
import { companies, meetingActionItems, meetingCompanies, meetings } from "@/lib/schema";

export const dynamic = "force-dynamic";

export default async function MeetingsPage() {
  const session = await requireUser();
  const db = getDb();

  if (!db) {
    return null;
  }

  const [rows, openCounts, sharedLinks] = await Promise.all([
    db
      .select({
        id: meetings.id,
        slug: meetings.slug,
        title: meetings.title,
        meetingDate: meetings.meetingDate,
        format: meetings.format,
        tldr: meetings.tldr,
        companyId: meetings.companyId,
        companyName: companies.name,
      })
      .from(meetings)
      .innerJoin(companies, eq(companies.id, meetings.companyId))
      .orderBy(desc(meetings.meetingDate), desc(meetings.id)),
    db
      .select({
        meetingId: meetingActionItems.meetingId,
        open: sql<number>`count(*)`,
        urgent: sql<number>`count(*) filter (where ${meetingActionItems.urgent})`,
      })
      .from(meetingActionItems)
      .where(inArray(meetingActionItems.status, ["todo", "doing"]))
      .groupBy(meetingActionItems.meetingId),
    db
      .select({
        meetingId: meetingCompanies.meetingId,
        companyId: companies.id,
        companyName: companies.name,
      })
      .from(meetingCompanies)
      .innerJoin(companies, eq(companies.id, meetingCompanies.companyId)),
  ]);

  const countsByMeeting = new Map(
    openCounts.map((row) => [row.meetingId, { open: Number(row.open), urgent: Number(row.urgent) }]),
  );
  const sharedByMeeting = new Map<number, { id: number; name: string }[]>();
  for (const link of sharedLinks) {
    const list = sharedByMeeting.get(link.meetingId) ?? [];
    list.push({ id: link.companyId, name: link.companyName });
    sharedByMeeting.set(link.meetingId, list);
  }

  const totalOpen = openCounts.reduce((sum, row) => sum + Number(row.open), 0);

  return (
    <AppShell
      username={session.username}
      title="Meetings"
      description="Every client meeting note, newest first."
    >
      <section className="gong-panel rounded-xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Notes</p>
            <h2 className="mt-2 text-lg font-semibold text-slate-900">{rows.length} meeting notes</h2>
            <p className="mt-2 text-sm text-slate-600">
              Add a note from an account page — that&apos;s where it gets its client.
            </p>
          </div>
          <div className="rounded-xl bg-slate-100 px-3 py-2 text-right text-sm font-medium text-slate-700">
            <p>{totalOpen} open items</p>
            <p className="text-xs text-slate-500">across all clients</p>
          </div>
        </div>

        <ul className="mt-5 space-y-3">
          {rows.length === 0 ? (
            <li>
              <EmptyState icon="task" message="No meeting notes yet." />
            </li>
          ) : null}
          {rows.map((meeting) => {
            const counts = countsByMeeting.get(meeting.id);
            const shared = sharedByMeeting.get(meeting.id) ?? [];

            return (
              <li key={meeting.id} className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-cyan-700">{meeting.meetingDate}</span>
                  <Link
                    href={`/accounts/${meeting.companyId}`}
                    className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-200"
                  >
                    {meeting.companyName}
                  </Link>
                  {shared.map((account) => (
                    <Link
                      key={account.id}
                      href={`/accounts/${account.id}`}
                      className="rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-semibold text-violet-700 hover:bg-violet-200"
                    >
                      {account.name}
                    </Link>
                  ))}
                  {counts && counts.urgent > 0 ? (
                    <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-semibold text-rose-800">
                      {counts.urgent} urgent
                    </span>
                  ) : null}
                  {counts && counts.open > 0 ? (
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
                      {counts.open} open
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 font-medium text-slate-900">
                  <Link
                    href={`/meetings/${meeting.slug}`}
                    className="underline decoration-slate-300 underline-offset-2 hover:decoration-slate-500"
                  >
                    {meeting.title}
                  </Link>
                </p>
                {meeting.tldr ? (
                  <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-slate-600">{meeting.tldr}</p>
                ) : null}
                <p className="mt-2 text-xs text-slate-400">{formatMeetingDate(meeting.meetingDate)}</p>
              </li>
            );
          })}
        </ul>
      </section>
    </AppShell>
  );
}
