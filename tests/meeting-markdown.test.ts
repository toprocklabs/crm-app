import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { meetingMarkdownToText, parseInline, parseMeetingMarkdown, spansToText, type Block } from "@/lib/meeting/markdown";

// Narrowing helpers so the assertions read as "this block is a table" rather
// than as a cast that would happily lie about a `rule`.
function expectKind<K extends Block["kind"]>(block: Block | undefined, kind: K): Extract<Block, { kind: K }> {
  assert.ok(block, "expected a block");
  assert.equal(block.kind, kind);
  return block as Extract<Block, { kind: K }>;
}

const textOf = (block: Block | undefined) => {
  assert.ok(block);
  assert.ok(block.kind === "heading" || block.kind === "paragraph");
  return spansToText(block.spans);
};

describe("parseInline", () => {
  it("returns a single text span for plain prose", () => {
    assert.deepEqual(parseInline("just words"), [{ kind: "text", text: "just words" }]);
  });

  it("parses bold before italic so ** never reads as two empty ems", () => {
    assert.deepEqual(parseInline("**Fix:** do it"), [
      { kind: "strong", text: "Fix:" },
      { kind: "text", text: " do it" },
    ]);
  });

  it("parses italic, code and links", () => {
    assert.deepEqual(parseInline("*why* `A record` [docs](https://x.dev)"), [
      { kind: "em", text: "why" },
      { kind: "text", text: " " },
      { kind: "code", text: "A record" },
      { kind: "text", text: " " },
      { kind: "link", text: "docs", href: "https://x.dev" },
    ]);
  });

  it("does not treat an asterisk inside code as emphasis", () => {
    assert.deepEqual(parseInline("`a*b`"), [{ kind: "code", text: "a*b" }]);
  });

  it("is not left stateful by a previous call", () => {
    parseInline("**one** **two**");
    assert.deepEqual(parseInline("**one**"), [{ kind: "strong", text: "one" }]);
  });
});

describe("parseMeetingMarkdown", () => {
  it("reads headings at both levels", () => {
    const blocks = parseMeetingMarkdown("## Two\n\n### Three");
    assert.equal(expectKind(blocks[0], "heading").level, 2);
    assert.equal(textOf(blocks[0]), "Two");
    assert.equal(expectKind(blocks[1], "heading").level, 3);
    assert.equal(textOf(blocks[1]), "Three");
  });

  it("joins consecutive lines into one paragraph and splits on a blank line", () => {
    const blocks = parseMeetingMarkdown("one\ntwo\n\nthree");
    assert.equal(blocks.length, 2);
    assert.equal(textOf(blocks[0]), "one two");
    assert.equal(textOf(blocks[1]), "three");
  });

  it("collects consecutive bullets into one list", () => {
    const blocks = parseMeetingMarkdown("- a\n- b\n- c");
    assert.equal(blocks.length, 1);
    assert.deepEqual(expectKind(blocks[0], "list").items.map(spansToText), ["a", "b", "c"]);
  });

  it("parses a GFM table with its header row", () => {
    const blocks = parseMeetingMarkdown("| Topic | Decision |\n| --- | --- |\n| Go live | Today |\n| Hosting | Keep |");
    assert.equal(blocks.length, 1);
    const table = expectKind(blocks[0], "table");
    assert.deepEqual(table.headers.map(spansToText), ["Topic", "Decision"]);
    assert.equal(table.rows.length, 2);
    assert.deepEqual(table.rows[1].map(spansToText), ["Hosting", "Keep"]);
  });

  it("accepts alignment markers in the separator", () => {
    const blocks = parseMeetingMarkdown("| a | b |\n| :-- | --: |\n| 1 | 2 |");
    assert.equal(blocks[0].kind, "table");
  });

  it("treats a lone pipe line as a paragraph, not a table", () => {
    // Without the separator lookahead this would swallow the rest of the note.
    const blocks = parseMeetingMarkdown("| not a table\n\nnext");
    assert.equal(blocks[0].kind, "paragraph");
    assert.equal(blocks.length, 2);
  });

  it("keeps the rule and the table separator apart", () => {
    const blocks = parseMeetingMarkdown("before\n\n---\n\nafter");
    assert.deepEqual(blocks.map((b) => b.kind), ["paragraph", "rule", "paragraph"]);
  });

  it("flushes an open list when a heading interrupts it", () => {
    const blocks = parseMeetingMarkdown("- a\n## Next\n- b");
    assert.deepEqual(blocks.map((b) => b.kind), ["list", "heading", "list"]);
  });

  it("returns nothing for empty input", () => {
    assert.deepEqual(parseMeetingMarkdown(""), []);
    assert.deepEqual(parseMeetingMarkdown("\n\n  \n"), []);
  });
});

describe("meetingMarkdownToText", () => {
  it("strips syntax and drops rules", () => {
    const text = meetingMarkdownToText("## Head\n\n- **bold** item\n\n---\n\n| a | b |\n| --- | --- |\n| 1 | 2 |");
    assert.equal(text, "Head\nbold item\n1 — 2");
  });
});
