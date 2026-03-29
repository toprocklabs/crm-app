"use client";

import { useEffect, useRef, useState } from "react";

export function AutoSaveCompanyField({
  companyId,
  field,
  label,
  defaultValue,
  type = "text",
  action,
}: {
  companyId: number;
  field: "customerProjectUrl";
  label: string;
  defaultValue: string;
  type?: "text" | "url";
  action: (formData: FormData) => void | Promise<void>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSubmittedValueRef = useRef(defaultValue);
  const [isEditing, setIsEditing] = useState(false);
  const [draftValue, setDraftValue] = useState(defaultValue);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  function submitIfChanged() {
    const current = inputRef.current?.value ?? "";
    setIsEditing(false);

    if (current === lastSubmittedValueRef.current) {
      return;
    }

    lastSubmittedValueRef.current = current;
    formRef.current?.requestSubmit();
  }

  function beginEditing() {
    setDraftValue(lastSubmittedValueRef.current);
    setIsEditing(true);
  }

  return (
    <form ref={formRef} action={action} className="space-y-1">
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="field" value={field} />
      <label className="text-xs uppercase tracking-wide text-slate-500">{label}</label>
      {isEditing ? (
        <input
          ref={inputRef}
          name="value"
          type={type}
          value={draftValue}
          placeholder="No customer project URL"
          onChange={(event) => setDraftValue(event.currentTarget.value)}
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
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
        />
      ) : (
        <button
          type="button"
          onClick={beginEditing}
          className="w-full rounded-md border border-transparent bg-slate-50 px-3 py-2 text-left text-sm text-slate-900 transition hover:border-slate-200 hover:bg-white"
        >
          {defaultValue ? (
            <span className="underline decoration-slate-300 underline-offset-2">{defaultValue}</span>
          ) : (
            <span className="text-slate-500">No customer project URL</span>
          )}
        </button>
      )}
      <p className="text-[11px] text-slate-500">Auto-saves when you leave the field.</p>
    </form>
  );
}
