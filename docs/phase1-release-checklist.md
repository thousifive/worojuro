# Phase 1 Release Checklist

Delivery manager sign-off document. Every item must be checked before `v0.1.0` is tagged.

---

## Pre-deploy

### Database
- [ ] Run `supabase/rls-policies.sql` in Supabase SQL editor — verify all 9 tables have RLS enabled
- [ ] Run `server/db/migrations/0000_init.sql` on production Supabase project
- [ ] Confirm `vector` extension is enabled: `SELECT * FROM pg_extension WHERE extname = 'vector';`
- [ ] Run `ALTER TABLE jobs ADD COLUMN IF NOT EXISTS apply_url TEXT;` if not already applied
- [ ] Set `SEED_USER_ID` and run `npx tsx server/db/seed.ts` if you want initial test data
- [ ] After first cron ingest (≥1000 jobs), run `supabase/performance-indexes.sql` to create ivfflat indexes

### Supabase Storage
- [ ] Create `resumes` bucket in Supabase Storage dashboard
- [ ] Set bucket to private (RLS enforced via service role key)
- [ ] Verify upload policy: authenticated users can write to `<user_id>/` prefix only

### Auth
- [ ] Supabase Auth email templates configured (via Supabase dashboard)
- [ ] Confirm auth callback URL set: `https://<your-domain>/auth/callback`
- [ ] Google OAuth provider configured (Client ID + Secret in Supabase Auth settings)

### Environment variables (Vercel)
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` — production secret, never in client bundle
- [ ] `ANTHROPIC_API_KEY`
- [ ] `OPENAI_API_KEY`
- [ ] `RESEND_API_KEY`
- [ ] `CRON_SECRET` — generate: `openssl rand -hex 32`

### Resend
- [ ] Domain verified in Resend dashboard
- [ ] Sender address configured: `noreply@<your-domain>`
- [ ] Test digest email sent successfully to founder email

---

## Cron jobs (Vercel)

- [ ] Cron 1 (`/api/cron/ingest`) — schedule: `0 */6 * * *` (every 6h)
- [ ] Cron 2 (`/api/cron/digest`) — schedule: `0 7 * * *` (7am daily)
- [ ] Both crons configured with `Authorization: Bearer <CRON_SECRET>` header in Vercel dashboard
- [ ] Manual trigger test: `curl -H "Authorization: Bearer $CRON_SECRET" https://<domain>/api/cron/ingest`
- [ ] Ingest run completes without 5xx errors
- [ ] At least 50 jobs appear in Supabase `jobs` table after first ingest
- [ ] Woro scores populated on ingested jobs (check `woro_score IS NOT NULL` count)

---

## Smoke tests (manual, post-deploy)

### Auth
- [ ] Sign up with email → confirmation email received → account activated
- [ ] Sign in with email + password
- [ ] Sign in with Google OAuth
- [ ] Unauthenticated `/dashboard` → redirects to `/login`

### Resume vault
- [ ] Upload PDF resume → storage path created → parse completes (skills extracted)
- [ ] Vault page shows parsed status and skill count

### Feed
- [ ] Feed loads and shows job cards with match scores
- [ ] Woro score badge visible on cards (green/amber/red)
- [ ] Hover tooltip shows signal breakdown
- [ ] Apply button click → opens job URL in new tab
- [ ] "Did you apply?" prompt appears → confirm → job appears in tracker as Applied

### Tracker
- [ ] Kanban loads with 8 columns
- [ ] Drag card between columns → status persists after refresh
- [ ] Next action date shows "overdue" / "Today" / "Nd" badge

### Notifications
- [ ] Notifications page shows unread count badge in sidebar
- [ ] Mark all read → badge clears

### Referrals
- [ ] Import LinkedIn CSV → preview shows contacts → import → list populated
- [ ] Referral chips appear on feed cards for matching companies

### Analysis
- [ ] Market signal card shows switch/wait/hold status
- [ ] Salary benchmark chart renders (if feed has salary data)
- [ ] Application funnel chart renders

### Pulse
- [ ] Pulse feed loads with Tech Updates tab
- [ ] Layoffs tab: layoff cards show "Hiring from this layoff" chip when company is in feed
- [ ] Dismiss action removes card from feed

### Settings
- [ ] Settings page loads current preferences
- [ ] Add skill tag → Save → reload → tag persists
- [ ] Woro filter slider changes → Save → feed respects new threshold

---

## Automated tests

- [ ] `npm test` — all Vitest unit tests pass (0 failures)
- [ ] `npx playwright test` (with `TEST_USER_EMAIL` + `TEST_USER_PASSWORD` set) — E2E suite passes
- [ ] Cron security tests pass: `/api/cron/ingest` and `/api/cron/digest` return 401 without correct secret

---

## Performance

- [ ] Feed page initial load < 3s (p95)
- [ ] Dashboard overview < 2s
- [ ] ivfflat index created after first bulk ingest (run `supabase/performance-indexes.sql`)

---

## Final sign-off

- [ ] All items above checked
- [ ] `git tag v0.1.0`
- [ ] CHANGELOG.md reflects all Sprint 1–6 changes
- [ ] Phase 2 roadmap noted in CHANGELOG under "Upcoming"

**Delivery manager sign-off:** ___________________  Date: ___________
