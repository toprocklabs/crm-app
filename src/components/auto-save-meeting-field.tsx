"use client";

import { useAutoSaveEditable } from "@/components/auto-save-hooks";
import { formatMeetingDate } from "@/lib/meeting/action-ui";

// Family A (click-to-edit) for a meeting note's header fields. See
// src/components/auto-save-hooks.ts for why the three families stay separate.
export function AutoSaveMeetingField({
  meetingId,
  field,
  label,
  defaultValue,
  emptyText,
  type = "text",
  action,
  returnPath,
  className,
  valueClassName,
}: {
  meetingId: number;
  field: "title" | "meetingDate" | "format" | "statusLabel";
  label: string;
  defaultValue: string;
  emptyText: string;
  type?: "text" | "date";
  action: (formData: FormData) => void | Promise<void>;
  returnPath?: string;
  className?: string;
  valueClassName?: string;
}) {
  const {
    formRef,
    inputRef,
    displayValue,
    draftValue,
    setDraftValue,
    isEditing,
    beginEditing,
    submitIfChanged,
    onEditKeyDown,
  } = useAutoSaveEditable(defaultValue);

  const shown =
    displayValue && field === "meetingDate" ? formatMeetingDate(displayValue) : displayValue;

  return (
    <form ref={formRef} action={action} className={className}>
      <input type="hidden" name="meetingId" value={meetingId} />
      <input type="hidden" name="field" value={field} />
      {returnPath ? <input type="hidden" name="returnPath" value={returnPath} /> : null}
      <span className="sr-only">{label}</span>
      {isEditing ? (
        <input
          ref={inputRef}
          name="value"
          type={type}
          value={draftValue}
          placeholder={emptyText}
          aria-label={label}
          onChange={(event) => setDraftValue(event.currentTarget.value)}
          onBlur={submitIfChanged}
          onKeyDown={onEditKeyDown}
          className="w-full rounded-md border border-slate-300 px-2 py-1 text-inherit text-slate-900"
        />
      ) : (
        <button
          type="button"
          onClick={beginEditing}
          title={`Edit ${label.toLowerCase()}`}
          className={`rounded-md border border-transparent px-1.5 py-0.5 text-left transition hover:border-slate-200 hover:bg-slate-50 ${valueClassName ?? ""}`}
        >
          {shown || <span className="text-slate-400">{emptyText}</span>}
        </button>
      )}
    </form>
  );
}
