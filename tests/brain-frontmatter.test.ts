import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildSearchText,
  classify,
  deriveTitle,
  extractWikiLinks,
  parseFrontmatter,
  slugify,
} from "@/lib/brain/frontmatter";

// The cases below are taken from the real vault, not invented — the point of
// this suite is that the import survives how inconsistent those 69 notes are.

describe("parseFrontmatter", () => {
  it("returns an empty bag for a note with no frontmatter", () => {
    // ~30 of 69 vault notes look like this: every dated digest.
    const raw = "# 2026-04-24 Drive Digest\n\nSummarized the Coatary transcript.\n";
    const { frontmatter, body } = parseFrontmatter(raw);
    assert.deepEqual(frontmatter, {});
    assert.match(body, /^# 2026-04-24 Drive Digest/);
  });

  it("parses the Companies shape (name + status + inline tag list)", () => {
    const raw = ["---", "name: Coatary", "status: client", "tags: [company]", "---", "", "# Coatary"].join("\n");
    const { frontmatter, body } = parseFrontmatter(raw);
    assert.deepEqual(frontmatter, { name: "Coatary", status: "client", tags: ["company"] });
    assert.equal(body, "# Coatary");
  });

  it("parses the People shape, including an empty scalar", () => {
    const raw = [
      "---",
      "name: Eddy",
      "company: Vive Massage",
      "email:",
      "relationship: prospect stakeholder",
      "last_touch: 2026-05-07",
      "tags: [person]",
      "---",
      "body",
    ].join("\n");
    const { frontmatter } = parseFrontmatter(raw);
    assert.equal(frontmatter.email, "");
    assert.equal(frontmatter.company, "Vive Massage");
    assert.deepEqual(frontmatter.tags, ["person"]);
  });

  it("parses block lists as well as inline ones", () => {
    const raw = ["---", "companies:", "  - Scuba Dive Utah", "  - Pacific Scuba Repair", "---", "body"].join("\n");
    const { frontmatter } = parseFrontmatter(raw);
    assert.deepEqual(frontmatter.companies, ["Scuba Dive Utah", "Pacific Scuba Repair"]);
  });

  it("strips surrounding quotes from scalars and list items", () => {
    const raw = ['---', 'title: "Coatary: phase two"', "tags: ['company', \"client\"]", "---", "body"].join("\n");
    const { frontmatter } = parseFrontmatter(raw);
    assert.equal(frontmatter.title, "Coatary: phase two");
    assert.deepEqual(frontmatter.tags, ["company", "client"]);
  });

  it("treats an unterminated fence as body, not as a broken header", () => {
    const raw = "---\nnot really frontmatter\n\nmore text\n";
    const { frontmatter, body } = parseFrontmatter(raw);
    assert.deepEqual(frontmatter, {});
    assert.match(body, /^---/);
  });

  it("tolerates a BOM and CRLF line endings", () => {
    const raw = "﻿---\r\nname: Coatary\r\n---\r\n\r\nbody\r\n";
    const { frontmatter, body } = parseFrontmatter(raw);
    assert.equal(frontmatter.name, "Coatary");
    assert.equal(body.trim(), "body");
  });
});

describe("classify", () => {
  it("calls the four entity folders entity notes with no date", () => {
    for (const folder of ["Companies", "People", "Projects", "Clients"]) {
      const result = classify(`${folder}/Coatary.md`);
      assert.equal(result.kind, "entity");
      assert.equal(result.noteDate, null);
      assert.equal(result.folder, folder);
    }
  });

  it("calls Sources meta — run bookkeeping, not content", () => {
    assert.equal(classify("Sources/2026-04-24 Source Status.md").kind, "meta");
  });

  it("calls everything else a digest and reads the date off the filename", () => {
    const result = classify("Drive/2026-04-24 Drive Digest.md");
    assert.equal(result.kind, "digest");
    assert.equal(result.noteDate, "2026-04-24");
    assert.equal(result.slug, "drive/2026-04-24-drive-digest");
  });

  it("handles a journal note whose filename is only a date", () => {
    const result = classify("Journal/2026-04-24.md");
    assert.equal(result.noteDate, "2026-04-24");
    assert.equal(result.stem, "2026-04-24");
    assert.equal(result.slug, "journal/2026-04-24");
  });

  it("does not mistake a mid-filename date for a prefix", () => {
    assert.equal(classify("Projects/Rebrand 2026-04-07 recap.md").noteDate, null);
  });

  it("puts a root-level note in Root with a single-segment slug", () => {
    const result = classify("Welcome.md");
    assert.equal(result.folder, "Root");
    assert.equal(result.kind, "entity");
    assert.equal(result.slug, "welcome");
  });

  it("normalizes windows separators and a leading ./", () => {
    assert.equal(classify(".\\Companies\\Coatary.md").slug, "companies/coatary");
  });
});

describe("slugify", () => {
  it("survives the filenames that actually exist in the vault", () => {
    // Spaces and dots are why `slug` exists separately from `path` at all.
    assert.equal(slugify("Alex Larson"), "alex-larson");
    assert.equal(slugify("Dr. Brandon Kanoa Imada"), "dr-brandon-kanoa-imada");
    assert.equal(slugify("2026-04-24 Drive Digest"), "2026-04-24-drive-digest");
  });

  it("collapses runs and trims edge hyphens", () => {
    assert.equal(slugify("  --Coatary &  Co.  "), "coatary-co");
  });
});

describe("deriveTitle", () => {
  it("prefers title, then name, then the filename", () => {
    assert.equal(deriveTitle({ title: "Austin", name: "ignored" }, "stem"), "Austin");
    assert.equal(deriveTitle({ name: "Coatary" }, "stem"), "Coatary");
    assert.equal(deriveTitle({}, "2026-04-24 Drive Digest"), "2026-04-24 Drive Digest");
  });

  it("falls through a blank frontmatter value rather than titling a note empty", () => {
    assert.equal(deriveTitle({ title: "   ", name: "Coatary" }, "stem"), "Coatary");
    assert.equal(deriveTitle({ name: "" }, "stem"), "stem");
  });

  it("ignores a list-valued title", () => {
    assert.equal(deriveTitle({ title: ["a", "b"] }, "stem"), "stem");
  });
});

describe("extractWikiLinks", () => {
  it("pulls the graph out of a real Companies note body", () => {
    const body = [
      "## People",
      "- [[Flint Gardner]]",
      "",
      "## Touchpoints",
      "- [[2026-04-24 Drive Digest]] - Drive digest summarized the transcript.",
      "- [[2026-04-25 AI Tools and Usage Insights]] - Strategy session.",
    ].join("\n");
    assert.deepEqual(extractWikiLinks(body), [
      "Flint Gardner",
      "2026-04-24 Drive Digest",
      "2026-04-25 AI Tools and Usage Insights",
    ]);
  });

  it("resolves aliases and heading anchors to the note itself", () => {
    assert.deepEqual(extractWikiLinks("see [[Coatary|the client]] and [[Coatary#Status]]"), ["Coatary"]);
  });

  it("de-duplicates case-insensitively, keeping first-seen spelling", () => {
    assert.deepEqual(extractWikiLinks("[[Coatary]] then [[coatary]]"), ["Coatary"]);
  });

  it("returns nothing for a body with no links", () => {
    assert.deepEqual(extractWikiLinks("Plain prose with [a link](https://x.test)."), []);
  });
});

describe("buildSearchText", () => {
  it("keeps words and drops markdown punctuation", () => {
    const text = buildSearchText(
      "Coatary",
      ["## Status", "- [ ] OCR the signed proposal", "| Phase | Cost |", "**bold** and `code`"].join("\n"),
    );
    assert.match(text, /^Coatary /);
    assert.match(text, /Status/);
    assert.match(text, /OCR the signed proposal/);
    assert.match(text, /bold and code/);
    assert.doesNotMatch(text, /[|#*`]/);
    assert.doesNotMatch(text, /\[ \]/);
  });

  it("keeps wiki-link and markdown-link text but not the href", () => {
    const text = buildSearchText("T", "see [[Flint Gardner]] and [the site](https://coatary.test)");
    assert.match(text, /Flint Gardner/);
    assert.match(text, /the site/);
    assert.doesNotMatch(text, /coatary\.test/);
  });

  it("drops fenced code blocks entirely", () => {
    const text = buildSearchText("T", "before\n```\nsecret_token = 1\n```\nafter");
    assert.match(text, /before/);
    assert.match(text, /after/);
    assert.doesNotMatch(text, /secret_token/);
  });

  it("collapses whitespace so ranking is not skewed by layout", () => {
    assert.equal(buildSearchText("T", "a\n\n\n   b"), "T a b");
  });
});
