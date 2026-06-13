"use client";

import { useRef, useState } from "react";

type Candidate = {
  type: "company" | "contact";
  id: number;
  label: string;
  sublabel?: string | null;
};

export function RelationshipEditor({
  companyId,
  candidates,
  edgeOptions,
  returnPath,
  action,
}: {
  companyId: number;
  candidates: Candidate[];
  edgeOptions: ReadonlyArray<{ value: string; label: string }>;
  returnPath: string;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [targetKey, setTargetKey] = useState("");
  const [edgeType, setEdgeType] = useState(edgeOptions[0]?.value ?? "");
  const [strength, setStrength] = useState(60);

  const [toType, toIdRaw] = targetKey ? targetKey.split(":") : ["", ""];

  return (
    <form
      ref={formRef}
      action={action}
      onSubmitCapture={() => {
        // Reset the picker after the optimistic submit so the form is ready
        // for the next edge without a stale selection.
        requestAnimationFrame(() => setTargetKey(""));
      }}
      className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-2"
    >
      <input type="hidden" name="fromType" value="company" />
      <input type="hidden" name="fromId" value={companyId} />
      <input type="hidden" name="toType" value={toType} />
      <input type="hidden" name="toId" value={toIdRaw} />
      <input type="hidden" name="returnPath" value={returnPath} />

      <label className="flex flex-col gap-1 text-sm text-slate-700">
        <span>Relationship</span>
        <select
          name="edgeType"
          value={edgeType}
          onChange={(event) => setEdgeType(event.currentTarget.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-slate-900"
        >
          {edgeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm text-slate-700">
        <span>Connected to</span>
        <select
          value={targetKey}
          onChange={(event) => setTargetKey(event.currentTarget.value)}
          required
          className="rounded-md border border-slate-300 px-3 py-2 text-slate-900"
        >
          <option value="">Select a company or contact…</option>
          <optgroup label="Companies">
            {candidates
              .filter((c) => c.type === "company")
              .map((c) => (
                <option key={`company:${c.id}`} value={`company:${c.id}`}>
                  {c.label}
                </option>
              ))}
          </optgroup>
          <optgroup label="Contacts">
            {candidates
              .filter((c) => c.type === "contact")
              .map((c) => (
                <option key={`contact:${c.id}`} value={`contact:${c.id}`}>
                  {c.label}
                  {c.sublabel ? ` — ${c.sublabel}` : ""}
                </option>
              ))}
          </optgroup>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm text-slate-700">
        <span>Trust strength: {strength}</span>
        <input
          name="strength"
          type="range"
          min={0}
          max={100}
          step={5}
          value={strength}
          onChange={(event) => setStrength(Number(event.currentTarget.value))}
          className="accent-cyan-600"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-slate-700">
        <span>Evidence (optional)</span>
        <input
          name="evidence"
          placeholder="e.g. same plaza as Scuba Riverton"
          className="rounded-md border border-slate-300 px-3 py-2 text-slate-900"
        />
      </label>

      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={!targetKey}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add relationship
        </button>
      </div>
    </form>
  );
}
