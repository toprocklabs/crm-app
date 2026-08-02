"use client";

import { useAutoSaveSelect } from "@/components/auto-save-hooks";

// Inline "which account does this payment belong to" dropdown, auto-saving on
// change. Same interaction as the other autosave selects in the app.
export function AutoSavePaymentAccountField({
  paymentId,
  defaultValue,
  options,
  action,
  returnPath,
}: {
  paymentId: number;
  defaultValue: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  action: (formData: FormData) => void | Promise<void>;
  returnPath?: string;
}) {
  const { formRef, selectedValue, pending, onSelectChange } = useAutoSaveSelect(defaultValue, action);

  return (
    <form ref={formRef} action={action} className="inline-block">
      <input type="hidden" name="paymentId" value={paymentId} />
      {returnPath ? <input type="hidden" name="returnPath" value={returnPath} /> : null}
      <select
        name="companyId"
        value={selectedValue}
        disabled={pending}
        title="Assign this payment to an account"
        onChange={onSelectChange}
        className="max-w-[240px] rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 disabled:opacity-60"
      >
        <option value="">Unassigned</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </form>
  );
}
