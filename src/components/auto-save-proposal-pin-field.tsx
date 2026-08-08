"use client";

import { useAutoSaveEditable } from "@/components/auto-save-hooks";

// Keep the stored PIN when the edit is empty or not 3-6 digits: returning null
// tells the hook to reject the edit and revert rather than submit.
const normalizePin = (raw: string) => {
  const trimmed = raw.trim();
  return /^\d{3,6}$/.test(trimmed) ? trimmed : null;
};

// Compact inline PIN editor for proposal tables/panels. Click to edit,
// auto-saves on blur/Enter (same interaction as the other autosave fields).
export function AutoSaveProposalPinField({
  proposalId,
  defaultValue,
  action,
  returnPath,
}: {
  proposalId: number;
  defaultValue: string;
  action: (formData: FormData) => void | Promise<void>;
  returnPath?: string;
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
  } = useAutoSaveEditable(defaultValue, normalizePin);

  return (
    <form ref={formRef} action={action} className="inline-block">
      <input type="hidden" name="proposalId" value={proposalId} />
      {returnPath ? <input type="hidden" name="returnPath" value={returnPath} /> : null}
      {isEditing ? (
        <input
          ref={inputRef}
          name="pin"
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={draftValue}
          onChange={(event) => setDraftValue(event.currentTarget.value.replace(/\D/g, ""))}
          onBlur={submitIfChanged}
          onKeyDown={onEditKeyDown}
          className="w-20 rounded-md border border-slate-300 px-2 py-1 font-mono text-xs text-slate-900"
        />
      ) : (
        <button
          type="button"
          onClick={beginEditing}
          title="Click to change the client PIN"
          className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-xs font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-white"
        >
          {displayValue}
        </button>
      )}
    </form>
  );
}
