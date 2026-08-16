"use client";

import { useRef, useState } from "react";

// The one place markdown is editable in this app. A textarea rather than a
// rich-text editor on purpose: the body IS markdown, and the notes were written
// by hand (or by Claude) in exactly this form before the merge.
//
// Saves on blur, and only when the text actually changed — same contract as the
// auto-save input family, but a textarea can't use `useAutoSaveInput`, whose ref
// is typed to HTMLInputElement.
//
// Generalized from MeetingBodyEditor in plan 007, because retiring the Obsidian
// vault means brain notes need the same editing loop meetings already had.
export function MarkdownBodyEditor({
  idName,
  idValue,
  field = "bodyMd",
  defaultValue,
  action,
  returnPath,
  rows = 24,
  hint,
}: {
  /** Name of the hidden id input the action expects — "meetingId", "documentId". */
  idName: string;
  idValue: number;
  field?: string;
  defaultValue: string;
  action: (formData: FormData) => void | Promise<void>;
  returnPath?: string;
  rows?: number;
  /** Extra syntax to advertise beyond the shared basics. */
  hint?: React.ReactNode;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastSavedRef = useRef(defaultValue);
  const [dirty, setDirty] = useState(false);

  function submitIfChanged() {
    const current = textareaRef.current?.value ?? "";
    if (current === lastSavedRef.current) {
      setDirty(false);
      return;
    }
    lastSavedRef.current = current;
    setDirty(false);
    formRef.current?.requestSubmit();
  }

  return (
    <form ref={formRef} action={action} className="space-y-2">
      <input type="hidden" name={idName} value={idValue} />
      <input type="hidden" name="field" value={field} />
      {returnPath ? <input type="hidden" name="returnPath" value={returnPath} /> : null}
      <textarea
        ref={textareaRef}
        name="value"
        defaultValue={defaultValue}
        rows={rows}
        spellCheck
        onChange={() => setDirty(true)}
        onBlur={submitIfChanged}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-[13px] leading-6 text-slate-900"
      />
      <p className="text-[11px] text-slate-500">
        Markdown: <code className="rounded bg-slate-100 px-1">##</code> headings,{" "}
        <code className="rounded bg-slate-100 px-1">-</code> bullets, <code className="rounded bg-slate-100 px-1">|</code>{" "}
        tables, <code className="rounded bg-slate-100 px-1">**bold**</code>
        {hint}. Saves when you click away
        {dirty ? " — unsaved changes" : ""}.
      </p>
    </form>
  );
}
