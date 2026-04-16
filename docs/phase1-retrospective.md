# Worojuro Phase 1 — Sprint Retrospective

**Date:** 2026-04-16  
**Sprints covered:** 0–6 (38 days)  
**Test count:** 167 passing · 0 failing  
**Modules shipped:** 8 (tracker, feed, woro-score, notifications, referrals, analysis, resume, pulse)  
**Monthly cost:** $0

---

## What went well

**TDD discipline held across all 12 test files**
Tests before (or alongside) code on every module. The `null ≠ 0` woro-score semantic was caught by tests before it could silently corrupt the feed. The tracker dedup tests exposed the `onConflictDoNothing` gap before it shipped. The pattern held because it was a standing rule in CLAUDE.md — not aspirational, enforced.

**Feature committee prevented scope creep**
Dark mode rejected. Headcount signal conditioned out. Repost age tightened to just the age signal before building. The committee process saved at least 2 sprint-days of wasted implementation across Phase 1. Having a structured gate before any code is written is the right process for a solo founder.

**Architecture aged well**
`user_id` + RLS on every table from day one. Phase 2 multi-tenancy = config change, not migration. tRPC + React Query eliminated boilerplate fetch/loading/error handling everywhere. Drizzle's strict types caught schema mismatches at compile time. The stack choices held up under 6 sprints of real feature work.

**Graceful degradation everywhere**
AI unavailable → Woro score shows null (not 0, not broken). Dashboard widgets catch and swallow errors. Pulse shows `summary_raw` when `summary_ai` is null. The product is fully usable without AI — AI makes it better. This is the correct posture for a Vercel Hobby + free Ollama budget.

**The apply confirm flow insight**
Committee-driven UX change: don't write to tracker until user confirms they actually applied. Most trackers have inflated "applied" counts because clicking Apply ≠ submitting. Ours won't. Accurate data = trustworthy funnel analytics — a compounding advantage as the product matures.

**`onConflictDoUpdate` COALESCE fix**
The `apply_url` backfill bug — where existing jobs ingested before the column existed would never get a URL populated — was caught via real-world testing (apply button redirecting to Google). Switching ingestion from `onConflictDoNothing` to `COALESCE` on conflict means every cron run heals historical rows. This is meaningful correctness, not just a hotfix.

---

## What didn't go well

**S5-8 (`hiringFromLayoff`) sat as dead code for a sprint**
The prop was wired into `LayoffCard` but never computed in `PulseFeed`. Passed as `undefined` the entire time. The scrum master status check caught it — but it shouldn't require a status audit to surface this. Root cause: the acceptance criteria said "wire cross-ref logic" without specifying input, computation location, and output prop chain.

**TechCrunch RSS externalId was non-deterministic**
```ts
externalId: `tc-${i}-${Date.now()}`
```
`Date.now()` changes every cron run, making every TechCrunch item unique to the dedup check. `onConflictDoNothing` was completely ineffective — every 6h run would insert 10 duplicate rows. **Fixed in this retro** by switching to `Buffer.from(title + pubDate).toString('base64').slice(0, 32)`.

**`pdf-parse` CJS/ESM incompatibility cost a debugging session**
`import pdfParse from 'pdf-parse'` fails in Next.js because webpack can't resolve the default export from a CJS bare-function export. Known footgun. Should have been caught at library selection time by checking ESM compatibility. Now an explicit check in our library evaluation process.

**E2E suite is skip-guarded in CI**
All authenticated Playwright tests skip when `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` aren't set. In GitHub Actions they all skip. The suite gives false confidence — 0 authenticated flows actually run in CI. This is a testing infrastructure gap, not a test quality gap.

**No Woro score feedback loop**
The scorer ships with no mechanism for users to flag wrong scores. Without ground truth, we can't improve the prompt, measure precision/recall, or detect when Ollama vs Haiku produces diverging results. This is the biggest product quality gap entering Phase 2.

**Pulse summariser had no per-item timeout**
A fixed 200ms sleep between Ollama calls with no timeout means a slow or hung Ollama instance could stall the entire cron job silently. **Fixed in this retro** by wrapping each call in `Promise.race` with a 15s timeout.

---

## What we'd do differently

| Decision | What happened | Change for Phase 2 |
|---|---|---|
| Library selection | `pdf-parse` CJS incompatibility in Next.js | Check ESM/CJS compatibility before adopting any Node library. Add to ADR. |
| RSS externalId strategy | Non-deterministic ID broke dedup silently | Always hash `(title + pubDate)` for RSS sources. Add to ingestion service template. |
| Ticket acceptance criteria | S5-8 sat incomplete for a sprint | Every ticket must specify: input data, computation location, output (prop/return/column) |
| E2E in CI | Authenticated tests all skip | Create a dedicated Supabase test project with a seeded test user. Store creds as GitHub Actions secrets. |
| Woro feedback loop | No mechanism built | Design "mark score wrong" in Sprint 2, not Phase 2 |
| Pulse summariser resilience | No timeout per item | `Promise.race` + timeout from day one on all AI batch loops |
| Apply URL backfill | Only new jobs got `apply_url` | `onConflictDoUpdate` with COALESCE should be the default for all ingestion — never `onConflictDoNothing` when backfill matters |

---

## Bugs fixed during this retro

| Bug | Root cause | Fix |
|---|---|---|
| TechCrunch pulse duplicates every cron | `Date.now()` in externalId | Hash of `title + pubDate` |
| Pulse summariser can stall cron | No per-item timeout | `Promise.race` with 15s timeout |

---

## Action items for Phase 2

**P0 — before first paying user**
- [ ] Set up Supabase test project + seeded test user for CI (unblocks authenticated E2E)
- [ ] Add "mark Woro score wrong" button in feed (builds ground truth for accuracy)
- [ ] Audit all RSS sources for non-deterministic externalId patterns
- [ ] Add `apply_url` column migration reminder to release checklist (already in checklist — verify it runs)

**P1 — first 30 days of Phase 2**
- [ ] Browser extension (Chrome) — save any job from LinkedIn/Greenhouse/Lever
- [ ] Mobile-responsive layout pass
- [ ] Resume tailoring per JD (AI diff: your skills vs JD requirements)
- [ ] Woro score methodology public doc (marketing asset)

**P2 — growth phase**
- [ ] Team/agency tier (career coaches, 10 clients)
- [ ] Woro Score API (B2B licensing to job boards)
- [ ] Interview prep module (AI question generation from JD + resume)
- [ ] Salary negotiation coach (offer vs market rate)

---

## Phase 1 verdict

The core value chain — resume → embedding → feed → woro score — works end-to-end. The product is usable. The architecture is sound. The test suite is real. The two retro bugs (TechCrunch dedup, summariser timeout) are fixed and tests still green at 167/167.

**The single most important thing for Phase 2:** ship the browser extension. It removes the biggest adoption barrier (manual job entry) and makes the Woro score visible inline on LinkedIn — which is the marketing moment that converts curious users into signups.

**Ship S6-7. Tag v0.1.0. Then build the extension.**
