"use client";

import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { getActivityMeta } from "@/lib/activity-ui";
import type { ActivityType } from "@/lib/schema";

type ActivityContextLink = {
  label: string;
  href?: string;
};

type ActivityItem = {
  id: number;
  type: ActivityType;
  notes: string;
  occurredAt: Date | string;
  loggedByUsername?: string | null;
  contextLinks?: ActivityContextLink[];
  footer?: React.ReactNode;
};

function getDateKey(value: Date | string) {
  return new Date(value).toISOString().slice(0, 10);
}

function formatDateGroup(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(value: Date | string) {
  return new Date(value).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ActivityTimeline({
  items,
  emptyMessage,
}: {
  items: ActivityItem[];
  emptyMessage: string;
}) {
  if (items.length === 0) {
    return <EmptyState icon="activity" message={emptyMessage} className="mt-4" />;
  }

  const groups = items.reduce<Array<{ dateKey: string; items: ActivityItem[] }>>((acc, item) => {
    const dateKey = getDateKey(item.occurredAt);
    const lastGroup = acc[acc.length - 1];

    if (lastGroup && lastGroup.dateKey === dateKey) {
      lastGroup.items.push(item);
      return acc;
    }

    acc.push({ dateKey, items: [item] });
    return acc;
  }, []);

  return (
    <div className="mt-4 space-y-6">
      {groups.map((group) => (
        <section key={group.dateKey}>
          <div className="flex items-center gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {formatDateGroup(group.dateKey)}
            </h3>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <ul className="mt-4 space-y-4 border-l border-slate-200/90 pl-4">
            {group.items.map((item) => {
              const meta = getActivityMeta(item.type);
              const isStageChange = item.notes.startsWith("Stage changed:");

              return (
                <li
                  key={item.id}
                  className={`relative rounded-lg border p-4 before:absolute before:-left-[1.3rem] before:top-6 before:h-3 before:w-3 before:rounded-full before:border before:border-white before:bg-slate-300 ${
                    isStageChange
                      ? "border-cyan-200 bg-cyan-50/70 before:bg-cyan-400"
                      : "border-slate-200 bg-white before:bg-slate-300"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xs font-semibold shadow-sm ${meta.tone}`}>
                      {meta.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${meta.tone}`}>
                          {meta.label}
                        </span>
                        {isStageChange ? (
                          <span className="inline-flex rounded-full bg-cyan-100 px-2.5 py-1 text-xs font-semibold text-cyan-800">
                            Stage update
                          </span>
                        ) : null}
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                          {formatTime(item.occurredAt)}
                        </span>
                      </div>

                      <p className="mt-3 text-sm font-medium leading-6 text-slate-900">{item.notes}</p>

                      {item.contextLinks?.length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {item.contextLinks.map((link) =>
                            link.href ? (
                              <Link
                                key={`${item.id}-${link.label}-${link.href}`}
                                href={link.href}
                                className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                              >
                                {link.label}
                              </Link>
                            ) : (
                              <span
                                key={`${item.id}-${link.label}`}
                                className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
                              >
                                {link.label}
                              </span>
                            ),
                          )}
                        </div>
                      ) : null}

                      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-3 text-xs text-slate-500">
                        <span>Logged by {item.loggedByUsername ?? "Unknown user"}</span>
                        {item.footer}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
