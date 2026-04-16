# Changelog

All notable changes to Worojuro are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [0.1.0] — 2026-04-16 — Phase 1 release

### Sprint 0 — Foundation
- Next.js 15 App Router + TypeScript strict scaffolding
- Supabase Auth with @supabase/ssr middleware
- Drizzle ORM schema: 9 tables (users, jobs, applications, notifications, resumes, referral_contacts, job_matches, market_signals, pulse_items/interactions)
- pgvector extension + 768-dim embedding columns (Ollama) with 1536-dim migration path (OpenAI)
- tRPC v11 + React Query v5 wired end-to-end
- Dashboard shell layout: sidebar, header, protected route middleware
- Vercel Cron skeleton (2 slots: 6h ingest, 7am digest) with CRON_SECRET auth
- RLS policies for all 9 tables (`supabase/rls-policies.sql`)

### Sprint 1 — Resume vault + Tracker
- **Resume vault:** PDF/DOCX upload to Supabase Storage, async parse with `pdf-parse` + LLM skill extraction, status polling, version list
- **Job tracker:** 8-column Kanban (Saved → Applied → OA → Phone → Interview → Offer → Rejected → Ghosted), drag-and-drop status updates, next action + date fields
- `applyToJob` tRPC mutation: (user_id, job_id) dedup — never creates duplicate applications

### Sprint 2 — Job feed + Woro score
- **Curated job feed:** vector cosine similarity match-scoring against resume embedding
- Feed filters: match score, Woro score, remote type, tech stack, salary range, location
- Infinite scroll with cursor-based pagination
- **Woro scorer:** 0–100 trust/legitimacy score on every listing via LLM
  - 3 signal dimensions: fake_job_score (50%), jd_quality_score (30%), company_legitimacy_score (20%)
  - Repost age signal: days_since_posted injected into prompt, STALE warning at 30+ days
  - `repost_age_days` stored in `woro_signals` JSONB for badge tooltip display
  - Tier coloring: red (<40), amber (40–70), green (>70)
  - Never re-scores jobs where `woro_score IS NOT NULL`
- **WoroScoreBadge:** shared badge component with hover tooltip showing full signal breakdown
- `woro_alert` notification triggered when Woro score < 40 on a feed match
- Job ingestion: Remotive, Jobicy, RemoteOK, Adzuna, HN Algolia
- `onConflictDoUpdate` with COALESCE backfills `apply_url` on existing rows

### Sprint 3 — Notifications + email
- Supabase Realtime channel: `notifications:user:[userId]`
- Notifications page: unread badge, mark-read, filter by type
- 4 email templates (React Email + Resend): welcome, instant match, weekly digest, woro alert
- Digest cron (7am): respects `notify_digest_frequency` preference (daily / weekly / never)

### Sprint 4 — Referrals + Analysis
- **Referral finder:** LinkedIn Connections CSV import via PapaParse, manual add form, contact list with avatar initials and delete
- Referral chips on every feed job card (purple badges, fuzzy company match)
- **Analysis page:** AI switch/wait signal (SignalCard), salary benchmark BarChart (Recharts), application funnel BarChart, signal history timeline
- Apply confirm flow: "Did you apply?" amber inline prompt — URL opens immediately, tracker write only on explicit confirmation (prevents false-applied state)
- `sourceListingUrl()` fallback: constructs listing URL from source + externalId when `apply_url` is null

### Sprint 5 — Market Pulse
- **Pulse feed:** 4-tab feed (Tech Updates, Layoffs, Market, Funding & IPOs), refreshed every 6h
- Pulse card types: PulseCard, LayoffCard (with "Companies hiring from this layoff" cross-ref), FundingCard (favorite company highlight)
- AI summary generation for pulse items (async, graceful degradation)
- Dismiss + save interactions stored in `pulse_interactions`
- `hiringFromLayoff` flag: cross-references layoff item company against user's active feed matches

### Sprint 6 — Polish + Phase 1 release
- **Dashboard overview:** live stat cards (open applications, feed matches, avg Woro score, unread alerts), RecentMatchesWidget, NextActionsWidget, quick links — all with graceful degradation
- **Settings page:** full preference editor — skills/tech TagInputs, location + remote toggle, salary currency + minimum, Woro score slider, notification threshold + digest frequency, favorite companies, Save with 2s "Saved ✓" flash
- **E2E test suite:** Playwright specs for auth guards, dashboard, feed apply-confirm flow, tracker Kanban, referral CSV import, settings form
- **Performance indexes:** `supabase/performance-indexes.sql` — ivfflat for vector search, partial indexes for unscored/unembedded jobs
- S5-8 wired: `hiringFromLayoff` computed in PulseFeed by querying active feed companies

### Fixed
- `onConflictDoNothing()` → `onConflictDoUpdate(COALESCE)` — jobs ingested before `apply_url` column now get URL backfilled on next cron run
- `pdf-parse` CJS import changed to `require()` — resolves Next.js Webpack `default is not a function` error
- Apply button confirm flow prevents false application tracking when user clicks Apply but doesn't actually submit

---

## Upcoming — Phase 2

- Multi-user SaaS (schema is already user_id + RLS-ready, zero migrations needed)
- OpenAI embeddings upgrade (768→1536 dim — single ALTER TABLE per vector column)
- Browser extension: save jobs from LinkedIn / company careers pages
- Headcount trend signal (LinkedIn/Crunchbase growth rate)
- Interview prep: AI question generation from JD + resume
