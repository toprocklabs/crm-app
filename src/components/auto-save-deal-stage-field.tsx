"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const STAGE_OPTIONS = [
  { value: "lead", label: "Lead" },
  { value: "qualified", label: "Qualified" },
  { value: "proposal", label: "Proposal" },
  { value: "negotiation", label: "Negotiation" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
] as const;

export function AutoSaveDealStageField({
  dealId,
  defaultStage,
  action,
}: {
  dealId: number;
  defaultStage: string;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const lastSubmittedValueRef = useRef(defaultStage);
  const router = useRouter();
  const [selectedStage, setSelectedStage] = useState(defaultStage);
  const [, startTransition] = useTransition();

  function submitStage() {
    startTransition(() => {
      const formData = new FormData(formRef.current ?? undefined);

      void Promise.resolve(action(formData)).then(() => {
        router.refresh();
      });
    });
  }

  return (
    <form ref={formRef} action={action} className="mt-4 space-y-3">
      <input type="hidden" name="dealId" value={dealId} />
      <label className="flex flex-col gap-1 text-sm text-slate-700">
        <span>Stage</span>
        <select
          name="stage"
          value={selectedStage}
          onChange={(event) => {
            const current = event.currentTarget.value;
            setSelectedStage(current);

            if (current === lastSubmittedValueRef.current) {
              return;
            }

            lastSubmittedValueRef.current = current;
            submitStage();
          }}
          className="rounded-md border border-slate-300 px-3 py-2 text-slate-900"
        >
          {STAGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm text-slate-700">
        <span>Close/Lost reason (required for Lost)</span>
        <textarea
          name="reason"
          rows={3}
          placeholder="Example: Lost to incumbent due to pricing and timing."
          className="rounded-md border border-slate-300 px-3 py-2 text-slate-900"
        />
      </label>
      <p className="text-[11px] text-slate-500">Set a reason, then change the stage to save.</p>
    </form>
  );
}
