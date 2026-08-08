"use client";

import { blurOnEnter, useAutoSaveInput } from "@/components/auto-save-hooks";

export function AutoSaveDealField({
  dealId,
  field,
  label,
  defaultValue,
  type = "text",
  required = false,
  min,
  action,
  helperText = "Auto-saves when you leave the field.",
}: {
  dealId: number;
  field:
    | "name"
    | "mrrUsd"
    | "implementationCostUsd"
    | "ownerName"
    | "nextStep"
    | "nextStepDueDate"
    | "expectedCloseDate";
  label: string;
  defaultValue: string;
  type?: "text" | "number" | "date";
  required?: boolean;
  min?: number;
  action: (formData: FormData) => void | Promise<void>;
  helperText?: string | null;
}) {
  const { formRef, inputRef, submitIfChanged } = useAutoSaveInput(defaultValue);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-1 text-sm text-slate-700">
      <input type="hidden" name="dealId" value={dealId} />
      <input type="hidden" name="field" value={field} />
      <span>{label}</span>
      <input
        ref={inputRef}
        name="value"
        type={type}
        min={min}
        required={required}
        defaultValue={defaultValue}
        onBlur={submitIfChanged}
        onKeyDown={blurOnEnter}
        className="rounded-md border border-slate-300 px-3 py-2 text-slate-900"
      />
      {helperText ? <p className="text-[11px] text-slate-500">{helperText}</p> : null}
    </form>
  );
}
