import { Fragment } from "react";
import { parseMeetingMarkdown, type Block, type Span } from "@/lib/meeting/markdown";

// Renders a note's markdown body as real elements. No dangerouslySetInnerHTML:
// the parser hands back a block tree and every tag here is ours, so an imported
// note can't smuggle markup into the page.
//
// Serves both meeting notes and brain notes (plan 007). The only difference is
// `linkForTarget`: brain pages pass a resolver so [[wiki-links]] become links,
// meeting pages omit it and the same span renders as plain text.

/**
 * Resolves a [[wiki-link]] target to an href, or null when the target is a note
 * that doesn't exist yet — a dangling link renders as marked-up text rather
 * than a link to nowhere.
 */
export type WikiLinkResolver = (target: string) => string | null;

function Spans({ spans, linkForTarget }: { spans: Span[]; linkForTarget?: WikiLinkResolver }) {
  return (
    <>
      {spans.map((span, index) => {
        const key = `${span.kind}-${index}`;
        switch (span.kind) {
          case "strong":
            return (
              <strong key={key} className="font-semibold text-slate-900">
                {span.text}
              </strong>
            );
          case "em":
            return (
              <em key={key} className="italic">
                {span.text}
              </em>
            );
          case "code":
            return (
              <code key={key} className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.85em] text-slate-800">
                {span.text}
              </code>
            );
          case "link":
            return (
              <a
                key={key}
                href={span.href}
                target="_blank"
                rel="noreferrer"
                className="text-cyan-700 underline decoration-cyan-300 underline-offset-2 hover:text-cyan-800"
              >
                {span.text}
              </a>
            );
          case "wikilink": {
            const href = linkForTarget?.(span.target) ?? null;
            if (href) {
              return (
                <a
                  key={key}
                  href={href}
                  className="rounded bg-cyan-50 px-1 text-cyan-800 decoration-cyan-300 underline-offset-2 hover:underline"
                >
                  {span.text}
                </a>
              );
            }
            // Dangling, or a context with no resolver. Still styled, because a
            // link to a note nobody has written yet is a real signal.
            return (
              <span
                key={key}
                title={linkForTarget ? `No note yet: ${span.target}` : undefined}
                className="rounded bg-slate-100 px-1 text-slate-500"
              >
                {span.text}
              </span>
            );
          }
          default:
            return <Fragment key={key}>{span.text}</Fragment>;
        }
      })}
    </>
  );
}

function BlockView({ block, linkForTarget }: { block: Block; linkForTarget?: WikiLinkResolver }) {
  switch (block.kind) {
    case "heading": {
      // Brain notes open with "# Title"; meeting bodies start at H2 because the
      // page already renders the title above them.
      if (block.level === 1) {
        return (
          <h2 className="mt-8 text-lg font-semibold text-slate-900 first:mt-0">
            <Spans spans={block.spans} linkForTarget={linkForTarget} />
          </h2>
        );
      }
      return block.level === 2 ? (
        <h3 className="mt-7 border-t border-slate-200 pt-5 text-base font-semibold text-slate-900 first:mt-0 first:border-t-0 first:pt-0">
          <Spans spans={block.spans} linkForTarget={linkForTarget} />
        </h3>
      ) : (
        <h4 className="mt-5 text-sm font-semibold text-slate-800">
          <Spans spans={block.spans} linkForTarget={linkForTarget} />
        </h4>
      );
    }

    case "paragraph":
      return (
        <p className="mt-2 text-sm leading-6 text-slate-700">
          <Spans spans={block.spans} linkForTarget={linkForTarget} />
        </p>
      );

    case "list": {
      // A list of "- [ ]" items loses its bullets: the checkbox is the marker.
      const isTaskList = block.items.some((item) => item.checked !== undefined);
      return (
        <ul className={isTaskList ? "mt-2 space-y-1.5" : "mt-2 space-y-1.5 pl-5"}>
          {block.items.map((item, index) => (
            <li
              key={index}
              className={
                item.checked === undefined
                  ? isTaskList
                    ? "text-sm leading-6 text-slate-700"
                    : "list-disc text-sm leading-6 text-slate-700 marker:text-slate-400"
                  : "flex items-baseline gap-2 text-sm leading-6"
              }
            >
              {item.checked === undefined ? null : (
                <span
                  aria-hidden
                  className={
                    item.checked
                      ? "mt-0.5 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border border-emerald-400 bg-emerald-50 text-[9px] font-bold text-emerald-700"
                      : "mt-0.5 inline-flex h-3.5 w-3.5 shrink-0 rounded border border-slate-300 bg-white"
                  }
                >
                  {item.checked ? "✓" : ""}
                </span>
              )}
              <span className={item.checked ? "text-slate-400 line-through" : "text-slate-700"}>
                <Spans spans={item.spans} linkForTarget={linkForTarget} />
              </span>
            </li>
          ))}
        </ul>
      );
    }

    case "table":
      return (
        // Wide decision tables must scroll inside the note, never widen the page.
        <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[32rem] border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50">
                {block.headers.map((header, index) => (
                  <th
                    key={index}
                    className="border-b border-slate-200 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500"
                  >
                    <Spans spans={header} linkForTarget={linkForTarget} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="align-top">
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="border-b border-slate-100 px-3 py-2 leading-6 text-slate-700">
                      <Spans spans={cell} linkForTarget={linkForTarget} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "rule":
      return <hr className="mt-6 border-slate-200" />;
  }
}

export function MeetingBody({
  markdown,
  linkForTarget,
}: {
  markdown: string;
  linkForTarget?: WikiLinkResolver;
}) {
  const blocks = parseMeetingMarkdown(markdown);

  if (blocks.length === 0) {
    return <p className="text-sm text-slate-500">This note has no body yet.</p>;
  }

  return (
    <div>
      {blocks.map((block, index) => (
        <BlockView key={index} block={block} linkForTarget={linkForTarget} />
      ))}
    </div>
  );
}
