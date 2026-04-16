# Feature committee review — Woro scorer: repost age + headcount signals

**Date:** 2026-04-16
**Feature:** Enhance Woro scorer with (1) repost duration penalty for jobs >30 days old and (2) company headcount stability signal from free external source
**Type:** enhancement (woro-score)
**Verdict:** CONDITIONAL
**Weighted score:** 7.0 / 10 (threshold: 7.0)
**Vetoes triggered:** 0

## Vote table

| Agent            | Score | Weight | Weighted |
|------------------|-------|--------|----------|
| Strategist       | 7/10  | 1.5    | 10.5     |
| Scrum master     | 6/10  | 1.0    | 6.0      |
| Architect        | 7/10  | 1.5    | 10.5     |
| Frontend dev     | 8/10  | 1.0    | 8.0      |
| Backend dev      | 7/10  | 1.0    | 7.0      |
| DB engineer      | 8/10  | 1.5    | 12.0     |
| Data analyst     | 7/10  | 1.0    | 7.0      |
| QA               | 7/10  | 1.0    | 7.0      |
| DevOps           | 7/10  | 1.0    | 7.0      |
| SRE              | 7/10  | 1.0    | 7.0      |
| Delivery manager | 6/10  | 1.5    | 9.0      |
| **Total**        |       | **13.0** | **91.0** |

## Key finding

**Signal 1 (repost age):** unanimous support. `postedAt` already exists in the DB and is already passed to `scoreJob()`. Computing `days_since_posted = Math.floor((Date.now() - postedAt) / 86_400_000)` and injecting it into the prompt is a one-line change. Zero schema impact.

**Signal 2 (headcount):** unanimous concern. No reliable free source exists:
- LinkedIn: no public headcount API
- Crunchbase RSS: doesn't include headcount
- Clearbit / PeopleDataLabs: paid APIs, Phase 2 budget required

## To unblock Signal 1

Resubmit Signal 1 as a standalone proposal. Expected to pass at ~8.5 with:
1. `days_since_posted` injected into scorer prompt
2. `days_since_posted` logged as numeric in `woro_signals` 
3. Unit test: 45-day-old job scores lower than 3-day-old job

## Phase 2 path for Signal 2

Revisit when one of these is available:
- Clearbit Enrichment API (company headcount, employee count)
- PeopleDataLabs Company API
- LinkedIn scraping (ToS review required)
