// Markdown parser for meeting notes (plan 006).
//
// Deliberately NOT `markdownToHtml` from src/lib/proposal/markdown.ts: that one
// emits an HTML string for the Terms page and supports no tables, and meeting
// notes are half tables (decisions, bug lists). This one parses to a block tree
// that a React component renders with the app's own Tailwind classes — so there
// is no `dangerouslySetInnerHTML` anywhere in the meeting path, and imported
// client notes can never inject markup.
//
// Supported subset, matching what the 14 imported notes actually use:
//   ## / ###   headings
//   - item     flat bullet lists
//   | a | b |  GFM tables (header row + separator + body)
//   ---        horizontal rule
//   text       paragraphs (consecutive lines join with a space)
// Inline: **strong**, *em*, `code`, [text](href).

export type Span =
  | { kind: "text"; text: string }
  | { kind: "strong"; text: string }
  | { kind: "em"; text: string }
  | { kind: "code"; text: string }
  | { kind: "link"; text: string; href: string };

export type Block =
  | { kind: "heading"; level: 2 | 3; spans: Span[] }
  | { kind: "paragraph"; spans: Span[] }
  | { kind: "list"; items: Span[][] }
  | { kind: "table"; headers: Span[][]; rows: Span[][][] }
  | { kind: "rule" };

// Order matters: `**` must be tried before `*`, or bold parses as two empty ems.
const INLINE = /`([^`]+)`|\*\*(.+?)\*\*|\*(.+?)\*|\[(.+?)\]\((.+?)\)/g;

export function parseInline(text: string): Span[] {
  const spans: Span[] = [];
  let cursor = 0;

  // Fresh lastIndex per call — the regex is module-level and stateful.
  INLINE.lastIndex = 0;
  let match = INLINE.exec(text);

  while (match) {
    if (match.index > cursor) {
      spans.push({ kind: "text", text: text.slice(cursor, match.index) });
    }

    const [, code, strong, em, linkText, href] = match;
    if (code !== undefined) {
      spans.push({ kind: "code", text: code });
    } else if (strong !== undefined) {
      spans.push({ kind: "strong", text: strong });
    } else if (em !== undefined) {
      spans.push({ kind: "em", text: em });
    } else if (linkText !== undefined && href !== undefined) {
      spans.push({ kind: "link", text: linkText, href });
    }

    cursor = match.index + match[0].length;
    match = INLINE.exec(text);
  }

  if (cursor < text.length) {
    spans.push({ kind: "text", text: text.slice(cursor) });
  }

  return spans;
}

const isTableRow = (line: string) => line.trim().startsWith("|");
// | --- | :--: | ---: |
const isTableSeparator = (line: string) => /^\|[\s\-:|]+\|?\s*$/.test(line.trim());

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((cell) => cell.trim());
}

export function parseMeetingMarkdown(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];

  let paragraph: string[] = [];
  let listItems: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ kind: "paragraph", spans: parseInline(paragraph.join(" ")) });
      paragraph = [];
    }
  };

  const flushList = () => {
    if (listItems.length) {
      blocks.push({ kind: "list", items: listItems.map(parseInline) });
      listItems = [];
    }
  };

  const flushAll = () => {
    flushParagraph();
    flushList();
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      flushAll();
      continue;
    }

    // A table needs its separator on the very next line, otherwise a paragraph
    // that happens to start with "|" would swallow the rest of the document.
    if (isTableRow(trimmed) && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      flushAll();
      const headers = splitRow(trimmed).map(parseInline);
      const rows: Span[][][] = [];
      let cursor = i + 2;
      while (cursor < lines.length && isTableRow(lines[cursor])) {
        rows.push(splitRow(lines[cursor]).map(parseInline));
        cursor += 1;
      }
      blocks.push({ kind: "table", headers, rows });
      i = cursor - 1;
      continue;
    }

    if (trimmed === "---") {
      flushAll();
      blocks.push({ kind: "rule" });
      continue;
    }

    const heading = trimmed.match(/^(#{2,3})\s+(.*)$/);
    if (heading) {
      flushAll();
      blocks.push({
        kind: "heading",
        level: heading[1].length === 2 ? 2 : 3,
        spans: parseInline(heading[2].trim()),
      });
      continue;
    }

    if (trimmed.startsWith("- ")) {
      flushParagraph();
      listItems.push(trimmed.slice(2).trim());
      continue;
    }

    flushList();
    paragraph.push(trimmed);
  }

  flushAll();
  return blocks;
}

// Plain text of a note, for search and for the one-line previews that must not
// leak markdown syntax into the UI.
export function meetingMarkdownToText(markdown: string): string {
  return parseMeetingMarkdown(markdown)
    .flatMap((block) => {
      switch (block.kind) {
        case "heading":
        case "paragraph":
          return [spansToText(block.spans)];
        case "list":
          return block.items.map(spansToText);
        case "table":
          return block.rows.map((row) => row.map(spansToText).join(" — "));
        case "rule":
          return [];
      }
    })
    .join("\n");
}

export function spansToText(spans: Span[]): string {
  return spans.map((span) => span.text).join("");
}
