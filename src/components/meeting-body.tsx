import { Fragment } from "react";
import { parseMeetingMarkdown, type Block, type Span } from "@/lib/meeting/markdown";

// Renders a meeting note's markdown body as real elements. No
// dangerouslySetInnerHTML: the parser hands back a block tree and every tag
// here is ours, so an imported note can't smuggle markup into the page.

function Spans({ spans }: { spans: Span[] }) {
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
          default:
            return <Fragment key={key}>{span.text}</Fragment>;
        }
      })}
    </>
  );
}

function BlockView({ block }: { block: Block }) {
  switch (block.kind) {
    case "heading":
      return block.level === 2 ? (
        <h3 className="mt-7 border-t border-slate-200 pt-5 text-base font-semibold text-slate-900 first:mt-0 first:border-t-0 first:pt-0">
          <Spans spans={block.spans} />
        </h3>
      ) : (
        <h4 className="mt-5 text-sm font-semibold text-slate-800">
          <Spans spans={block.spans} />
        </h4>
      );

    case "paragraph":
      return (
        <p className="mt-2 text-sm leading-6 text-slate-700">
          <Spans spans={block.spans} />
        </p>
      );

    case "list":
      return (
        <ul className="mt-2 space-y-1.5 pl-5">
          {block.items.map((item, index) => (
            <li key={index} className="list-disc text-sm leading-6 text-slate-700 marker:text-slate-400">
              <Spans spans={item} />
            </li>
          ))}
        </ul>
      );

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
                    <Spans spans={header} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="align-top">
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="border-b border-slate-100 px-3 py-2 leading-6 text-slate-700">
                      <Spans spans={cell} />
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

export function MeetingBody({ markdown }: { markdown: string }) {
  const blocks = parseMeetingMarkdown(markdown);

  if (blocks.length === 0) {
    return <p className="text-sm text-slate-500">This note has no body yet.</p>;
  }

  return (
    <div>
      {blocks.map((block, index) => (
        <BlockView key={index} block={block} />
      ))}
    </div>
  );
}
