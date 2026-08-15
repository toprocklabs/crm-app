"use client";

import { useAutoSaveSelect } from "@/components/auto-save-hooks";
import {
  meetingActionStatusLabels,
  meetingActionStatusOptions,
  meetingActionStatusPillClasses,
} from "@/lib/meeting/action-ui";
import type { MeetingActionStatus } from "@/lib/schema";

// Family C (select, save on change). Renders as a status pill so a note's
// homework table reads the way the old HTML one did.
export function MeetingActionStatusSelect({
  actionItemId,
  defaultValue,
  action,
  returnPath,
}: {
  actionItemId: number;
  defaultValue: MeetingActionStatus;
  action: (formData: FormData) => void | Promise<void>;
  returnPath?: string;
}) {
  const { formRef, selectedValue, pending, onSelectChange } = useAutoSaveSelect(defaultValue, action);
  const tone = meetingActionStatusPillClasses[selectedValue as MeetingActionStatus] ?? "bg-slate-100 text-slate-700";

  return (
    <form ref={formRef} action={action}>
      <input type="hidden" name="actionItemId" value={actionItemId} />
      {returnPath ? <input type="hidden" name="returnPath" value={returnPath} /> : null}
      <select
        name="status"
        value={selectedValue}
        disabled={pending}
        aria-label="Action item status"
        onChange={onSelectChange}
        className={`cursor-pointer rounded-full border-0 px-2.5 py-1 text-xs font-semibold outline-none disabled:opacity-60 ${tone}`}
      >
        {meetingActionStatusOptions.map((status) => (
          <option key={status} value={status}>
            {meetingActionStatusLabels[status]}
          </option>
        ))}
      </select>
    </form>
  );
}
