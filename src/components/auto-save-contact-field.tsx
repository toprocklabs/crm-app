"use client";

import { blurOnEnter, useAutoSaveInput } from "@/components/auto-save-hooks";

export function AutoSaveContactField({
  contactId,
  field,
  label,
  defaultValue,
  type = "text",
  returnPath,
  action,
}: {
  contactId: number;
  field: "title" | "email" | "phone" | "linkedinProfileUrl";
  label: string;
  defaultValue: string;
  type?: "text" | "email" | "tel" | "url";
  returnPath?: string;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const { formRef, inputRef, submitIfChanged } = useAutoSaveInput(defaultValue);

  return (
    <form ref={formRef} action={action} className="space-y-1">
      <input type="hidden" name="contactId" value={contactId} />
      <input type="hidden" name="field" value={field} />
      {returnPath ? <input type="hidden" name="returnPath" value={returnPath} /> : null}
      <label className="text-xs uppercase tracking-wide text-slate-500">{label}</label>
      <input
        ref={inputRef}
        name="value"
        type={type}
        defaultValue={defaultValue}
        placeholder={field === "linkedinProfileUrl" ? "No LinkedIn URL" : `No ${field}`}
        onBlur={submitIfChanged}
        onKeyDown={blurOnEnter}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
      />
      <p className="text-[11px] text-slate-500">Auto-saves when you leave the field.</p>
    </form>
  );
}
