# Worojuro — Phase 1 Plan

## Goal
A working single-user prototype, fully deployed, that the founder can use for their
own job search from day one. No multi-tenancy, no payments, no onboarding flow.
Real auth. Real data. Real AI.

## Phase 1 objectives
1. Working dashboard for one user (the founder)
2. Full AI agent team (CLAUDE.md + 11 SKILLs)
3. Scalable architecture (Phase 2 = zero rewrites)
4. Sprint plan, prioritised by value + dependency
5. Atomic tickets with acceptance criteria
6. Sequenced by dependency, assigned to right agent

---

## Scalability contract (Phase 1 → Phase 2)

Every DB table has `user_id` FK and RLS from day one.
All tRPC procedures read `user_id` from session only.
No hardcoded user IDs anywhere in application code.
Supabase Auth used from the first line of code.
Folder structure supports multi-tenant extension.
**Adding users in Phase 2 = zero schema migrations.**

---

## Sprint plan

### SPRINT 0 — Foundation (Days 1–3)

| ID | Task | Owner |
|---|---|---|
| S0-1 | Init Next.js 15 + TypeScript strict | devops |
| S0-2 | Supabase project setup (local + remote) | db-engineer |
| S0-3 | Drizzle first migration (users + pgvector extension) | db-engineer |
| S0-4 | tRPC + Supabase auth middleware | backend-dev |
| S0-5 | Deploy to Vercel, confirm all env vars green | devops |
| S0-6 | Dashboard shell + sidebar nav (8 pages, "coming soon") | frontend-dev |
| S0-7 | GitHub Actions CI (lint + typecheck + vitest) | devops |
| S0-8 | Scaffold all .claude/ agent files | architect |

### SPRINT 1 — Resume vault + tracker (Days 4–9)

| ID | Task | Owner |
|---|---|---|
| S1-1 | Resume upload UI (Supabase Storage) | frontend-dev |
| S1-2 | Resume parser AI (Haiku — skills, exp, edu) | backend-dev |
| S1-3 | Resume embedding (OpenAI → pgvector) | backend-dev |
| S1-4 | Tracker Kanban UI (@dnd-kit drag-drop) | frontend-dev |
| S1-5 | Application CRUD (create, update, notes) | backend-dev |
| S1-6 | Next action date reminders (notification type) | backend-dev |
| S1-7 | Tracker tRPC router | backend-dev |
| S1-8 | Unit tests: tracker transitions + resume upload | qa |

### SPRINT 2 — Job feed + Woro score (Days 10–16)

| ID | Task | Owner |
|---|---|---|
| S2-1 | Job ingestion (Remotive + Jobicy + RemoteOK) | backend-dev |
| S2-2 | Job embedding pipeline (dedup check first) | backend-dev |
| S2-3 | Vector similarity search query (ivfflat index) | db-engineer |
| S2-4 | Match scorer AI (Haiku — per-dimension breakdown) | backend-dev |
| S2-5 | Woro scorer AI (Haiku — fake detection + trust) | backend-dev |
| S2-6 | WoroScoreBadge component (green/amber/red) | frontend-dev |
| S2-7 | Feed UI (infinite scroll, both badges, save) | frontend-dev |
| S2-8 | Add Adzuna + HN Algolia sources | backend-dev |
| S2-9 | Vercel Cron job 1 (ingest + score every 6h) | devops |
| S2-10 | Feed tRPC router | backend-dev |
| S2-11 | Unit tests: match scorer, woro scorer, badge colour logic, dedup | qa |

### SPRINT 3 — Notifications + email (Days 17–21)

| ID | Task | Owner |
|---|---|---|
| S3-1 | Notifications DB table + RLS | db-engineer |
| S3-2 | Supabase Realtime channel setup | backend-dev |
| S3-3 | In-app notification bell + unread count | frontend-dev |
| S3-4 | Notification rules settings UI | frontend-dev |
| S3-5 | Resend + React Email templates (4 templates) | frontend-dev |
| S3-6 | Vercel Cron job 2 (7am digest) | devops |
| S3-7 | Notifications tRPC router | backend-dev |
| S3-8 | Woro alert: trigger when score < 40 in feed | backend-dev |
| S3-9 | E2E test: realtime notification within 2s | qa |

### SPRINT 4 — Referrals + analysis (Days 22–27)

| ID | Task | Owner |
|---|---|---|
| S4-1 | LinkedIn CSV import UI + parser | frontend-dev |
| S4-2 | Referral match logic (exact + fuzzy company) | backend-dev |
| S4-3 | Referral chips on feed + tracker cards | frontend-dev |
| S4-4 | Market analyser AI (switch/wait, salary, heatmap) | backend-dev |
| S4-5 | Analysis page UI (Recharts charts + heatmap) | frontend-dev |
| S4-6 | Analysis tRPC router + 24h cache logic | backend-dev |
| S4-7 | market_signals DB table | db-engineer |
| S4-8 | Unit tests: referral matching + market analyser | qa |

### SPRINT 5 — Market pulse (Days 28–33)

| ID | Task | Owner |
|---|---|---|
| S5-1 | pulse_items + pulse_interactions DB + indexes | db-engineer |
| S5-2 | Pulse ingestion service (all 8 free sources) | backend-dev |
| S5-3 | Pulse summariser AI (Haiku, async) | backend-dev |
| S5-4 | Add pulse ingestion to Cron job 1 (sequential) | devops |
| S5-5 | Pulse feed UI (4 tabs) | frontend-dev |
| S5-6 | PulseCard, LayoffCard, FundingCard components | frontend-dev |
| S5-7 | Favorites cross-ref badge on FundingCard | frontend-dev |
| S5-8 | Layoff → feed cross-ref logic | backend-dev |
| S5-9 | Pulse tRPC router | backend-dev |
| S5-10 | Unit tests: dedup, dismiss, favorites badge, async summary skeleton | qa |

### SPRINT 6 — Polish + Phase 1 release (Days 34–38)

| ID | Task | Owner |
|---|---|---|
| S6-1 | Dashboard home overview (stat cards) | frontend-dev |
| S6-2 | Settings page (all preferences) | frontend-dev |
| S6-3 | Full Playwright E2E suite | qa |
| S6-4 | Performance pass (feed < 3s, index audit, AI caching audit) | sre |
| S6-5 | Security pass (RLS all 9 tables, cron secret, no key leaks) | db-engineer |
| S6-6 | README + CHANGELOG | delivery-manager |
| S6-7 | Production deploy + smoke test | devops |
| S6-8 | Delivery manager sign-off checklist | delivery-manager |

---

## Full backlog with priorities

```
ID      Task                              Owner          Depends    Pri
─────────────────────────────────────────────────────────────────────────
SPRINT 0
S0-1    Init Next.js project              devops         none       P0
S0-2    Supabase project setup            db-engineer    S0-1       P0
S0-3    Drizzle first migration           db-engineer    S0-2       P0
S0-4    tRPC + auth middleware            backend-dev    S0-3       P0
S0-5    Vercel deploy + env vars          devops         S0-4       P0
S0-6    Dashboard shell + nav             frontend-dev   S0-5       P0
S0-7    GitHub Actions CI                 devops         S0-1       P1
S0-8    Scaffold .claude/ files           architect      S0-1       P0

SPRINT 1
S1-1    Resume upload UI                  frontend-dev   S0-6       P0
S1-2    Resume parser AI                  backend-dev    S1-1       P0
S1-3    Resume embedding                  backend-dev    S1-2       P0
S1-4    Tracker Kanban UI                 frontend-dev   S0-6       P0
S1-5    Application CRUD                  backend-dev    S1-4       P0
S1-6    Next action reminders             backend-dev    S1-5       P1
S1-7    Tracker tRPC router               backend-dev    S0-4       P0
S1-8    Tests: tracker + resume           qa             S1-5,S1-3  P1

SPRINT 2
S2-1    Job ingestion (3 sources)         backend-dev    S0-4       P0
S2-2    Job embedding pipeline            backend-dev    S2-1,S1-3  P0
S2-3    Vector similarity search          db-engineer    S2-2       P0
S2-4    Match scorer AI                   backend-dev    S2-3       P0
S2-5    Woro scorer AI                    backend-dev    S2-1       P0
S2-6    WoroScoreBadge component          frontend-dev   S2-5       P0
S2-7    Feed UI                           frontend-dev   S2-4,S2-6  P0
S2-8    Adzuna + HN sources               backend-dev    S2-1       P1
S2-9    Vercel Cron job 1                 devops         S2-1,S2-5  P0
S2-10   Feed tRPC router                  backend-dev    S0-4       P0
S2-11   Tests: feed + woro + dedup        qa             S2-4,S2-5  P1

SPRINT 3
S3-1    Notifications DB + RLS            db-engineer    S0-3       P0
S3-2    Supabase Realtime channel         backend-dev    S3-1       P0
S3-3    Notification bell UI              frontend-dev   S3-2       P0
S3-4    Notification rules UI             frontend-dev   S3-3       P1
S3-5    Resend + email templates          frontend-dev   none       P0
S3-6    Cron job 2 (digest)               devops         S3-5       P0
S3-7    Notifications tRPC router         backend-dev    S3-1       P0
S3-8    Woro alert trigger (<40)          backend-dev    S2-5,S3-7  P0
S3-9    E2E: realtime notification        qa             S3-2       P1

SPRINT 4
S4-1    LinkedIn CSV import UI            frontend-dev   S0-6       P1
S4-2    Referral match logic              backend-dev    S4-1       P1
S4-3    Referral chips on cards           frontend-dev   S4-2       P2
S4-4    Market analyser AI                backend-dev    S2-4       P1
S4-5    Analysis page UI                  frontend-dev   S4-4       P1
S4-6    Analysis tRPC + cache             backend-dev    S0-4       P1
S4-7    market_signals DB table           db-engineer    S0-3       P1
S4-8    Tests: referrals + analysis       qa             S4-2,S4-4  P2

SPRINT 5
S5-1    Pulse DB tables + indexes         db-engineer    S0-3       P0
S5-2    Pulse ingestion service           backend-dev    S5-1       P0
S5-3    Pulse summariser AI               backend-dev    S5-2       P1
S5-4    Add pulse to Cron job 1           devops         S5-2,S2-9  P0
S5-5    Pulse feed UI (4 tabs)            frontend-dev   S5-1       P0
S5-6    Pulse card components             frontend-dev   S5-5       P0
S5-7    Favorites badge (Funding)         frontend-dev   S5-6       P2
S5-8    Layoff → feed cross-ref           backend-dev    S5-2,S2-10 P2
S5-9    Pulse tRPC router                 backend-dev    S0-4       P0
S5-10   Tests: pulse                      qa             S5-2,S5-6  P1

SPRINT 6
S6-1    Dashboard home overview           frontend-dev   all        P0
S6-2    Settings page                     frontend-dev   S3-4       P1
S6-3    Full Playwright E2E               qa             all        P0
S6-4    Performance pass                  sre            all        P0
S6-5    Security pass (RLS audit)         db-engineer    all        P0
S6-6    README + CHANGELOG                delivery-mgr   S6-5       P1
S6-7    Production deploy                 devops         S6-5       P0
S6-8    Delivery manager sign-off         delivery-mgr   S6-7       P0
```

---

## Critical path

```
S0-1 → S0-2 → S0-3 → S0-4 → S0-5 → S0-6
  → S1-3 (resume embed)
  → S2-2 (job embed)
  → S2-3 (vector search)
  → S2-4 (match score)
  → S2-5 (woro score)
  → S2-7 (feed UI)
```

This is the core value chain. Everything else is parallel or downstream.

## Parallel tracks after S0-5

```
frontend-dev:  S0-6 → S1-1 + S1-4 (simultaneous)
backend-dev:   S1-7 + S2-10 + S3-7 (router stubs, parallel)
db-engineer:   S3-1 + S4-7 + S5-1 (schema work, parallel)
```

---

## Agent kickoff sequence

When founder says "start":

```
Step 1  architect       ADR-001 (tech stack rationale)
                        ADR-002 (single→multi-user scalability contract)

Step 2  db-engineer     All schema files, all migrations
                        pgvector extension, all RLS policies, seed

Step 3  devops          Next.js init, Vercel setup, CI pipeline
                        (manual invoke only)

Step 4  backend-dev     tRPC + auth middleware, all router stubs
        frontend-dev    Dashboard shell + all 8 page routes
        (parallel)

Step 5  scrum-master    Import full backlog from PHASE1.md
                        into GitHub Issues. Apply labels. Set milestones.

Step 6  Founder says "start Sprint 0" → go
```
