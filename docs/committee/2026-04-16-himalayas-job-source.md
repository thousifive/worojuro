# Feature committee review — Himalayas.app job source

**Date:** 2026-04-16
**Feature:** Add Himalayas.app as a new job ingestion source (free public JSON API, no auth, global tech jobs including India)
**Type:** enhancement (job ingestion module)
**Verdict:** APPROVED
**Weighted score:** 8.8 / 10 (threshold: 7.0) — strongest score to date
**Vetoes triggered:** 0

## Vote table

| Agent            | Score | Weight | Weighted |
|------------------|-------|--------|----------|
| Strategist       | 9/10  | 1.5    | 13.5     |
| Scrum master     | 9/10  | 1.0    | 9.0      |
| Architect        | 9/10  | 1.5    | 13.5     |
| Frontend dev     | 9/10  | 1.0    | 9.0      |
| Backend dev      | 8/10  | 1.0    | 8.0      |
| DB engineer      | 8/10  | 1.5    | 12.0     |
| Data analyst     | 9/10  | 1.0    | 9.0      |
| QA               | 8/10  | 1.0    | 8.0      |
| DevOps           | 10/10 | 1.0    | 10.0     |
| SRE              | 9/10  | 1.0    | 9.0      |
| Delivery manager | 9/10  | 1.5    | 13.5     |
| **Total**        |       | **13.0** | **114.5** |

## Reasoning

**Approved because:** Zero infrastructure cost (no auth, no env vars, no
new cron slots), zero schema migration (source type is TypeScript-only),
zero frontend work. Directly addresses the founder's observation that
India jobs (Bengaluru, Hyderabad, Mumbai) are missing from the feed.
Himalayas is software-engineer focused — high signal, low noise.

**Prerequisites before shipping:**
1. Confirm Himalayas.app ToS permits automated API fetching
2. Curl the API endpoint to verify response shape before coding mapper
3. Add 'himalayas' to source type union in schema/jobs.ts + RawJob interface
4. Write fetchHimalayas unit test with fixture response

## Sprint assignment
Sprint 4 — ship immediately
Owner: backend-dev (fetcher function), qa (unit test)
