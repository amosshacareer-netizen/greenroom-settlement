# Build Session Log - Greenroom Settlement Demo

This is a record of my Claude Code session for the Greenroom settlement product demo. I've condensed it to the key prompts and decisions; the full session ran approximately 7 hours across exploration, design, and implementation.

---

## Phase 0: Defining the Goal

Before exploring the codebase, I wanted to establish what success looks like.

The CEO's memo gave the clearest signal: **82% of customers bypass the in-app settlement tool and use Google Sheets.** That's not a UX issue — it's an existential product gap. The tool literally can't handle most of their deals.

**North star metric: In-app settlement completion rate.**
- Current state: ~37% (only Flat and % of Gross deals are supported — 200 of 537 shows)
- Target: 90%+ (all standard deal types calculable, only complex variants like walkout pots and tier ratchets flagged for manual review)

**Supporting metrics I'd track post-launch:**

| Metric | Current | Target | Why it matters |
|--------|---------|--------|---------------|
| Deal type coverage | 2 of 5 types | 5 of 5 | Direct driver of adoption |
| Dispute rate (Vs deals) | 6.9% | <3% | Vs deals drive most disputes; transparency should reduce them |
| Agent inquiry rate | ~25% | <10% | If agents can read the statement without emailing, trust improves |
| Settlement conversation time | ~45 min | ~10 min | Diego's benchmark: "10 min if I could pre-review" |

These metrics framed every design decision that followed. When choosing between features, I asked: "Does this move the north star or a supporting metric?"

---

## Phase 1: Exploration & Problem Discovery

### Prompt 1: Initial orientation
> Set up the project. Run npm install, npm run db:reset, npm run dev. Then explore the codebase — give me a map of the key files, especially anything related to settlement.

Claude Code set up the environment and mapped the repo structure. I learned:
- `lib/dealMath.ts` — calculation engine, only handles flat + % of gross
- `app/shows/[id]/settle/page.tsx` — settlement UI, shows "not supported" for 63% of deals
- `db/schema.ts` — full data model with `dealNotesFreetext` as the key field
- `data/` — CEO memo, dispute thread, four stakeholder transcripts

### Prompt 2: Read all context materials
> Read the CEO memo, dispute thread, and all four transcripts. Summarize each one's key points and what they tell us about the settlement problem.

Key takeaways from each:
- **CEO memo:** "We are winning on completeness and losing on craft." 82% bypass settlement tool. Q1 bet is settlement.
- **Dispute thread:** Coastal Spell — $720 concession caused by ambiguous deal email. "No canonical version of the deal."
- **Mariana (booker):** Uses Google Sheet because tool can't handle Vs deals. "Settlement is a conversation, not a calculation."
- **Diego (TM):** "If I can't see how you got to the number, I'm not signing." Wants to pre-review on phone.
- **Marcus (GM):** Lost $80K/year when one agent routed away after bad settlement. Lease renewal in 2027.
- **Sarah Kim (agent):** Good settlement = Itemization + Provenance + Tone. "The deal was a ghost."

### Prompt 3: Explore the data for quality issues
> Query the database and help me understand: What's the deal type distribution? What's the dispute rate for each type? Do the structured fields actually match what's in the freetext? Are there any data quality issues I should know about?

This was the most important step. Claude ran 20+ queries and surfaced:

**Scale of the problem:**
- 337/537 shows (63%) use unsupported deal types
- Vs deal dispute rate: 6.9% — 6x higher than Flat (1.1%)
- 42% of shows have expenses exceeding their cap

**Data contradictions (intentional breadcrumbs in the seed data):**
- 22 disputed settlements all have positive sign-off text ("Looks good," "👍")
- 22 paid settlements still carry disputed recoups
- 22 deals where freetext percentage basis doesn't match structured field (gross vs net); 1 where percentage value differs (show_0005: prose says 85%, struct says 75%)
- 1 deal type mislabeled (show_0001 Wet Cement: prose describes Vs, struct says percentage_of_net)
- Daniel Hwang/WME: 6 marketing recoup disputes — systemic pattern
- 35 shows where hospitality expenses exceed the cap

**Key insight:** The `deal_notes_freetext` field is the source of truth. Structured fields are unreliable. Any solution must read from freetext, not structured fields.

### Prompt 4: Map all problems and prioritize
> Consolidate everything into a problem list. Group related issues. For each, give me: severity, frequency, data evidence.

I consolidated 14 individual findings into 4 core problems:

1. **Tool capability gap** — 63% unsupported (blocker)
2. **Untrustworthy data** — structured fields don't match freetext (foundation)
3. **Opaque settlement** — no transparency, no traceability (trust)
4. **Disputes unresolved** — high rate on complex deals, no follow-through (downstream)

Causal chain: A → B → C → D. Capability is the blocker, data trust is the foundation, transparency is the core experience, disputes are the downstream consequence.

---

## Phase 2: Slice Selection & Design

### Prompt 5: What does the assignment actually want?
> Re-read the evaluation criteria carefully. What are the hints about which direction to take?

Observations:
- "the 2am walkthrough conversation" is the only scene-based slice name (others are functional)
- "Design for humans, not screens" explicitly asks: "Does it feel like something Mariana would use at 2am?"
- "We're not evaluating whether you can build a clean settlement calculator" — calculator is necessary but not sufficient
- "Use AI like a senior teammate" — AI must be meaningfully present
- "designs a solution that prevents such messiness" — prevent, not just calculate

### Prompt 6: Core insight
> The 2am problem isn't about settling at 2am. It's about all prep work getting pushed to 2am. Break this down.

| Task | Must wait until after the show? |
|------|-------------------------------|
| Interpret deal terms | ❌ Can be done Wednesday |
| Flag ambiguous terms | ❌ Can be done Wednesday |
| Gather expenses | ❌ Most can be pre-loaded |
| Final box office number | ✅ Must wait |
| Run calculation | Instant once inputs ready |
| TM walkthrough | If pre-reviewed, just confirmation |

Diego validated this: "If I could pre-review, conversation would be 10 minutes instead of 45."

### Prompt 7: Define the slice
> Based on all of this, here's my slice: a transparent settlement worksheet that reads freetext, handles all deal types, shows its work line-by-line, and flags data contradictions. Write me an implementation spec.

**Chosen slice:** Transparent settlement worksheet with freetext parsing.

**What I cut and why:**
- Dispute resolution workflow — downstream; transparent settlement prevents most disputes
- Agent-side collaboration interface — doubles scope; venue-side first
- Full pre-show prediction system — too large; our parser warnings are the MVP version
- Expense auto-collection — data integration problem, not settlement experience
- Settlement lifecycle redesign — plumbing, not experience

### Prompt 8: Simplify the approach
> Do we actually need an API call to Claude for parsing? The freetext patterns look pretty regular. Can we use regex?

I sampled 35 random freetext entries across all deal types. Findings:
- Flat, Door, simple Pct of Net: perfectly template — regex handles 100%
- Standard Vs deals: very consistent patterns — regex handles ~95%
- Walkout pot + ratchet variants: identifiable by keywords, base fields still extractable

Decision: **Use regex parser, no API dependency.** Evaluators can run with zero setup. In the memo, note that production would use LLM for edge cases and semantic ambiguity detection.

For warnings: detect **data contradictions** (parser results vs structured fields) instead of semantic ambiguity. More reliable, more useful, directly surfaces the breadcrumbs in the data.

---

## Phase 3: Implementation

### Prompt 9: Build the freetext parser
> Implement lib/parseDeal.ts following the spec. Parse deal_notes_freetext into structured terms using regex. Generate warnings by comparing against structured fields and expense data.

Built `parseDeal()` function covering:
- Flat, Vs, Percentage of Net, Percentage of Gross, Door detection
- Guarantee, percentage, expense cap, hospitality cap extraction
- Walkout pot and ratchet keyword detection
- Warning generation for percentage mismatch, deal type mismatch, expense overruns

### Prompt 10: Extend the calculation engine
> Add Vs deal, percentage_of_net, and door deal support to dealMath.ts. Accept parsedTerms from the freetext parser as the primary data source, falling back to structured fields. Every step should include its data source.

Extended `calculateSettlement()` with:
- Vs: `max(guarantee, percentage × net)` with expense cap logic
- Pct of Net: `percentage × net` with expense cap
- Door: `gross - fees - expenses`
- Enhanced steps with source annotation ("ticket_sales", "expenses", "deal_terms", "calculated")
- Expense breakdown by category

### Prompt 11: Update the settlement page
> Replace the "not supported" card on the settle page with a transparent worksheet. Show parsed deal terms vs original freetext, warnings, line-by-line calculation with sources, and expense breakdown.

Updated the settle page with:
- Deal terms comparison (parsed vs freetext)
- Warning cards for data contradictions
- Line-by-line worksheet with source annotations
- Expense category breakdown
- Prominent "Artist Takes" final number

### Prompt 12: Test and verify
> Test across deal types: flat (regression), standard Vs, a deal with percentage mismatch, a deal with type mismatch, door deal, and a show with expenses over cap.

Verified:
- Flat deals: no regression
- Vs deals: correct calculation, line-by-line breakdown
- Wet Cement: deal_type_mismatch warning fires (struct=pct_of_net, freetext=vs)
- Winter Circle: percentage_mismatch warning fires (struct=75%, freetext=85%)
- Door deals: calculation correct
- Expense overruns: warning displays with exact amounts

### Prompt 13: Self-audit
> Run through the post-implementation checklist against the five evaluation criteria.

All checks passed. See self-audit section in the submission memo.

---

## Key Decisions & Trade-offs

| Decision | Why |
|----------|-----|
| Regex parser over LLM API | Zero dependency for evaluators; 90%+ coverage on this data; production would use LLM |
| Parser output overrides structured fields | Structured fields are unreliable (22 basis mismatches, 1 percentage mismatch, 1 type mislabel found in data) |
| Data contradiction warnings over semantic ambiguity detection | More reliable, directly surfaces planted breadcrumbs, provably correct |
| Expand to shows list + show detail | A warning buried three clicks deep is invisible; "Needs review" filter is highest-leverage UX change |
| Flag walkout/ratchet as "complex" rather than calculating | Honest about limitations; base terms still shown; avoids incorrect calculations |

### Prompt 14: Expand to shows list and show detail
> Warnings on the settlement page are useless if Mariana has to click into each show to find them. Add a "Needs review" filter to the shows list and warning banners to the show detail page.

Added:
- Shows list: 5 stat cards (Shows, Needs review, Disputed, Paid, Paid to artists), "Needs review" filter button, row-level amber tint
- Show detail: warning banner with pill tags, "Review in settlement" link
- `rowNeedsReview()` helper on the client component

### Prompt 15: Calibrate "Needs review" criteria
> The "Needs review" count was 196 — way too high. Expense overruns and hospitality overspend are operational facts, not data problems. Tighten the criteria.

This was the longest iteration loop. The count went through several versions:
- **196:** included everything (expense overruns, hospitality overruns, complex deals, data conflicts, disputes)
- **42:** overcorrected — dropped complex deals and amount mismatches
- **70:** added back complex deals but still missed amount mismatches
- **115:** final — data conflicts (23) + complex deals (53) + amount mismatches (77) + disputed (20) + revised (1), deduplicated via set union

The key product insight: if the actual payment differs from what we calculate, that IS the core signal. Amount mismatch belongs in "Needs review" because it means the settlement was computed with wrong data.

### Prompt 16: Verify the final number
> Run a full audit script showing the exact calculation process for 115. Show each step of the set union.

Verified: page logic and audit script both produce 115. Key overlap: A∩C = 23 (all data conflicts also have amount mismatches — expected, because wrong terms → wrong calculation).

### Prompt 17: Amount mismatch on list page
> We need a lightweight amount check that doesn't require loading ticket sales and expenses for all 500 shows.

Built `quickCheckAmountMismatch()` — uses the settlement's pre-computed `grossBoxOffice`, `netBoxOffice`, `totalExpenses` instead of raw arrays. Applies parsed deal terms + bonuses. Runs in the shows list server component without extra DB queries.

---

## AI Usage Summary

I used Claude Code throughout this project for:
- **Exploration:** Mapping the codebase, reading transcripts, running SQL queries
- **Analysis:** Consolidating findings, quantifying problems, prioritizing
- **Implementation:** Writing the parser, extending the calculator, updating the UI
- **Verification:** Testing across deal types, self-auditing against criteria, MECE breakdown of warning counts
- **Calibration:** Iterating on "Needs review" definition (196 → 42 → 70 → 115) — AI ran the audits, I made the product judgment calls on what counts

My judgment drove: which slice to pick, what to cut, design principles (2am context, scannable layout), the decision to use regex over API, which breadcrumbs to surface, and critically — what belongs in "Needs review" (data problems yes, operational facts no).
