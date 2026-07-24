"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

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
  const formRef = useRef<HTMLFormElement>(null);
  const lastSubmittedValueRef = useRef(defaultValue);
  const router = useRouter();
  const [selectedValue, setSelectedValue] = useState(defaultValue);
  const [, startTransition] = useTransition();

  return (
    <form ref={formRef} action={action} className="inline-block">
      <input type="hidden" name="proposalId" value={proposalId} />
      {returnPath ? <input type="hidden" name="returnPath" value={returnPath} /> : null}
      <select
        name="dealId"
        value={selectedValue}
        title="Tie this Statement of Work to an opportunity"
        onChange={(event) => {
          const current = event.currentTarget.value;
          setSelectedValue(current);
          if (current === lastSubmittedValueRef.current) {
            return;
          }
          lastSubmittedValueRef.current = current;
          startTransition(() => {
            const formData = new FormData(formRef.current ?? undefined);
            void Promise.resolve(action(formData)).then(() => {
              router.refresh();
            });
          });
        }}
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
