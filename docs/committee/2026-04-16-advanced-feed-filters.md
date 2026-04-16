# Feature committee review — Advanced feed filters

**Date:** 2026-04-16
**Feature:** Add salary currency preference, location filter (country/city), salary range filter, tech stack filter, experience level filter, and matched-jobs-only toggle to the job feed
**Type:** enhancement (job feed module)
**Verdict:** APPROVED
**Weighted score:** 7.3 / 10 (threshold: 7.0)
**Vetoes triggered:** 0

## Vote table

| Agent            | Score | Weight | Weighted |
|------------------|-------|--------|----------|
| Strategist       | 8/10  | 1.5    | 12.0     |
| Scrum master     | 6/10  | 1.0    | 6.0      |
| Architect        | 7/10  | 1.5    | 10.5     |
| Frontend dev     | 7/10  | 1.0    | 7.0      |
| Backend dev      | 7/10  | 1.0    | 7.0      |
| DB engineer      | 7/10  | 1.5    | 10.5     |
| Data analyst     | 8/10  | 1.0    | 8.0      |
| QA               | 7/10  | 1.0    | 7.0      |
| DevOps           | 9/10  | 1.0    | 9.0      |
| SRE              | 7/10  | 1.0    | 7.0      |
| Delivery manager | 7/10  | 1.5    | 10.5     |
| **Total**        |       | **13.0** | **94.5** |

## Reasoning

**Approved because:** Core job-search UX that directly reduces false
positives in the feed. Most filters require zero schema changes
(salary, tech stack, matched-only). The feature is independently
shippable in two phases — fast filters first, schema-gated filters
after migrations.

**What scored well:** DevOps (9) — zero infra impact. Data analyst (8)
and Strategist (8) — rich signal and strong mission alignment.
Every 1.5x agent cleared the 7-point bar, no vetoes.

**Main condition:** Delivery manager and Scrum master both
cautioned against shipping all 6 filters at once. Approved as
two-phase delivery (see below).

## Approved implementation order

### Phase 1a — no migration required
1. **Salary range filter** — `salary_min` / `salary_max` integer columns already exist and are indexed
2. **Tech stack multi-select** — `tech_stack` array with GIN index (top-20 tags, not free-text)
3. **Matched-only toggle** — boolean flag on `getFeed` tRPC input
4. **Currency preference** — stored in `user.preferences.salary_currency` via the users router (Sprint 3)

### Phase 1b — needs prerequisite migration
5. **Location filter** — add `pg_trgm` trigram index on `jobs.location` before enabling; ILIKE is a table-scan risk at scale
6. **Experience level filter** — add nullable `experience_level` column to `jobs` table (safe additive migration)

## Constraints
- Currency filter = filter by stated currency code only, no FX conversion
- Location = freeform ILIKE for Phase 1; structured country/city columns in Phase 2
- Tech stack multi-select = curated top-20 list, not open text input
- Experience level = optional Phase 1 scope; drop if Sprint 6 is tight

## Sprint assignment
Sprint 6 — feed polish phase
Owner agents: frontend-dev (filter UI), backend-dev (getFeed params), db-engineer (trigram index + experience_level migration)
