import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseBullets,
  parsePricingTable,
  parsePricingTotals,
  parseProposalMarkdown,
  parseSections,
} from "@/lib/proposal/markdown";

// A realistic four-section proposal in the legacy format the parsers target.
const SAMPLE = `## Overview

You need a site that books appointments without a phone call.

## Pricing

| Phase / Item | Description | Cost |
| --- | --- | --- |
| ONE-TIME | | |
| Design & build | Five pages, mobile first | $2,500 |
| Booking setup | Calendar + intake form | $500 |
| Total one-time | | $3,000 |
| MONTHLY | | |
| Hosting & care | Updates, backups, support | $215 |

## What's Included

- Unlimited content edits
- Monthly performance report

## Notes

Timeline is four weeks from deposit.
`;

describe("parseSections", () => {
  it("splits on level-2 headings and trims each body", () => {
    const sections = parseSections(SAMPLE);
    assert.deepEqual(Object.keys(sections), ["Overview", "Pricing", "What's Included", "Notes"]);
    assert.equal(sections["Overview"], "You need a site that books appointments without a phone call.");
    assert.equal(sections["Notes"], "Timeline is four weeks from deposit.");
  });

  it("returns an empty object when there are no headings", () => {
    assert.deepEqual(parseSections("just a loose paragraph"), {});
  });

  it("handles CRLF line endings", () => {
    const sections = parseSections("## Overview\r\nhello\r\n");
    assert.equal(sections["Overview"], "hello");
  });
});

describe("parsePricingTable", () => {
  it("maps columns by header name, not position", () => {
    const rows = parsePricingTable(parseSections(SAMPLE)["Pricing"]);
    assert.equal(rows.length, 6);
    assert.deepEqual(rows[1], {
      item: "Design & build",
      description: "Five pages, mobile first",
      cost: "$2,500",
    });
  });

  it("keeps section marker rows with empty description and cost", () => {
    const rows = parsePricingTable(parseSections(SAMPLE)["Pricing"]);
    assert.deepEqual(rows[0], { item: "ONE-TIME", description: "", cost: "" });
  });

  it("returns an empty array for input too short to be a table", () => {
    assert.deepEqual(parsePricingTable(""), []);
    assert.deepEqual(parsePricingTable("| a | b |\n| --- | --- |"), []);
  });

  it("returns an empty array when the separator row is missing", () => {
    assert.deepEqual(parsePricingTable("| a | b |\n| c | d |\n| e | f |"), []);
  });
});

describe("parseBullets", () => {
  it("extracts only '- ' prefixed lines, stripped of the marker", () => {
    assert.deepEqual(parseBullets(parseSections(SAMPLE)["What's Included"]), [
      "Unlimited content edits",
      "Monthly performance report",
    ]);
  });

  it("ignores non-bullet lines", () => {
    assert.deepEqual(parseBullets("intro line\n- one\ntrailing"), ["one"]);
  });
});

// The highest-consequence parser in the app: it sets the auto-created
// opportunity's MRR and one-time value on createProposal.
describe("parsePricingTotals", () => {
  it("prefers an explicit Total row over summing line items", () => {
    const totals = parsePricingTotals(SAMPLE);
    // $3,000 Total row wins over the $2,500 + $500 line-item sum.
    assert.equal(totals.oneTimeCents, 300000);
  });

  it("reads monthly rows from the MONTHLY section", () => {
    assert.equal(parsePricingTotals(SAMPLE).mrrCents, 21500);
  });

  it("sums line items when no Total row is present", () => {
    const md = `## Pricing

| Item | Description | Cost |
| --- | --- | --- |
| ONE-TIME | | |
| Build | Site | $1,200 |
| Extras | Copy | $300 |
`;
    assert.equal(parsePricingTotals(md).oneTimeCents, 150000);
  });

  it("classifies a row as monthly from a '/mo' suffix even outside a MONTHLY section", () => {
    const md = `## Pricing

| Item | Description | Cost |
| --- | --- | --- |
| Care plan | Hosting | $99/mo |
`;
    const totals = parsePricingTotals(md);
    assert.equal(totals.mrrCents, 9900);
    assert.equal(totals.oneTimeCents, 0);
  });

  it("handles decimal amounts and thousands separators", () => {
    const md = `## Pricing

| Item | Description | Cost |
| --- | --- | --- |
| Build | Site | $1,234.56 |
`;
    assert.equal(parsePricingTotals(md).oneTimeCents, 123456);
  });

  it("returns zeros when there is no pricing section at all", () => {
    assert.deepEqual(parsePricingTotals("## Overview\n\nno prices here"), {
      mrrCents: 0,
      oneTimeCents: 0,
    });
  });

  it("treats an unparseable cost as zero rather than NaN", () => {
    const md = `## Pricing

| Item | Description | Cost |
| --- | --- | --- |
| Discovery | Scoping call | TBD |
`;
    assert.equal(parsePricingTotals(md).oneTimeCents, 0);
  });
});

describe("parseProposalMarkdown", () => {
  it("assembles all four sections", () => {
    const parsed = parseProposalMarkdown(SAMPLE);
    assert.match(parsed.overview, /books appointments/);
    assert.equal(parsed.pricingRows.length, 6);
    assert.equal(parsed.included.length, 2);
    assert.deepEqual(parsed.notesLines, ["Timeline is four weeks from deposit."]);
  });

  it("degrades to empty values for a blank document", () => {
    assert.deepEqual(parseProposalMarkdown(""), {
      overview: "",
      pricingRows: [],
      included: [],
      notesLines: [],
    });
  });
});
