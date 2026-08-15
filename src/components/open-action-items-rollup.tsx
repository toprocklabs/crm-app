import Link from "next/link";
import { updateMeetingActionStatus } from "@/app/actions";
import { MeetingActionStatusSelect } from "@/components/meeting-action-status-select";
import { getDb } from "@/lib/db";
import { formatMeetingDate, getMeetingOwnerTone } from "@/lib/meeting/action-ui";
import { listOpenActionItemsByAccount } from "@/lib/meeting/queries";
import { companies } from "@/lib/schema";

// "What do we owe people this week", across every client — the thing the static
// notes site could never do, because each client's open-items table was a
// hand-maintained copy (plan 006, phase 5).
export async function OpenActionItemsRollup({
  returnPath,
  limitPerAccount,
}: {
  returnPath: string;
  limitPerAccount?: number;
}) {
  const db = getDb();
  if (!db) {
    return null;
  }

  const [items, accounts] = await Promise.all([
    listOpenActionItemsByAccount(db),
    db.select({ id: companies.id, name: companies.name }).from(companies).orderBy(companies.name),
  ]);

  if (items.length === 0) {
    return null;
  }

  const nameById = new Map(accounts.map((row) => [row.id, row.name]));

  // Group by account, preserving the urgent-first / newest-first order the query
  // already established.
  const grouped = new Map<number, typeof items>();
  for (const item of items) {
    const list = grouped.get(item.companyId) ?? [];
    list.push(item);
    grouped.set(item.companyId, list);
  }

  const sections = [...grouped.entries()].sort((a, b) => {
    const urgentA = a[1].filter((item) => item.urgent).length;
    const urgentB = b[1].filter((item) => item.urgent).length;
    return urgentB - urgentA || b[1].length - a[1].length;
  });

  const urgentTotal = items.filter((item) => item.urgent).length;

  return (
    <section className="gong-panel rounded-xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Homework</p>
          <h2 className="mt-2 text-lg font-semibold text-slate-950">Open action items</h2>
          <p className="mt-2 text-sm text-slate-600">Everything owed across every client, out of the meeting notes.</p>
        </div>
        <div className="flex items-center gap-2">
          {urgentTotal > 0 ? (
            <span className="inline-flex rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-800">
              {urgentTotal} urgent
            </span>
          ) : null}
          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
            {items.length} open
          </span>
          <Link
            href="/meetings"
            className="inline-flex rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            All notes
          </Link>
        </div>
      </div>

      <div className="mt-5 space-y-5">
        {sections.map(([companyId, accountItems]) => {
          const shown = limitPerAccount ? accountItems.slice(0, limitPerAccount) : accountItems;
          const hidden = accountItems.length - shown.length;

          return (
            <div key={companyId}>
              <div className="flex flex-wrap items-baseline gap-2">
                <Link
                  href={`/accounts/${companyId}`}
                  className="text-sm font-semibold text-slate-900 underline decoration-slate-300 underline-offset-2"
                >
                  {nameById.get(companyId) ?? `Account #${companyId}`}
                </Link>
                <span className="text-xs text-slate-500">{accountItems.length} open</span>
              </div>
              <ul className="mt-2 space-y-1.5">
                {shown.map((item) => (
                  <li
                    key={item.id}
                    className={`flex flex-wrap items-start gap-2.5 rounded-lg border px-3 py-2 ${
                      item.urgent ? "border-rose-200 bg-rose-50/50" : "border-slate-200 bg-white"
                    }`}
                  >
                    <span
                      className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${getMeetingOwnerTone(item.owner)}`}
                    >
                      {item.owner}
                    </span>
                    {item.urgent ? (
                      <span className="inline-flex shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-800">
                        Urgent
                      </span>
                    ) : null}
                    <span className="min-w-[10rem] flex-1 text-sm leading-6 text-slate-800">{item.action}</span>
                    <Link
                      href={`/meetings/${item.meetingSlug}`}
                      className="shrink-0 font-mono text-[11px] text-slate-400 hover:text-cyan-700"
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
              {hidden > 0 ? (
                <p className="mt-1.5 text-xs text-slate-500">
                  <Link href={`/accounts/${companyId}#account-action-items`} className="underline underline-offset-2">
                    {hidden} more on the account
                  </Link>
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
