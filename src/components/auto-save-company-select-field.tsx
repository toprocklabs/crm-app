"use client";

import { useAutoSaveSelect } from "@/components/auto-save-hooks";
import { getAccountStageTone } from "@/lib/account-stage";
import type { AccountStage } from "@/lib/schema";

export function AutoSaveCompanySelectField({
  companyId,
  field,
  label,
  defaultValue,
  options,
  emptyOptionLabel,
  helperText = "Auto-saves when you change the selection.",
  labelClassName,
  selectClassName,
  stageToneStyle = false,
  action,
}: {
  companyId: number;
  field: "industry" | "stage";
  label: string;
  defaultValue: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  emptyOptionLabel?: string;
  helperText?: string | null;
  labelClassName?: string;
  selectClassName?: string;
  stageToneStyle?: boolean;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const { formRef, selectedValue, onSelectChange } = useAutoSaveSelect(defaultValue, action);
  const resolvedSelectClassName = stageToneStyle
    ? "app-stage-select w-full bg-transparent pr-7 pl-0 text-xs font-medium"
    : (selectClassName ?? "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900");
  const stageToneClassName = stageToneStyle ? getAccountStageTone(selectedValue as AccountStage) : "";

  return (
    <form ref={formRef} action={action} className="space-y-1">
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="field" value={field} />
      <label className={labelClassName ?? "text-xs uppercase tracking-wide text-slate-500"}>{label}</label>
      {stageToneStyle ? (
        <div
          data-stage={selectedValue}
          className={`app-stage-select-shell relative min-w-[180px] rounded-full border px-3 py-1.5 ${stageToneClassName}`}
        >
          <select
            name="value"
            value={selectedValue}
            data-stage={selectedValue}
            onChange={onSelectChange}
            className={resolvedSelectClassName}
          >
            {emptyOptionLabel ? <option value="">{emptyOptionLabel}</option> : null}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px]">
            ▼
          </span>
        </div>
      ) : (
        <select
          name="value"
          value={selectedValue}
          onChange={onSelectChange}
          className={resolvedSelectClassName}
        >
          {emptyOptionLabel ? <option value="">{emptyOptionLabel}</option> : null}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
      {helperText ? <p className="text-[11px] text-slate-500">{helperText}</p> : null}
    </form>
  );
}
