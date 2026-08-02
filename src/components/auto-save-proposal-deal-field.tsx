"use client";

import { useAutoSaveSelect } from "@/components/auto-save-hooks";

// Inline "which opportunity is this SOW tied to" dropdown. Auto-saves on
// change, same interaction as the other autosave selects.
export function AutoSaveProposalDealField({
  proposalId,
  defaultValue,
  options,
  action,
  returnPath,
}: {
  proposalId: number;
  defaultValue: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  action: (formData: FormData) => void | Promise<void>;
  returnPath?: string;
}) {
  const { formRef, selectedValue, onSelectChange } = useAutoSaveSelect(defaultValue, action);

  return (
    <form ref={formRef} action={action} className="inline-block">
      <input type="hidden" name="proposalId" value={proposalId} />
      {returnPath ? <input type="hidden" name="returnPath" value={returnPath} /> : null}
      <select
        name="dealId"
        value={selectedValue}
        title="Tie this Statement of Work to an opportunity"
        onChange={onSelectChange}
        className="max-w-[220px] rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
      >
        <option value="">Not tied to an opportunity</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </form>
  );
}
