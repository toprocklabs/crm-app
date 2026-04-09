"use client";

import { useRef } from "react";

export function CollapsibleFormSection({
  title,
  description,
  children,
  defaultOpen = false,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  return (
    <details
      ref={detailsRef}
      open={defaultOpen}
      onSubmitCapture={() => {
        // Collapse immediately after submit so the create panel stays minimized.
        detailsRef.current?.removeAttribute("open");
      }}
      className={`crm-disclosure group rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${className ?? ""}`}
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
        <span>
          <p className="text-base font-semibold text-slate-900">{title}</p>
          {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
        </span>
        <span className="mt-1 text-slate-500 transition group-open:rotate-180">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
        </span>
      </summary>
      <div className="mt-4 border-t border-slate-200 pt-4">{children}</div>
    </details>
  );
}
