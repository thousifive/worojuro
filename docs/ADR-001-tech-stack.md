# ADR-001: Tech Stack Rationale

**Status:** Accepted
**Date:** 2026-04-15
**Author:** architect

---

## Context

Worojuro is a single-user job search intelligence dashboard built by a solo founder.
Phase 1 constraint: **$0/month**. All architectural choices must fit within free tiers.
Phase 2 constraint: **zero schema rewrites** when adding multi-user support.

---

## Decisions

### Frontend: Next.js 15 App Router + React 19 + TypeScript strict

**Why Next.js 15 App Router:**
- Server Components reduce client bundle size — critical for feed pages with large data sets
- Built-in route handlers replace the need for a separate API server
- `maxDuration` on route handlers enables long-running cron jobs (up to 5 min on Hobby)
- Vercel deploys Next.js natively — no Docker, no config, zero infra cost

**Why React 19:**
- Concurrent features needed for infinite scroll feed without jank
- `use()` hook simplifies data fetching in Server Components
- No breaking changes from React 18 for this use case

**Why TypeScript strict:**
- Woro score can be `null` (unscored) or `number` (0–100) — strict null checks prevent treating null as zero, which would misrepresent unscored jobs as suspicious
- Prevents accidental client-side exposure of `SUPABASE_SERVICE_ROLE_KEY` (TypeScript will catch passing server-only types to client components)

### API layer: tRPC v11 + React Query v5

**Why tRPC over REST or GraphQL:**
- End-to-end type safety without code generation — change a router return type and the client immediately shows type errors
- Runs inside Next.js route handlers — no separate server cost
- React Query v5 integration gives caching, background refetch, and optimistic updates for free
- `protectedProcedure` pattern enforces auth at the type level — can't call a protected procedure without `ctx.user`

**Why not GraphQL:**
- Overkill for a single-user app; no need for flexible query shapes
- Code generation adds build complexity with no benefit at this scale

### Auth: Supabase Auth + @supabase/ssr

**Why Supabase Auth:**
- Free tier: 50,000 MAU — more than sufficient for Phase 1 (1 user) and early Phase 2
- Email + Google OAuth out of the box — no Passport.js setup
- `@supabase/ssr` handles cookie-based sessions in Next.js App Router correctly
- Same Supabase project = auth and DB share the same connection, simplifying RLS (`auth.uid()` works natively in Postgres policies)

**Why not NextAuth/Auth.js:**
- Requires separate session storage (Redis or DB table) — adds complexity
- No native Postgres RLS integration

### Database: Supabase Postgres + Drizzle ORM + pgvector

**Why Supabase Postgres:**
- Free tier: 500MB — sufficient for job listings + embeddings at MVP scale
- pgvector extension built in — no separate vector DB (Pinecone, Qdrant) needed
- RLS enforced at the DB level — even if application code has a bug, unauthorized data access is blocked
- Supabase Realtime runs on the same Postgres instance — no separate pub/sub service

**Why Drizzle over Prisma:**
- Drizzle generates raw SQL with zero runtime overhead — critical for vector search performance
- `customType` API supports pgvector `vector(1536)` column natively
- Migrations are plain SQL files — reviewable, version-controlled, no magic
- Drizzle's query builder compiles to the same SQL you'd write by hand

**Why pgvector over a dedicated vector DB:**
- Zero additional cost — built into Supabase free tier
- `ivfflat` index with `lists=100` gives sub-100ms cosine similarity search for < 1M rows
- Keeps resume and job embeddings co-located with their metadata — joins are free

### AI: Claude Haiku + OpenAI text-embedding-3-small

**Why Claude Haiku for scoring:**
- Lowest cost in the Claude family — critical for scoring hundreds of jobs per cron run
- Fast inference — Woro score must complete within the 5-min cron budget
- Structured JSON output is reliable with Haiku for well-formed prompts
- Cache all outputs in DB — never re-score a job or resume that already has a result

**Why OpenAI embeddings:**
- `text-embedding-3-small` is $0.00002/1k tokens — cheapest production-quality embedding
- 1536 dimensions matches pgvector's sweet spot for `ivfflat` with `lists=100`
- $5 free credit covers the entire MVP embedding pipeline
- Anthropic does not offer a production embedding API as of this decision

**Why not a single AI provider:**
- Anthropic's strength is reasoning (Woro scoring, market analysis)
- OpenAI's strength is embeddings (text-embedding-3-small is industry standard)
- Using both at their strengths is cheaper than using one provider suboptimally

### Email: Resend + React Email

**Why Resend:**
- Free tier: 3,000 emails/month, 100/day — sufficient for 1 user with daily digests
- React Email templates are JSX — same mental model as the rest of the codebase
- Reliable deliverability for transactional email

### Deploy: Vercel Hobby

**Why Vercel:**
- Native Next.js support — no Dockerfile needed
- 2 free cron slots — exactly what Worojuro needs (ingest + digest)
- Edge network for static assets, serverless functions for API
- Preview deploys on every PR — critical for testing without touching production

---

## Rejected alternatives

| Alternative | Reason rejected |
|---|---|
| Remix | No native Vercel cron support; tRPC integration less mature |
| SvelteKit | React ecosystem required for shadcn/ui and @dnd-kit |
| PlanetScale | No pgvector; no RLS |
| Neon | pgvector available but no native Supabase Realtime |
| Railway | Costs money; not free tier friendly |
| Pinecone | $0 free tier is 100k vectors max; would add a second paid service |
| AWS Lambda | Cold starts; infra complexity; not free |

---

## Upgrade path

Current free tier limits and upgrade triggers:

| Limit hit | Action | Cost |
|---|---|---|
| >500MB Postgres | Upgrade Supabase to Pro | $25/mo |
| >50k MAU | Upgrade Supabase to Pro | $25/mo |
| >3k emails/mo | Upgrade Resend | $20/mo |
| AI costs > $20/mo | Evaluate prompt caching, batch API | Variable |
| >2 cron jobs needed | Upgrade Vercel or use Trigger.dev free tier | Variable |
