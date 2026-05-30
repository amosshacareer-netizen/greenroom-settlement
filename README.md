<div align="center">

# Greenroom Settlement

**A product demo for independent music venue settlement workflows.**

Built from a starter venue-ops codebase and synthetic dataset, then extended into a settlement workflow prototype focused on deal coverage, transparent calculations, and data-quality review.

</div>

---

## Why This Exists

Independent music venues often settle shows under messy contract terms: flat guarantees, versus deals, percentage-of-net, door deals, bonuses, recoups, caps, and late-night exceptions that live in prose rather than clean fields.

The original app had a realistic venue dataset and a partial settlement tool, but most non-flat deal types fell through the cracks. I used that foundation to explore a product question:

> How might a settlement tool make messy deal terms calculable, explainable, and safe enough for bookers, agents, and venue operators to trust?

This repo is a personal product demo, not a production system. The useful part is the product judgment: choosing a narrow workflow, reading stakeholder context, identifying where structured data breaks down, and turning a brittle settlement page into a more transparent review flow.

## Product Slice

I focused on settlement transparency and data confidence:

- Expanded settlement coverage from a limited subset of deal types to line-by-line worksheets across the venue dataset.
- Treated free-text deal notes as the source of truth when structured fields conflict with prose.
- Added parser-backed warnings for mismatched deal type, percentage, basis, guarantees, caps, complex clauses, and payout differences.
- Surfaced "Needs review" states in the shows list, show detail page, and settlement page so risky records are visible before payout.
- Preserved manual verification for complex clauses such as walkout pots and tier ratchets instead of pretending the model can calculate everything safely.

## What I Built

### Settlement Worksheet

The settlement page now shows:

- parsed deal terms next to original deal notes
- warning cards for data issues
- line-by-line payout calculation
- source labels for ticket sales, expenses, deal terms, and calculated values
- payout verification against recorded settlement amounts
- settlement lifecycle context
- recoups and dispute status

### Deal Parsing and Validation

The parser extracts useful terms from messy prose:

- deal type
- guarantee amount
- percentage and percentage basis
- expense and hospitality caps
- bonuses
- walkout pots and tier ratchets

It then compares parsed terms against structured fields and generates warnings when they disagree.

### Needs Review Dashboard

The shows list flags records when any of these are true:

- free-text terms contradict structured fields
- the deal contains complex clauses
- calculated payout differs from recorded payout
- the settlement is disputed or revised

The goal is not to automate judgment away. The goal is to make risky records visible enough for humans to review them before money moves.

## Key Product Decisions

### Free Text Over Structured Fields

The dataset intentionally contains contradictions between structured fields and deal notes. In this workflow, deal notes are closer to what the booker actually trusts, so the prototype parses notes first and uses structured fields as comparison points.

### Visible Incompleteness Over Hidden Approximation

For complex clauses, the product shows base calculations and marks the result for manual review. That is more honest than silently approximating.

### Review States Across the Workflow

Settlement risk should not live only on the final worksheet. If a show needs review, the list and detail pages should make that visible before the user enters the settlement flow.

## Demo Flow

After setup, try this path:

1. Open `/shows`.
2. Use the "Needs review" filter to find shows with data issues.
3. Open a flagged show detail page and review the warning banner.
4. Click into `/shows/[id]/settle`.
5. Compare deal notes, parsed terms, warnings, line items, and payout verification.

Example records worth exploring:

- `show_0001` - deal type mismatch
- `show_0005` - percentage mismatch
- `show_0462` - payout amount mismatch
- `show_coastal_spell_dispute` - dispute context

## Tech Stack

- **Next.js 16** with App Router
- **React 19** and **TypeScript**
- **Tailwind CSS 4**
- **Drizzle ORM** and **libsql / SQLite**
- **Anthropic SDK** for structured deal-note parsing experiments
- **lucide-react** and **date-fns**

## Project Structure

```text
app/
  shows/                    Show list, detail, and settlement surfaces
  context/                  Product walkthrough
components/
  command-palette/          Global search
  layout/                   Sidebar and navigation
  ui/                       Shared interface primitives
data/
  ceo-memo.md               Product context
  dispute-thread.md         Example settlement dispute
  transcripts/              Stakeholder context
  greenroom.db              SQLite dataset
db/
  schema.ts                 Data model
  seed.ts                   Deterministic synthetic data seed
lib/
  dealMath.ts               Settlement calculation logic
  parseDealLLM.ts           Structured extraction from deal notes
  queries.ts                Server-side data access
```

## Run Locally

Requirements:

- Node.js 20+
- npm

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

To reset the local SQLite database:

```bash
npm run db:reset
```

## Notes

This project uses synthetic data and a starter application foundation. My work is the product and implementation layer around settlement coverage, deal-note parsing, warning logic, review states, and worksheet transparency.

It is not affiliated with a real venue, artist, agency, or production financial system.
