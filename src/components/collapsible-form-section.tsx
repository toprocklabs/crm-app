"use client";

import { useEffect, useRef } from "react";

export function CollapsibleFormSection({
  id,
  title,
  description,
  children,
  defaultOpen = false,
  className,
  // "panel" is the standard bordered card. "compact" renders the toggle as a
  // small inline button so a create form can sit next to a table without
  // claiming a full section of the page.
  variant = "panel",
}: {
  id?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  variant?: "panel" | "compact";
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (!id) {
      return;
    }

    const openIfTargeted = () => {
      if (window.location.hash === `#${id}`) {
        detailsRef.current?.setAttribute("open", "");
        detailsRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
      }
    };

    openIfTargeted();
    window.addEventListener("hashchange", openIfTargeted);

    return () => {
      window.removeEventListener("hashchange", openIfTargeted);
    };
  }, [id]);

  const chevron = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
  );

  const collapse = () => {
    // Collapse immediately after submit so the create panel stays minimized.
    detailsRef.current?.removeAttribute("open");
  };

  if (variant === "compact") {
    return (
      <details
        id={id}
        ref={detailsRef}
        open={defaultOpen}
        onSubmitCapture={collapse}
        className={`app-disclosure group ${className ?? ""}`}
      >
        <summary
          className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          title={description}
        >
          <span>{title}</span>
          <span className="text-slate-400 transition group-open:rotate-180">{chevron}</span>
        </summary>
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/60 p-4">{children}</div>
      </details>
    );
  }

  return (
    <details
      id={id}
      ref={detailsRef}
      open={defaultOpen}
      onSubmitCapture={collapse}
      className={`app-disclosure group rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${className ?? ""}`}
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
        <span>
          <p className="text-base font-semibold text-slate-900">{title}</p>
          {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
        </span>
        <span className="mt-1 text-slate-500 transition group-open:rotate-180">{chevron}</span>
      </summary>
      <div className="mt-4 border-t border-slate-200 pt-4">{children}</div>
    </details>
  );
}
