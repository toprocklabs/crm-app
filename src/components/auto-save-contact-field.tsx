"use client";

import { useRef } from "react";

export function AutoSaveContactField({
  contactId,
  field,
  label,
  defaultValue,
  type = "text",
  action,
}: {
  contactId: number;
  field: "title" | "email" | "phone";
  label: string;
  defaultValue: string;
  type?: "text" | "email" | "tel";
  action: (formData: FormData) => void | Promise<void>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSubmittedValueRef = useRef(defaultValue);

  function submitIfChanged() {
    const current = inputRef.current?.value ?? "";

    if (current === lastSubmittedValueRef.current) {
      return;
    }

    lastSubmittedValueRef.current = current;
    formRef.current?.requestSubmit();
  }

  return (
    <form ref={formRef} action={action} className="space-y-1">
      <input type="hidden" name="contactId" value={contactId} />
      <input type="hidden" name="field" value={field} />
      <label className="text-xs uppercase tracking-wide text-slate-500">{label}</label>
      <input
        ref={inputRef}
        name="value"
        type={type}
        defaultValue={defaultValue}
        placeholder={`No ${field}`}
        onBlur={submitIfChanged}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            (event.currentTarget as HTMLInputElement).blur();
          }
        }}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
      />
      <p className="text-[11px] text-slate-500">Auto-saves when you leave the field.</p>
    </form>
  );
}
