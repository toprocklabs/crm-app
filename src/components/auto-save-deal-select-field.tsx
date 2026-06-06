"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

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
  const formRef = useRef<HTMLFormElement>(null);
  const lastSubmittedValueRef = useRef(defaultValue);
  const router = useRouter();
  const [selectedValue, setSelectedValue] = useState(defaultValue);
  const [, startTransition] = useTransition();

  function submitValue() {
    startTransition(() => {
      const formData = new FormData(formRef.current ?? undefined);

      void Promise.resolve(action(formData)).then(() => {
        router.refresh();
      });
    });
  }

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-1 text-sm text-slate-700">
      <input type="hidden" name="dealId" value={dealId} />
      <input type="hidden" name="field" value={field} />
      <span>{label}</span>
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
