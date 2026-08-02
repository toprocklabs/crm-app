"use client";

import { useAutoSaveSelect } from "@/components/auto-save-hooks";

export function AutoSaveDealSelectField({
  dealId,
  field,
  label,
  defaultValue,
  options,
  emptyOptionLabel,
  helperText = "Auto-saves when you change the selection.",
  action,
}: {
  dealId: number;
  field: "companyId" | "primaryContactId";
  label: string;
  defaultValue: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  emptyOptionLabel?: string;
  helperText?: string | null;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const { formRef, selectedValue, onSelectChange } = useAutoSaveSelect(defaultValue, action);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-1 text-sm text-slate-700">
      <input type="hidden" name="dealId" value={dealId} />
      <input type="hidden" name="field" value={field} />
      <span>{label}</span>
      <select
        name="value"
        value={selectedValue}
        onChange={onSelectChange}
        className="rounded-md border border-slate-300 px-3 py-2 text-slate-900"
      >
        {emptyOptionLabel ? <option value="">{emptyOptionLabel}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {helperText ? <p className="text-[11px] text-slate-500">{helperText}</p> : null}
    </form>
  );
}
