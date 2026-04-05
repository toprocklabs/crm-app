"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function AutoSaveCompanySelectField({
  companyId,
  field,
  label,
  defaultValue,
  options,
  emptyOptionLabel,
  action,
}: {
  companyId: number;
  field: "industry" | "stage";
  label: string;
  defaultValue: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  emptyOptionLabel?: string;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const lastSubmittedValueRef = useRef(defaultValue);
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (defaultValue !== lastSubmittedValueRef.current) {
      return;
    }

    setValue(defaultValue);
  }, [defaultValue]);

  function submitValue(current: string) {
    const formData = new FormData();
    formData.append("companyId", String(companyId));
    formData.append("field", field);
    formData.append("value", current);

    startTransition(() => {
      void Promise.resolve(action(formData)).then(() => {
        router.refresh();
      });
    });
  }

  return (
    <div className="space-y-1">
      <label className="text-xs uppercase tracking-wide text-slate-500">{label}</label>
      <select
        value={value}
        onChange={(event) => {
          const current = event.currentTarget.value;
          setValue(current);

          if (current === lastSubmittedValueRef.current) {
            return;
          }

          lastSubmittedValueRef.current = current;
          submitValue(current);
        }}
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
      >
        {emptyOptionLabel ? <option value="">{emptyOptionLabel}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <p className="text-[11px] text-slate-500">Auto-saves when you change the selection.</p>
    </div>
  );
}
