import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import type { Db } from "@/lib/define-action";
import { meetingActionItems, meetingCompanies, meetings } from "@/lib/schema";

// A meeting belongs to one account (`meetings.company_id`) and may be shared
// with others through `meeting_companies` — the scuba cluster is why. Both
// account pages should show the shared note, so every account-scoped read goes
// through this predicate rather than a bare `company_id =`.
function visibleToAccount(companyId: number) {
  return or(
    eq(meetings.companyId, companyId),
    sql`exists (
      select 1 from ${meetingCompanies}
      where ${meetingCompanies.meetingId} = ${meetings.id}
        and ${meetingCompanies.companyId} = ${companyId}
    )`,
  );
}

// Header columns only. `body_md` averages ~11KB and is never needed in a list —
// see planning/006-client-notes-merge/, and the same lesson in plan 002.
export async function listAccountMeetings(db: Db, companyId: number) {
  return db
    .select({
      id: meetings.id,
      slug: meetings.slug,
      title: meetings.title,
      meetingDate: meetings.meetingDate,
      format: meetings.format,
      statusLabel: meetings.statusLabel,
      tldr: meetings.tldr,
      ownerCompanyId: meetings.companyId,
    })
    .from(meetings)
    .where(visibleToAccount(companyId))
    .orderBy(desc(meetings.meetingDate), desc(meetings.id));
}

// Open homework for an account, newest meeting first, urgent floated to the top.
export async function listAccountOpenActionItems(db: Db, companyId: number) {
  const visible = db
    .select({ id: meetings.id })
    .from(meetings)
    .where(visibleToAccount(companyId));

  return db
    .select({
      id: meetingActionItems.id,
      owner: meetingActionItems.owner,
      action: meetingActionItems.action,
      status: meetingActionItems.status,
      urgent: meetingActionItems.urgent,
      meetingId: meetingActionItems.meetingId,
      meetingSlug: meetings.slug,
      meetingDate: meetings.meetingDate,
      meetingTitle: meetings.title,
    })
    .from(meetingActionItems)
    .innerJoin(meetings, eq(meetings.id, meetingActionItems.meetingId))
    .where(
      and(
        inArray(meetingActionItems.meetingId, visible),
        inArray(meetingActionItems.status, ["todo", "doing"]),
      ),
    )
    .orderBy(desc(meetingActionItems.urgent), desc(meetings.meetingDate), meetingActionItems.id);
}

// The cross-account roll-up (dashboard + /tasks). Grouped by the meeting's
// OWNER account, not by visibility — otherwise a note shared across the scuba
// cluster would count its homework twice.
export async function listOpenActionItemsByAccount(db: Db) {
  return db
    .select({
      id: meetingActionItems.id,
      companyId: meetingActionItems.companyId,
      owner: meetingActionItems.owner,
      action: meetingActionItems.action,
      status: meetingActionItems.status,
      urgent: meetingActionItems.urgent,
      meetingSlug: meetings.slug,
      meetingDate: meetings.meetingDate,
    })
    .from(meetingActionItems)
    .innerJoin(meetings, eq(meetings.id, meetingActionItems.meetingId))
    .where(inArray(meetingActionItems.status, ["todo", "doing"]))
    .orderBy(desc(meetingActionItems.urgent), desc(meetings.meetingDate), meetingActionItems.id);
}
