import Link from "next/link";
import { createMeeting, logActivity } from "@/app/actions";
import { ActivityTimeline } from "@/components/activity-timeline";
import { CollapsibleFormSection } from "@/components/collapsible-form-section";
import { activityTypeOptions, getActivityMeta } from "@/lib/activity-ui";
import { formatMeetingDate } from "@/lib/meeting/action-ui";
import type { listAccountMeetings } from "@/lib/meeting/queries";

type MeetingRow = Awaited<ReturnType<typeof listAccountMeetings>>[number];

type ActivityItem = React.ComponentProps<typeof ActivityTimeline>["items"][number];

// The main event on an account page (plan 006): every meeting note and every
// light touch in one reverse-chronological stream. Meetings render as full
// cards; activities render as one-liners, because a 177-character "emailed
// Kate" and a 29KB working-session note are not the same kind of thing.
export function AccountTimelinePanel({
  companyId,
  companyName,
  meetings,
  activities,
  openCountsByMeeting,
  dealOptions,
  contactOptions,
  today,
}: {
  companyId: number;
  companyName: string;
  meetings: MeetingRow[];
  activities: ActivityItem[];
  openCountsByMeeting: Map<number, { open: number; urgent: number }>;
  dealOptions: { id: number; name: string }[];
  contactOptions: { id: number; firstName: string; lastName: string }[];
  today: string;
}) {
  const returnPath = `/accounts/${companyId}`;
  const latest = meetings[0] ?? null;

  return (
    <section id="account-notes" className="gong-panel rounded-xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Relationship</p>
          <h2 className="mt-2 text-lg font-semibold text-slate-900">Meetings &amp; notes</h2>
          <p className="mt-2 text-sm text-slate-600">
            {latest
              ? `${meetings.length} meeting note${meetings.length === 1 ? "" : "s"} · last on ${formatMeetingDate(latest.meetingDate)}`
              : "No meeting notes yet. Every conversation with this client belongs here."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CollapsibleFormSection
            id="meeting-create"
            title="Add meeting note"
            description="Capture a working session, call, or demo."
            variant="compact"
          >
            <form action={createMeeting} className="min-w-[min(38rem,80vw)]">
              <input type="hidden" name="companyId" value={companyId} />
              <input type="hidden" name="returnPath" value={returnPath} />
              <div className="grid gap-2 md:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm text-slate-700 md:col-span-2">
                  <span>Title</span>
                  <input
                    name="title"
                    required
                    placeholder="Kickoff — design themes & workflow discovery"
                    className="rounded-md border border-slate-300 px-3 py-2 text-slate-900"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm text-slate-700">
                  <span>Date</span>
                  <input
                    name="meetingDate"
                    type="date"
                    required
                    defaultValue={today}
                    className="rounded-md border border-slate-300 px-3 py-2 text-slate-900"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm text-slate-700">
                  <span>Format</span>
                  <input
                    name="format"
                    placeholder="Working session — demo + planning"
                    className="rounded-md border border-slate-300 px-3 py-2 text-slate-900"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm text-slate-700 md:col-span-2">
                  <span>TL;DR</span>
                  <textarea
                    name="tldr"
                    rows={3}
                    placeholder="One paragraph: the headline outcomes and the single most important item."
                    className="rounded-md border border-slate-300 px-3 py-2 text-slate-900"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm text-slate-700 md:col-span-2">
                  <span>Notes (markdown)</span>
                  <textarea
                    name="bodyMd"
                    rows={8}
                    placeholder={"## Participants\n\n- Name — role\n\n## 1. Topic\n\n- Point"}
                    className="rounded-md border border-slate-300 px-3 py-2 font-mono text-[13px] text-slate-900"
                  />
                </label>
              </div>
              <button
                type="submit"
                className="mt-3 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Save meeting note
              </button>
            </form>
          </CollapsibleFormSection>

          <CollapsibleFormSection
            id="activity-create"
            title="Log a touch"
            description="A one-line note, call, or email."
            variant="compact"
          >
            <form action={logActivity} className="min-w-[min(32rem,80vw)]">
              <input type="hidden" name="companyId" value={companyId} />
              <input type="hidden" name="returnPath" value={returnPath} />
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
                  <span>Date</span>
                  <input
                    name="occurredOn"
                    type="date"
                    defaultValue={today}
                    className="rounded-md border border-slate-300 px-3 py-2 text-slate-900"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm text-slate-700">
                  <span>Opportunity (optional)</span>
                  <select name="dealId" className="rounded-md border border-slate-300 px-3 py-2 text-slate-900">
                    <option value="">None</option>
                    {dealOptions.map((deal) => (
                      <option key={deal.id} value={deal.id}>
                        {deal.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm text-slate-700">
                  <span>Contact (optional)</span>
                  <select name="contactId" className="rounded-md border border-slate-300 px-3 py-2 text-slate-900">
                    <option value="">None</option>
                    {contactOptions.map((contact) => (
                      <option key={contact.id} value={contact.id}>
                        {contact.firstName} {contact.lastName}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm text-slate-700 md:col-span-2">
                  <span>Notes</span>
                  <textarea
                    name="notes"
                    required
                    rows={3}
                    placeholder="Add a quick note about this interaction."
                    className="rounded-md border border-slate-300 px-3 py-2 text-slate-900"
                  />
                </label>
              </div>
              <button
                type="submit"
                className="mt-3 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Save
              </button>
            </form>
          </CollapsibleFormSection>
        </div>
      </div>

      {meetings.length > 0 ? (
        <ul className="mt-5 space-y-3">
          {meetings.map((meeting) => {
            const counts = openCountsByMeeting.get(meeting.id);
            const shared = meeting.ownerCompanyId !== companyId;

            return (
              <li key={meeting.id} className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-cyan-700">{meeting.meetingDate}</span>
                  {meeting.format ? (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                      {meeting.format.split("—")[0].trim()}
                    </span>
                  ) : null}
                  {shared ? (
                    <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-semibold text-violet-700">
                      Shared note
                    </span>
                  ) : null}
                  {meeting.statusLabel ? (
                    <span className="text-xs text-slate-500">{meeting.statusLabel}</span>
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
                  <p className="mt-1.5 line-clamp-3 text-sm leading-6 text-slate-600">{meeting.tldr}</p>
                ) : null}
                {counts && counts.open > 0 ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {counts.urgent > 0 ? (
                      <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-semibold text-rose-800">
                        {counts.urgent} urgent
                      </span>
                    ) : null}
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
                      {counts.open} open item{counts.open === 1 ? "" : "s"}
                    </span>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-5 rounded-lg border border-dashed border-slate-200 p-5 text-sm text-slate-500">
          No meeting notes for {companyName} yet. Add one above, or ask Claude to draft it from a transcript.
        </p>
      )}

      {activities.length > 0 ? (
        <div className="mt-6 border-t border-slate-200 pt-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Touches ({activities.length})
          </p>
          <div className="mt-3">
            <ActivityTimeline emptyMessage="No touches logged." items={activities} />
          </div>
        </div>
      ) : null}
    </section>
  );
}
