// Agentic online enrichment: given a business name + address, ask Claude to
// research it on the open web (website, owner/contacts, socials, hours, etc.)
// and return structured data we can write into the CRM. Uses the Claude API's
// server-side web_search + web_fetch tools, so no separate search-provider key
// is needed — only ANTHROPIC_API_KEY. This is the in-app, repeatable version of
// the manual research flow.

import Anthropic from "@anthropic-ai/sdk";

export type ResearchContact = {
  name: string | null;
  title: string | null;
  email: string | null;
  phone: string | null;
};

export type ResearchResult = {
  website: string | null;
  phone: string | null;
  emails: string[];
  contacts: ResearchContact[];
  socials: { instagram?: string; facebook?: string; linkedin?: string; other?: string };
  bookingUrl: string | null;
  hours: string | null;
  industryGuess: string | null;
  summary: string | null;
  sources: string[];
  confidenceNote: string | null;
};

export type ResearchOutcome =
  | { ok: true; result: ResearchResult; usage: { inputTokens: number; outputTokens: number } }
  | { ok: false; error: string };

const MODEL = "claude-opus-4-8";
const MAX_TOKENS = 6000;
const MAX_CONTINUATIONS = 6; // server tool loop (pause_turn) safety bound

const SYSTEM = `You are a B2B sales-research assistant for a CRM. Given a local business's
name and address, research it on the open web and extract verified contact and firmographic
details for the sales team.

Rules:
- Use web search and fetch to find the business's own website and reputable listings
  (Yelp, Facebook, Instagram, Google, chambers, booking sites).
- Prefer the business's official website and first-party sources. Corroborate across sources.
- Identify the owner(s) / key decision-makers by name and title when you can find them. If a
  name is uncertain or inferred, still include it but say so in confidenceNote.
- Never invent emails, phones, or names. Only report details you actually found. Use null /
  empty arrays when unknown.
- Return ONLY a single JSON object — no prose, no markdown fences — matching exactly this shape:
{
  "website": string|null,
  "phone": string|null,
  "emails": string[],
  "contacts": [{ "name": string|null, "title": string|null, "email": string|null, "phone": string|null }],
  "socials": { "instagram"?: string, "facebook"?: string, "linkedin"?: string, "other"?: string },
  "bookingUrl": string|null,
  "hours": string|null,
  "industryGuess": string|null,
  "summary": string|null,
  "sources": string[],
  "confidenceNote": string|null
}`;

function extractJson(text: string): ResearchResult | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1)) as Partial<ResearchResult>;
    return {
      website: parsed.website ?? null,
      phone: parsed.phone ?? null,
      emails: Array.isArray(parsed.emails) ? parsed.emails.filter((e) => typeof e === "string") : [],
      contacts: Array.isArray(parsed.contacts)
        ? parsed.contacts.map((c) => ({
            name: c?.name ?? null,
            title: c?.title ?? null,
            email: c?.email ?? null,
            phone: c?.phone ?? null,
          }))
        : [],
      socials: typeof parsed.socials === "object" && parsed.socials ? parsed.socials : {},
      bookingUrl: parsed.bookingUrl ?? null,
      hours: parsed.hours ?? null,
      industryGuess: parsed.industryGuess ?? null,
      summary: parsed.summary ?? null,
      sources: Array.isArray(parsed.sources) ? parsed.sources.filter((s) => typeof s === "string") : [],
      confidenceNote: parsed.confidenceNote ?? null,
    };
  } catch {
    return null;
  }
}

function collectText(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

export async function researchBusiness(input: {
  name: string;
  address?: string | null;
}): Promise<ResearchOutcome> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: "ANTHROPIC_API_KEY is not set — add it to .env.local to enable research enrichment." };
  }

  const client = new Anthropic();
  const userPrompt =
    `Business: ${input.name}\n` +
    (input.address ? `Address: ${input.address}\n` : "") +
    `\nResearch this business and return the JSON object described in your instructions.`;

  const messages: Anthropic.MessageParam[] = [{ role: "user", content: userPrompt }];
  let inputTokens = 0;
  let outputTokens = 0;

  try {
    for (let i = 0; i < MAX_CONTINUATIONS; i++) {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        thinking: { type: "adaptive" },
        output_config: { effort: "medium" },
        system: SYSTEM,
        tools: [
          { type: "web_search_20260209", name: "web_search" },
          { type: "web_fetch_20260209", name: "web_fetch" },
        ],
        messages,
      });

      inputTokens += response.usage.input_tokens;
      outputTokens += response.usage.output_tokens;

      if (response.stop_reason === "refusal") {
        return { ok: false, error: "The model declined to research this business." };
      }

      // Server-tool loop hasn't finished — append and continue.
      if (response.stop_reason === "pause_turn") {
        messages.push({ role: "assistant", content: response.content });
        continue;
      }

      const result = extractJson(collectText(response.content));
      if (!result) {
        return { ok: false, error: "Could not parse research output." };
      }
      return { ok: true, result, usage: { inputTokens, outputTokens } };
    }
    return { ok: false, error: "Research did not converge (too many tool iterations)." };
  } catch (err) {
    const message = err instanceof Error ? err.message : "research request failed";
    return { ok: false, error: message };
  }
}

// Opus 4.8 pricing: $5 / 1M input, $25 / 1M output. Returns whole cents.
export function estimateCostCents(inputTokens: number, outputTokens: number): number {
  return Math.round(((inputTokens * 5 + outputTokens * 25) / 1_000_000) * 100);
}
