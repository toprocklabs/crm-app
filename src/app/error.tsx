"use client";

import { useEffect } from "react";
import { FailurePage } from "@/components/failure-page";

// Catches render and server-action errors anywhere under the root layout.
// Before this existed, an uncaught Zod ParseError from a server action reached
// the user as Next's bare "Application error: a client-side exception has
// occurred" — see planning/004-architecture-hardening (F07/F11).
//
// Next strips error messages in production and replaces them with `digest`, so
// the digest is what we surface; it correlates with the server log line.
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled application error:", error);
  }, [error]);

  return (
    <FailurePage
      kicker="Toprock OS"
      title="Something went wrong"
      message="That action didn't complete. Nothing was saved, so you can safely try again. If it keeps happening, the reference below will be in the server logs."
      detail={error.digest ? `Reference: ${error.digest}` : error.message || null}
      action={
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          Try again
        </button>
      }
    />
  );
}
