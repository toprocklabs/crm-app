"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
  const formRef = useRef<HTMLFormElement>(null);
  const lastSubmittedValueRef = useRef(defaultValue);
  const router = useRouter();
  const [selectedValue, setSelectedValue] = useState(defaultValue);
  const [, startTransition] = useTransition();
  const resolvedSelectClassName = stageToneStyle
    ? "crm-stage-select w-full bg-transparent pr-7 pl-0 text-xs font-medium"
    : (selectClassName ?? "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900");
  const stageToneClassName = stageToneStyle ? getAccountStageTone(selectedValue as AccountStage) : "";

  function submitValue() {
    startTransition(() => {
      const formData = new FormData(formRef.current ?? undefined);

      void Promise.resolve(action(formData)).then(() => {
        router.refresh();
      });
    });
  }

  return (
    <form ref={formRef} action={action} className="space-y-1">
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="field" value={field} />
      <label className={labelClassName ?? "text-xs uppercase tracking-wide text-slate-500"}>{label}</label>
      {stageToneStyle ? (
        <div
          data-stage={selectedValue}
          className={`crm-stage-select-shell relative min-w-[180px] rounded-full border px-3 py-1.5 ${stageToneClassName}`}
        >
          <select
            name="value"
            value={selectedValue}
            data-stage={selectedValue}
            onChange={(event) => {
              const current = event.currentTarget.value;
              setSelectedValue(current);

              if (current === lastSubmittedValueRef.current) {
                return;
              }

              lastSubmittedValueRef.current = current;
              submitValue();
            }}
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
          onChange={(event) => {
            const current = event.currentTarget.value;
            setSelectedValue(current);

            if (current === lastSubmittedValueRef.current) {
              return;
            }

            lastSubmittedValueRef.current = current;
            submitValue();
          }}
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
