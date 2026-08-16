"use client";

import { MarkdownBodyEditor } from "@/components/markdown-body-editor";

// Thin wrapper kept so meeting pages keep their own vocabulary. The machinery
// moved to MarkdownBodyEditor in plan 007 when brain notes needed the same
// blur-to-save loop; nothing about the meeting contract changed.
export function MeetingBodyEditor({
  meetingId,
  defaultValue,
  action,
  returnPath,
}: {
  meetingId: number;
  defaultValue: string;
  action: (formData: FormData) => void | Promise<void>;
  returnPath?: string;
}) {
  return (
    <MarkdownBodyEditor
      idName="meetingId"
      idValue={meetingId}
      defaultValue={defaultValue}
      action={action}
      returnPath={returnPath}
    />
  );
}
