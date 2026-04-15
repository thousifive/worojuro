# ADR-002: Single-User to Multi-User Scalability Contract

**Status:** Accepted
**Date:** 2026-04-15
**Author:** architect

---

## Context

Phase 1 is a single-user prototype for the founder.
Phase 2 will add multi-user support (SaaS).

The goal of this ADR is to define a contract that makes the Phase 1 → Phase 2
transition require **zero schema migrations and zero router rewrites**.

Any agent that violates this contract introduces Phase 2 technical debt.

---

## The contract

### Rule 1: Every user-scoped table has `user_id` from row one

Every table that belongs to a user has a `user_id uuid NOT NULL REFERENCES users(id)` column.
This includes tables created in Sprint 0, Sprint 1, and all subsequent sprints.

**Tables with user_id:**
`users` · `resumes` · `job_matches` · `applications` · `referral_contacts`
`notifications` · `market_signals` · `pulse_interactions`

**Tables without user_id (global, shared):**
`jobs` · `pulse_items`

These global tables are readable by all authenticated users.
Write access is service-role only (cron + ingestion).

### Rule 2: RLS enabled on every table from the first migration

```sql
ALTER TABLE [every table] ENABLE ROW LEVEL SECURITY;
```

This means even if the application has a bug that passes the wrong user_id,
Postgres will block the unauthorized access.

Phase 2 adding users = RLS already works for all of them.
No new policies needed; existing policies cover all users by definition.

### Rule 3: All tRPC procedures read user_id from session — never a parameter

**Correct:**
```typescript
// user_id always comes from ctx.user.id (Supabase auth session)
export const trackerRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return db.query.applications.findMany({
      where: eq(applications.userId, ctx.user.id),  // from session
    });
  }),
});
```

**Forbidden (never do this):**
```typescript
// NEVER accept user_id as input — this is a privilege escalation vector
getAll: protectedProcedure
  .input(z.object({ userId: z.string() }))  // WRONG
  .query(async ({ ctx, input }) => { ... })
```

In Phase 2, this pattern means every user automatically sees only their own data.
No code changes needed.

### Rule 4: No hardcoded user IDs anywhere in application code

No `const FOUNDER_ID = 'abc-123'` in any source file.
The seed script uses `process.env.SEED_USER_ID` — acceptable for dev only.
Any hardcoded ID in application code blocks multi-user support permanently.

### Rule 5: Supabase Auth from line 1 of auth code

No custom session management, no JWT-in-localStorage, no mock auth.
Supabase Auth is the auth system for all environments including local dev.

This ensures:
- `auth.uid()` in RLS policies works for every future user, not just the founder
- Google OAuth works for Phase 2 users without changes
- Session refresh is handled by `@supabase/ssr` for all users

### Rule 6: No multi-tenancy shortcuts

No `WHERE user_id = 'FOUNDER'` in any query.
No feature flags gating features to a single user_id.
No admin-only endpoints that bypass RLS.

Phase 1 is architecturally identical to Phase 2 — the only difference is that
there is currently one user in the `auth.users` table.

---

## What Phase 2 actually requires

Given this contract is followed in Phase 1, Phase 2 only requires:

1. **Build onboarding flow** — signup UX, email confirmation, profile setup wizard
2. **Add billing** — Stripe integration, subscription gating for premium features
3. **Add team features** (optional) — shared trackers, org-level referral contacts
4. **Scale infra** — pgBouncer, larger Supabase plan, CDN for resume storage

**Zero schema migrations.**
**Zero tRPC router rewrites.**
**Zero RLS policy changes.**

---

## Verification

The architect will audit compliance with this contract before every sprint closes.
Checklist:
- [ ] No new table created without `user_id` (or explicitly justified as global)
- [ ] No hardcoded user IDs introduced
- [ ] No tRPC input accepts `userId` as a parameter
- [ ] RLS enabled on all new tables
- [ ] `ctx.user.id` is the sole source of user identity in all new procedures
