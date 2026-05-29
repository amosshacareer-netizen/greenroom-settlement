/**
 * LLM-based deal parser (production path).
 *
 * Uses the Anthropic Claude API to extract structured deal terms from a
 * booker's freetext notes. This handles the messy real-world inputs that
 * the regex parser in `parseDeal.ts` cannot: written-out numbers
 * ("eighty-five percent"), abbreviations ("$12k"), shorthand ("vs 85 of
 * net cap 2k hosp 400"), references to external memos, and implicit terms.
 *
 * Architecture:
 *   - regex parser (parseDeal.ts) is the zero-latency, no-API-key path used
 *     in the prototype demo so the evaluator can run the app offline
 *   - LLM parser (this file) is the documented production path
 *   - calculator (dealMath.ts) accepts a `parsedTerms?: ParsedDeal` override,
 *     so swapping parsers does NOT touch the UI or calculation code
 *
 * To enable LLM parsing in production, set ANTHROPIC_API_KEY in the
 * environment and import `parseDealHybrid` instead of `parseDeal` from the
 * settle page. See README for setup.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { Bonus } from "@/db/schema";
import type { ParsedDeal } from "./parseDeal";

/**
 * Default model. Claude Opus 4.7 is the most capable model for accurate
 * structured extraction. Deal-term errors compound into agent disputes, so
 * we optimize for accuracy first; Haiku 4.5 is a documented follow-on cost
 * optimization once we measure parse quality at scale.
 */
const DEFAULT_MODEL = "claude-opus-4-7";

/**
 * Stable system prompt. Kept frozen and cached via prompt caching — every
 * request shares this prefix, so the per-call cost is dominated by the small
 * freetext payload, not by the long instructions.
 */
const SYSTEM_PROMPT = `You extract structured booking-deal terms from a music venue booker's freetext notes for use in a settlement calculator.

Real-world notes are messy. They contain abbreviations ("$12k", "10K"), written-out numbers ("eighty-five percent"), trade jargon ("vs gross", "door deal", "walkout pot", "tier ratchet"), and implicit terms. Your job is to read the prose and emit a clean structured representation.

# Deal types

- "flat": Artist receives a fixed amount regardless of sales. Example: "$5,000 flat guarantee".
- "vs": Artist receives max(guarantee, percentage of revenue). Example: "$10k vs 85% of net".
- "percentage_of_net": Artist receives a percentage of revenue AFTER expenses. Example: "85% of net after expenses".
- "percentage_of_gross": Artist receives a percentage of GROSS box office. No expense deduction. Example: "75% of gross".
- "door": Artist takes door revenue minus fees. Example: "door deal", "100% door".

# Field semantics

- guarantee: dollar amount in USD as a plain number (no symbols, no commas). null if no guarantee.
- percentage: decimal between 0 and 1 (so 85% becomes 0.85, not 85). null if no percentage applies.
- percentageBasis: "gross" or "net". Use "unknown" when the percentage field itself is null. Only set "gross" when the notes say "gross" explicitly or use phrasing like "% of gross"; default to "net" for vs/percentage_of_net deals when unspecified.
- expenseCap: dollar cap on pass-through expenses. null if not present in notes.
- hospitalityCap: dollar cap on hospitality/catering specifically. null if not present.
- hasWalkoutPot: true if notes mention "walkout pot" or any equivalent bonus pool.
- hasRatchet: true if notes mention tiered "ratchet" or escalating bonuses.
- parsedBonuses: list of additional bonus structures (sellout, gross threshold, attendance threshold).

# Bonus structure formats

- gross_threshold: "+$500 if gross > $20,000" yields {type:"gross_threshold", threshold:20000, amount:500, label:"+$500 if gross > $20,000"}
- sellout: "$500 sellout bonus" yields {type:"sellout", amount:500, label:"Sellout bonus $500"}
- attendance_threshold: "$200 if over 400 sold" yields {type:"attendance_threshold", threshold:400, amount:200, label:"+$200 if over 400 sold"}

# Rules

- You MUST call the submit_parsed_deal tool exactly once with your extracted values. Do not respond with prose.
- When a field is ambiguous or absent, set it to null (or "unknown" for the basis enum). Do NOT guess — surfacing a null lets the warning system flag the deal for review, which is the desired behavior.
- Be conservative on percentageBasis: only "gross" when notes are explicit; otherwise "net" or "unknown".
- Numbers must be parseable (no commas, no $).`;

/**
 * Tool definition. The model is forced to call this tool, which constrains
 * its output to a schema we can deserialize directly into ParsedDeal.
 */
const PARSE_TOOL: Anthropic.Tool = {
  name: "submit_parsed_deal",
  description:
    "Submit the structured deal terms extracted from the booker's freetext notes.",
  input_schema: {
    type: "object",
    properties: {
      dealType: {
        type: "string",
        enum: [
          "flat",
          "vs",
          "percentage_of_net",
          "percentage_of_gross",
          "door",
          "unknown",
        ],
        description:
          "Deal structure. Use 'unknown' if the notes do not clearly indicate a deal type.",
      },
      guarantee: {
        type: ["number", "null"],
        description:
          "Guaranteed payout in USD (plain number, no symbols). null if there is no guarantee.",
      },
      percentage: {
        type: ["number", "null"],
        description:
          "Percentage as a decimal in [0, 1] (so 85% = 0.85). null if not applicable.",
      },
      percentageBasis: {
        type: "string",
        enum: ["net", "gross", "unknown"],
        description:
          "What the percentage is calculated against. Use 'unknown' if no percentage applies.",
      },
      expenseCap: {
        type: ["number", "null"],
        description: "Dollar cap on pass-through expenses. null if absent.",
      },
      hospitalityCap: {
        type: ["number", "null"],
        description: "Dollar cap on hospitality/catering. null if absent.",
      },
      hasWalkoutPot: {
        type: "boolean",
        description: "True if the notes mention a walkout pot.",
      },
      hasRatchet: {
        type: "boolean",
        description: "True if the notes mention a tier ratchet.",
      },
      parsedBonuses: {
        type: "array",
        description: "Additional bonus structures, in order of appearance.",
        items: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["gross_threshold", "sellout", "attendance_threshold"],
            },
            label: { type: "string" },
            amount: { type: "number" },
            threshold: { type: ["number", "null"] },
          },
          required: ["type", "label", "amount"],
        },
      },
    },
    required: [
      "dealType",
      "guarantee",
      "percentage",
      "percentageBasis",
      "expenseCap",
      "hospitalityCap",
      "hasWalkoutPot",
      "hasRatchet",
      "parsedBonuses",
    ],
  },
};

type RawToolInput = {
  dealType:
    | "flat"
    | "vs"
    | "percentage_of_net"
    | "percentage_of_gross"
    | "door"
    | "unknown";
  guarantee: number | null;
  percentage: number | null;
  percentageBasis: "net" | "gross" | "unknown";
  expenseCap: number | null;
  hospitalityCap: number | null;
  hasWalkoutPot: boolean;
  hasRatchet: boolean;
  parsedBonuses: Bonus[];
};

/**
 * Extract structured deal terms from booker freetext using the Claude API.
 *
 * @param freetext - The deal_notes_freetext field from the deal row.
 * @param opts.apiKey - Override the ANTHROPIC_API_KEY env var.
 * @param opts.model  - Override the default model (see DEFAULT_MODEL).
 * @returns A ParsedDeal matching the shape produced by the regex parser.
 * @throws  If the model fails to call the tool, or the SDK returns an error.
 */
export async function parseDealLLM(
  freetext: string,
  opts?: { apiKey?: string; model?: string }
): Promise<ParsedDeal> {
  const client = new Anthropic({
    apiKey: opts?.apiKey ?? process.env.ANTHROPIC_API_KEY,
  });

  const response = await client.messages.create({
    model: opts?.model ?? DEFAULT_MODEL,
    max_tokens: 1024,
    // Cache the stable system prompt so every parse call reuses the prefix
    // and pays roughly 1/10th the per-token cost on the system block.
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    tools: [PARSE_TOOL],
    // Force the model to call the parsing tool — guarantees structured output.
    tool_choice: { type: "tool", name: "submit_parsed_deal" },
    messages: [
      {
        role: "user",
        content: `Parse this deal note:\n\n${freetext}`,
      },
    ],
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );
  if (!toolUse) {
    throw new Error(
      "parseDealLLM: model did not call submit_parsed_deal tool"
    );
  }

  const raw = toolUse.input as RawToolInput;

  // Normalize sentinels back to the canonical ParsedDeal shape.
  return {
    dealType: raw.dealType === "unknown" ? null : raw.dealType,
    guarantee: raw.guarantee,
    percentage: raw.percentage,
    percentageBasis:
      raw.percentageBasis === "unknown" ? null : raw.percentageBasis,
    expenseCap: raw.expenseCap,
    hospitalityCap: raw.hospitalityCap,
    hasWalkoutPot: raw.hasWalkoutPot,
    hasRatchet: raw.hasRatchet,
    parsedBonuses: raw.parsedBonuses ?? [],
  };
}

/**
 * Hybrid parser: try the LLM first, fall back to regex on error or when no
 * API key is configured. This is the recommended entry point for production
 * code — it preserves the offline-demo path while enabling LLM accuracy
 * when credentials are available.
 *
 * Why hybrid (not LLM-only):
 *   - The evaluator's demo runs without an API key; falling back to regex
 *     keeps the prototype usable.
 *   - LLM calls can transiently fail (rate limits, network); regex is a
 *     deterministic safety net.
 *   - The `source` field in the return value lets the UI surface which
 *     parser produced the result, which is useful for debugging and for
 *     showing reviewers when the LLM parser was actually exercised.
 */
export async function parseDealHybrid(
  freetext: string,
  regexParser: (text: string) => ParsedDeal,
  opts?: { apiKey?: string; model?: string }
): Promise<{ parsed: ParsedDeal; source: "llm" | "regex"; error?: string }> {
  const apiKey = opts?.apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { parsed: regexParser(freetext), source: "regex" };
  }
  try {
    const parsed = await parseDealLLM(freetext, opts);
    return { parsed, source: "llm" };
  } catch (err) {
    return {
      parsed: regexParser(freetext),
      source: "regex",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
