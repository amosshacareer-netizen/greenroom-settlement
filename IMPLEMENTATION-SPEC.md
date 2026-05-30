# Implementation Notes - Transparent Settlement Worksheet

---

## Context

Personal product demo for Greenroom settlement workflows. The project extends a starter venue-ops codebase with settlement coverage, review states, and transparent calculation logic. No external APIs, no env vars, no extra dependencies.

**Our slice:** Turn the settlement page into a transparent worksheet that handles all deal types, shows its work line-by-line, and surfaces data inconsistencies — then make those issues visible across the entire app so nothing slips through.

**Local demo experience:** `npm install && npm run dev` -> open browser -> everything works.

**What changed:** The 63% of shows that previously displayed "this deal type isn't supported" now show a full, line-by-line settlement calculation with data sources and warnings. Data inconsistencies and amount mismatches are flagged on the shows list, show detail page, and settlement page.

---

## What We Built (6 pieces)

### Piece 1: Freetext Parser — `lib/parseDeal.ts` (NEW)

Extracts structured terms from `deal_notes_freetext` using regex. Generates 7 warning types by comparing parsed values against structured fields and expenses.

**Parsing rules:** flat, vs, percentage_of_net, percentage_of_gross, door detection. Extracts guarantee, percentage, percentageBasis, expenseCap, hospitalityCap, walkout/ratchet flags, freetext bonuses as fallback.

**Warning types:**
1. `percentage_mismatch` — parsed % ≠ structured % (breadcrumb #6)
2. `deal_type_mismatch` — parsed type ≠ structured type (breadcrumb #9)
3. `basis_mismatch` — parsed basis (gross/net) ≠ structured basis
4. `guarantee_mismatch` — parsed guarantee ≠ structured guarantee
5. `expenses_over_cap` — total expenses > expense cap
6. `hospitality_over_cap` — hospitality expenses > hospitality cap (breadcrumb #5)
7. `complex_deal` — walkout pot or tier ratchet present

### Piece 2: Calculation Engine — `lib/dealMath.ts` (REWRITE)

- All 5 deal types: flat, vs (gross and net basis), percentage_of_net, percentage_of_gross, door
- Accepts `parsedTerms` to override structured fields when freetext disagrees
- Source annotations on every step (ticket_sales, expenses, deal_terms, calculated)
- Expense breakdown by category with cap overrun notes
- Bonus evaluation (gross threshold, sellout, attendance)
- `quickCheckAmountMismatch()` — lightweight function for list-page amount verification using settlement's pre-computed gross/net/expenses, without loading raw ticket sales

### Piece 3: Settlement Page — `app/shows/[id]/settle/page.tsx` (REWRITE)

- Deal Terms card (parsed terms + original freetext side-by-side)
- Warning cards (amber, one per warning)
- Line-by-line worksheet with source labels and expense breakdown
- 72px hero number for artist payout
- Amount verification: calculated vs recorded/paid amount, with difference callout
- "Approximate — verify manually" badge for complex deals
- Voided settlement: strikethrough + "No payment was made"
- Settlement lifecycle bar (draft → submitted → reviewed → signed → paid)
- Recoups section with per-item dispute status

### Piece 4: Show Detail Page — `app/shows/[id]/page.tsx` (MODIFIED)

- Warning banner with pill tags listing each data issue
- "Review in settlement →" link
- Amber badge in header showing issue count

### Piece 5: Shows List Dashboard — `app/shows/page.tsx` (MODIFIED)

- Stats: Shows, Needs review (amber), Disputed (rose), Paid, Paid to artists
- Computes dealFlags + amount mismatch for each show via parser and `quickCheckAmountMismatch`

### Piece 6: Shows List Filter — `app/shows/shows-list.tsx` (MODIFIED)

- "Needs review" filter button with count
- Row-level amber tint + "Needs review" badge
- `rowNeedsReview()`: data conflict OR complex deal OR amount mismatch OR disputed/revised

---

## "Needs Review" Logic

A show is flagged if ANY of these are true:
1. **Data conflict** — freetext contradicts system fields (percentage, deal type, basis, or guarantee mismatch)
2. **Complex deal** — walkout pot or tier ratchet present
3. **Amount mismatch** — calculated payout ≠ recorded `totalToArtist` (diff > $1)
4. **Disputed or revised** — settlement status

Deduplication: set union. Each show counted once regardless of how many flags apply.

**Excluded:** expenses over cap and hospitality over cap — operational facts, not data quality issues.

**Current count: 115 / 500 shows.** Breakdown:
- Data conflict: 23 (all 23 also have amount mismatches)
- Complex deal: 53
- Amount mismatch: 77
- Disputed: 20, Revised: 1
- After dedup: 115

---

## File Summary

| File | Action |
|------|--------|
| `lib/parseDeal.ts` | CREATE |
| `lib/dealMath.ts` | REWRITE |
| `app/shows/[id]/settle/page.tsx` | REWRITE |
| `app/shows/[id]/page.tsx` | MODIFY |
| `app/shows/page.tsx` | MODIFY |
| `app/shows/shows-list.tsx` | MODIFY |

No schema changes. No new dependencies. No env vars.

---

## Known Limitations

**Regex parser works for this data, not for the real world.** All seed data patterns parse correctly. Real-world notes with "$12k," "eighty-five percent," or references to external deal memos need an LLM parser. Production path: Claude API with regex as fast-path fallback.

**Complex deals flagged, not calculated.** 53 shows have walkout pots or tier ratchets. Base calculation still runs; warning says "showing base terms only."

**23% needs-review rate.** 115 of 500 shows. Most are old. Production: severity tiers + time-based de-emphasis.

**One-directional freetext trust.** Parser always prefers freetext. If system field is updated but notes aren't, we use stale data. Production: compare edit timestamps.

---

## Breadcrumbs Verified

- Percentage mismatch: show_0005 (Winter Circle), 85% vs 75%
- Deal type mismatch: show_0001 (Wet Cement), vs coded as percentage_of_net
- Hospitality overrun: 35 shows
- Basis mismatch: 22 shows (freetext says gross, system says net)
- Amount verification: 77 shows where calculated ≠ recorded (e.g., show_0462 Drive North: recorded $4,728, calculated $8,445)

---

## Production Roadmap

1. **LLM parser** — Claude API for freetext extraction; regex as fast-path. Handles abbreviations, implied terms, semantic ambiguity.
2. **Warning severity tiers** — "Data conflict" (must fix) vs "Check this" (informational).
3. **Walkout/ratchet calculation** — Model bracket structures, compute each tier.
4. **Bidirectional data trust** — Compare edit timestamps, let user pick which source is correct.
