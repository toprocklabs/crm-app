import Link from "next/link";
import { updateMeetingActionStatus } from "@/app/actions";
import { MeetingActionStatusSelect } from "@/components/meeting-action-status-select";
import { formatMeetingDate, getMeetingOwnerTone } from "@/lib/meeting/action-ui";
import type { listAccountOpenActionItems } from "@/lib/meeting/queries";

type ActionItem = Awaited<ReturnType<typeof listAccountOpenActionItems>>[number];

// What we owe this client and what they owe us, rolled up out of every meeting
// note. This replaces the hand-maintained "Open action items" table that used to
// be copied onto each client's index.html in the old notes site — here it's a
// query, so it can never drift from the notes it came from.
export function AccountActionItemsPanel({
  companyId,
  items,
}: {
  companyId: number;
  items: ActionItem[];
}) {
  const returnPath = `/accounts/${companyId}`;
  const urgent = items.filter((item) => item.urgent);

  if (items.length === 0) {
    return null;
  }

  return (
    <section id="account-action-items" className="gong-panel rounded-xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Homework</p>
          <h2 className="mt-2 text-lg font-semibold text-slate-900">Open action items</h2>
          <p className="mt-2 text-sm text-slate-600">Pulled from every meeting note on this account.</p>
        </div>
        <div className="rounded-xl bg-slate-100 px-3 py-2 text-right text-sm font-medium text-slate-700">
          <p>{items.length} open</p>
          {urgent.length > 0 ? <p className="text-xs font-semibold text-rose-700">{urgent.length} urgent</p> : null}
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className={`flex flex-wrap items-start gap-3 rounded-lg border p-3 ${
              item.urgent ? "border-rose-200 bg-rose-50/50" : "border-slate-200 bg-white"
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
            <p className="min-w-[12rem] flex-1 text-sm leading-6 text-slate-800">{item.action}</p>
            <Link
              href={`/meetings/${item.meetingSlug}`}
              title={item.meetingTitle}
              className="shrink-0 font-mono text-xs text-slate-400 hover:text-cyan-700"
            >
              {formatMeetingDate(item.meetingDate, "short")}
            </Link>
            <MeetingActionStatusSelect
              actionItemId={item.id}
              defaultValue={item.status}
              action={updateMeetingActionStatus}
              returnPath={returnPath}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
