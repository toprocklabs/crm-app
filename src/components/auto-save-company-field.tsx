"use client";

import { useEffect, useRef, useState } from "react";

export function AutoSaveCompanyField({
  companyId,
  field,
  label,
  defaultValue,
  emptyText,
  type = "text",
  action,
}: {
  companyId: number;
  field: "website" | "customerProjectUrl";
  label: string;
  defaultValue: string;
  emptyText?: string;
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

  const normalizedUrl =
    defaultValue && defaultValue.trim()
      ? (defaultValue.startsWith("http://") || defaultValue.startsWith("https://")
          ? defaultValue
          : `https://${defaultValue}`)
      : null;

  const fallbackText = emptyText ?? (field === "website" ? "No website" : "No customer project URL");

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
          placeholder={fallbackText}
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
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={beginEditing}
            className="min-w-0 flex-1 rounded-md border border-transparent bg-slate-50 px-3 py-2 text-left text-sm text-slate-900 transition hover:border-slate-200 hover:bg-white"
            title={defaultValue || fallbackText}
          >
            {defaultValue ? (
              <span className="block truncate underline decoration-slate-300 underline-offset-2">{defaultValue}</span>
            ) : (
              <span className="text-slate-500">{fallbackText}</span>
            )}
          </button>
          {normalizedUrl ? (
            <a
              href={normalizedUrl}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 rounded-md border border-slate-300 bg-white px-2.5 py-2 text-xs font-medium text-slate-700"
            >
              Open
            </a>
          ) : null}
        </div>
      )}
      <p className="text-[11px] text-slate-500">Auto-saves when you leave the field.</p>
    </form>
  );
}
