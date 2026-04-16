# Feature committee review — One-click Apply

**Date:** 2026-04-16
**Feature:** One-click Apply button on job feed card — opens application URL in new tab, auto-creates tracker entry (status: applied, applied_date: today) pre-filled from job data
**Type:** enhancement (feed + tracker modules)
**Verdict:** APPROVED
**Weighted score:** 8.8 / 10 (threshold: 7.0)
**Vetoes triggered:** 0

## Vote table

| Agent            | Score | Weight | Weighted |
|------------------|-------|--------|----------|
| Strategist       | 9/10  | 1.5    | 13.5     |
| Scrum master     | 8/10  | 1.0    | 8.0      |
| Architect        | 9/10  | 1.5    | 13.5     |
| Frontend dev     | 9/10  | 1.0    | 9.0      |
| Backend dev      | 8/10  | 1.0    | 8.0      |
| DB engineer      | 9/10  | 1.5    | 13.5     |
| Data analyst     | 9/10  | 1.0    | 9.0      |
| QA               | 7/10  | 1.0    | 7.0      |
| DevOps           | 10/10 | 1.0    | 10.0     |
| SRE              | 9/10  | 1.0    | 9.0      |
| Delivery manager | 9/10  | 1.5    | 13.5     |
| **Total**        |       | **13.0** | **114.0** |

## Reasoning

Closes the feed→apply loop — the single biggest friction point in
job searching. Uniquely powerful when combined with Woro score: the
user is applying to pre-vetted, trust-scored listings. Every agent
cleared 7, DevOps gave 10/10 (zero infra touch).

## Key conditions

1. **No confirmation modal** — one tap, instant track (Strategist)
2. **applyToJob on tracker router**, not jobs router (Architect)
3. **Dedup on (user_id, job_id)** — never double-insert (Backend dev + QA)
4. **Migration before fetcher update** — so new ingested jobs capture URLs (DB engineer)
5. **Fallback to Google search** when apply_url is null or expired (SRE)
6. **Show Applied ✓ badge** always visible, not just on hover (Frontend dev)

## Implementation order

1. db-engineer — add `apply_url TEXT` nullable column to `jobs` + run migration
2. backend-dev — update 5 fetchers (Remotive, Jobicy, RemoteOK, Adzuna, Himalayas) to capture URL
3. backend-dev — `applyToJob` tRPC mutation on tracker router (upsert + dedup)
4. qa — duplicate-apply dedup test before frontend work starts
5. frontend-dev — Apply button + Applied ✓ state on JobCard

## Sprint assignment

Sprint 6 (or pull forward into Sprint 4)
Owner agents: db-engineer · backend-dev · frontend-dev · qa
