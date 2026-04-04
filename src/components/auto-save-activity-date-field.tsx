"use client";

import { useRef } from "react";

export function AutoSaveActivityDateField({
  activityId,
  defaultValue,
  returnPath,
  action,
}: {
  activityId: number;
  defaultValue: string;
  returnPath?: string;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const lastSubmittedValueRef = useRef(defaultValue);

  return (
    <form ref={formRef} action={action} className="mt-2 space-y-1">
      <input type="hidden" name="activityId" value={activityId} />
      {returnPath ? <input type="hidden" name="returnPath" value={returnPath} /> : null}
      <label className="text-[11px] uppercase tracking-wide text-slate-500">Activity date</label>
      <input
        name="occurredOn"
        type="date"
        defaultValue={defaultValue}
        onChange={(event) => {
          const current = event.currentTarget.value;

          if (current === lastSubmittedValueRef.current) {
            return;
          }

          lastSubmittedValueRef.current = current;
          formRef.current?.requestSubmit();
        }}
        className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900"
      />
      <p className="text-[11px] text-slate-500">Defaults to today on new entries and auto-saves when changed.</p>
    </form>
  );
}
