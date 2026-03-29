"use client";

import { useRef } from "react";

export function AutoSaveCompanySelectField({
  companyId,
  field,
  label,
  defaultValue,
  options,
  action,
}: {
  companyId: number;
  field: "industry";
  label: string;
  defaultValue: string;
  options: readonly string[];
  action: (formData: FormData) => void | Promise<void>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const lastSubmittedValueRef = useRef(defaultValue);

  return (
    <form ref={formRef} action={action} className="space-y-1">
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="field" value={field} />
      <label className="text-xs uppercase tracking-wide text-slate-500">{label}</label>
      <select
        name="value"
        defaultValue={defaultValue}
        onChange={(event) => {
          const current = event.currentTarget.value;

          if (current === lastSubmittedValueRef.current) {
            return;
          }

          lastSubmittedValueRef.current = current;
          formRef.current?.requestSubmit();
        }}
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
      >
        <option value="">No industry</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <p className="text-[11px] text-slate-500">Auto-saves when you change the selection.</p>
    </form>
  );
}
