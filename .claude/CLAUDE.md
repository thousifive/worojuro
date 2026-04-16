# Worojuro — AI Team Briefing

## Product

**Worojuro** — single-user job search intelligence dashboard.
Phase 1: working prototype for one user (the founder).
No multi-tenancy yet. Every table has `user_id` + RLS from day one so
Phase 2 (multi-user) requires **zero schema changes**.

**Name origin:** Yoruba-inspired — *woro* (alert/news) + *juro* (trust/oath).
The product alerts you to jobs and the Woro score tells you which ones to trust.

---

## Stack (quick ref)

| Layer | Tech |
|---|---|
| Frontend | Next.js 15 App Router · React 19 · TypeScript strict |
| API | tRPC v11 · React Query v5 (inside Next.js — no extra server cost) |
| Auth | Supabase Auth · @supabase/ssr · Next.js middleware |
| Database | Supabase Postgres · Drizzle ORM · pgvector (1536-dim) |
| Storage | Supabase Storage (resumes bucket) |
| Realtime | Supabase Realtime (channel: notifications:user:[userId]) |
| Email | Resend · React Email (4 templates) |
| AI | **Ollama (local)** — llama3.2 (text) · nomic-embed-text (embeddings) |
| AI (future) | Anthropic claude-haiku-4-5-20251001 · OpenAI text-embedding-3-small — boilerplate in `server/ai/client.ts` |
| Background | Vercel Cron (2 free slots — Cron 1: 6h ingest, Cron 2: 7am digest) |
| Deploy | Vercel Hobby free tier |

---

## Domain glossary

| Term | Meaning |
|---|---|
| `job` | Raw listing from any ingestion source |
| `application` | Job the user is actively tracking in Kanban |
| `match` | Scored job-to-profile pairing (stored in job_matches) |
| `feed` | Personalised curated list of matches |
| `woro score` | Worojuro's 0–100 trust/legitimacy score on every listing |
| `woro signals` | Breakdown object behind the woro score |
| `fake score` | Deprecated alias for woro score — do not use |
| `signal` | Market analysis output (switch_now / wait / market_hot / market_cold) |
| `digest` | Scheduled email summary |
| `vault` | User's resume storage + parse history |
| `pulse` | Market intelligence feed (4 categories) |
| `pulse item` | Single piece of pulse content |
| `layoff card` | Pulse item of category=layoff |
| `funding card` | Pulse item of category=funding or ipo |

---

## Auto-invoke rules by file pattern

| Pattern | Invoke agent |
|---|---|
| `app/**/*.tsx`, `components/**` | frontend-dev |
| `server/routers/**` | backend-dev |
| `server/ai/**` | backend-dev |
| `server/services/**` | backend-dev |
| `server/db/schema/**`, `*.sql`, `supabase/migrations/**` | db-engineer |
| `*.test.ts`, `*.spec.ts`, `e2e/**` | qa |
| `.github/workflows/**` | devops |
| `emails/**` | frontend-dev |
| Any RLS policy change | db-engineer (confirm first) |

---

## Standing rules — ALL agents, NO exceptions

1. **Never expose** `SUPABASE_SERVICE_ROLE_KEY` client-side. Server-only.
2. **Never re-embed** a job or resume that already has an embedding stored.
   Always check `WHERE embedding IS NOT NULL` before any OpenAI call.
3. **Never run** `drizzle-kit migrate` without showing SQL diff and waiting
   for founder confirmation.
4. **All AI calls** (Anthropic + OpenAI) wrapped in try/catch.
   Graceful degradation — never block UI on AI failure.
5. **Woro score and pulse AI summaries are async** — items visible immediately,
   scores/summaries appear when ready. Never await in the render path.
6. **All tRPC mutations** writing to `jobs` or `pulse_items` use service role
   (server-only) — never user JWT.
7. **Cron routes verify `CRON_SECRET`** header before executing.
   Missing or wrong secret → 401. No exceptions.
8. **Woro score < 40** must trigger a `woro_alert` notification for the user
   if that job is in their feed.

---

## Tools per agent

| Agent | Tools |
|---|---|
| strategist | Read, Write, WebSearch |
| scrum-master | Read, Write |
| architect | Read, Write, Bash, Glob |
| frontend-dev | Read, Edit, Bash, Grep, Glob |
| backend-dev | Read, Edit, Bash, Grep, Glob |
| db-engineer | Read, Edit, Bash |
| data-analyst | Read, Bash, WebSearch |
| qa | Read, Edit, Bash, Grep |
| devops | Read, Edit, Bash |
| sre | Read, Write, Bash |
| delivery-manager | Read, Write |

`devops` has `disable-model-invocation: true`.

---

## 8 feature modules

1. **Job tracker** — Kanban: Saved → Applied → OA → Phone → Interview → Offer → Rejected → Ghosted
2. **Curated job feed** — vector similarity match + Woro score filter, infinite scroll
3. **Smart notifications** — rules engine + Supabase Realtime + Resend email
4. **Referral finder** — LinkedIn CSV import, company matching, chips on every card
5. **Job market analysis** — switch/wait signal, fake job detection, salary benchmark, heatmap
6. **Resume vault** — PDF/DOCX upload, parse, embed, multiple versions
7. **Market pulse** — 4 tabs: Tech / Layoffs / Market / Funding, refreshed every 6h
8. **Woro score** — 0–100 trust score on every listing: red (<40) / amber (40–70) / green (>70)

---

## Scalability contract (Phase 1 → Phase 2)

- Every DB table has `user_id` FK and RLS from day one.
- All tRPC procedures read `user_id` from session only — never hardcoded.
- No hardcoded user IDs anywhere in application code.
- Supabase Auth used from the first line of code.
- Adding users in Phase 2 = zero schema migrations.

---

## Testing approach: TDD

**All agents follow TDD — tests before code, no exceptions.**

- Write failing test first, then implementation to make it pass
- Every new tRPC procedure gets a unit test before the router is written
- Every new AI module (woro-scorer, match-scorer, etc.) gets a test for happy path + failure/null case before implementation
- WoroScoreBadge and all UI components get tests for all render states before the component is built
- RLS policies get security tests (user A cannot read user B's rows) before policies are applied
- Cron routes get auth tests (401 without CRON_SECRET) before the route is implemented
- Woro score dedup rule gets a test (same source+external_id never duplicates) before ingestion service is written

Test stack: Vitest (unit/integration) + Playwright (E2E)
Test files co-located: `server/routers/tracker.test.ts` alongside `server/routers/tracker.ts`
E2E: `e2e/` directory at project root

## Cost: $0/month

Upgrade triggers: >500MB DB or >50k MAU → Supabase Pro ~$25/mo.

---

## Feature committee process

Every new feature idea — no matter how small — must pass through the Worojuro feature committee before any code is written, any ticket is created, or any agent begins implementation work.

The committee is the full AI team: 11 agents, each voting from their own perspective.

**How to trigger a committee review:**
The founder says any of the following:
- `"Committee: [idea]"`
- `"Review this feature: [idea]"`
- `"Should we build: [idea]"`
- `"Feature idea: [idea]"`

Claude Code will then invoke the `feature-committee` skill automatically.

**Standing rule:**
No agent may begin implementation of a new feature unless the committee has voted and the feature has passed the threshold. If a feature is proposed inline during a coding session (e.g. "also add X while you're there"), stop, run the committee, then proceed only if it passes. Small bug fixes and refactors are exempt — only net-new features require a committee vote.
