"use client";

import { useEffect } from "react";

// Last line of defence: fires when the root layout itself throws, which means
// `error.tsx` never mounted. Next replaces the whole document here, so this
// file must render its own <html>/<body>.
//
// Everything is inline-styled on purpose. globals.css is imported by the root
// layout — the very thing that just failed — so Tailwind classes and CSS
// variables cannot be assumed to exist. A fallback that depends on the thing
// it is falling back from is not a fallback. Also avoids next/link: a hard
// navigation is what you want after a layout-level failure.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Root layout error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f3f6fb",
          color: "#0f1723",
          font: '16px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        }}
      >
        <main
          style={{
            maxWidth: 520,
            width: "100%",
            margin: "0 24px",
            padding: 32,
            background: "#fff",
            border: "1px solid rgba(148,163,184,0.35)",
            borderRadius: 12,
            boxShadow: "0 1px 2px rgba(15,23,35,0.06)",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#64748b",
            }}
          >
            Toprock OS
          </p>
          <h1 style={{ margin: "16px 0 0", fontSize: 30, fontWeight: 600, letterSpacing: "-0.01em" }}>
            The app failed to load
          </h1>
          <p style={{ margin: "12px 0 0", fontSize: 14, lineHeight: 1.6, color: "#475569" }}>
            This is a problem on our side, not with anything you did. No data was changed. Reloading
            usually clears it.
          </p>

          {error.digest ? (
            <p
              style={{
                margin: "16px 0 0",
                padding: "8px 12px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 6,
                fontFamily: '"SF Mono", Consolas, Menlo, monospace',
                fontSize: 12,
                color: "#64748b",
                wordBreak: "break-all",
              }}
            >
              Reference: {error.digest}
            </p>
          ) : null}

          <div style={{ marginTop: 24, display: "flex", flexWrap: "wrap", gap: 12 }}>
            <button
              type="button"
              onClick={reset}
              style={{
                padding: "9px 16px",
                background: "#0f172a",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            {/*
              Intentionally a plain <a>, not next/link. This boundary only runs
              when the root layout has thrown, so the client router is exactly
              the machinery we cannot trust. A full document load is the point.
            */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                padding: "9px 16px",
                border: "1px solid #cbd5e1",
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 500,
                color: "#334155",
                textDecoration: "none",
              }}
            >
              Reload the dashboard
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
