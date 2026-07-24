"use client";

import { useEffect, useRef, useState } from "react";

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
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSubmittedValueRef = useRef(defaultValue);
  const [displayValue, setDisplayValue] = useState(defaultValue);
  const [isEditing, setIsEditing] = useState(false);
  const [draftValue, setDraftValue] = useState(defaultValue);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  function submitIfChanged() {
    const current = inputRef.current?.value.trim() ?? "";
    setIsEditing(false);

    // Keep the stored PIN when the edit is empty or not 3-6 digits.
    if (current === lastSubmittedValueRef.current || !/^\d{3,6}$/.test(current)) {
      setDraftValue(lastSubmittedValueRef.current);
      return;
    }

    lastSubmittedValueRef.current = current;
    setDisplayValue(current);
    formRef.current?.requestSubmit();
  }

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
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              (event.currentTarget as HTMLInputElement).blur();
            }
            if (event.key === "Escape") {
              event.preventDefault();
              setDraftValue(lastSubmittedValueRef.current);
              setIsEditing(false);
            }
          }}
          className="w-20 rounded-md border border-slate-300 px-2 py-1 font-mono text-xs text-slate-900"
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setDraftValue(lastSubmittedValueRef.current);
            setIsEditing(true);
          }}
          title="Click to change the client PIN"
          className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-xs font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-white"
        >
          {displayValue}
        </button>
      )}
    </form>
  );
}
