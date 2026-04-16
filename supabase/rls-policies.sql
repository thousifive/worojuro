-- ============================================================
-- Worojuro — RLS policies for all 9 tables
-- Run in Supabase SQL editor (Settings → SQL Editor)
-- Safe to re-run: uses CREATE POLICY IF NOT EXISTS pattern
-- via DROP IF EXISTS + CREATE.
-- ============================================================

-- ── Enable RLS on all tables ────────────────────────────────

ALTER TABLE users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs                ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_contacts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_matches         ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_signals      ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulse_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulse_interactions  ENABLE ROW LEVEL SECURITY;

-- ── users ───────────────────────────────────────────────────

DROP POLICY IF EXISTS "user reads own row"   ON users;
DROP POLICY IF EXISTS "user updates own row" ON users;

CREATE POLICY "user reads own row" ON users
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "user updates own row" ON users
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- ── jobs (public read, service-role write) ──────────────────

DROP POLICY IF EXISTS "authenticated read" ON jobs;

CREATE POLICY "authenticated read" ON jobs
  FOR SELECT USING (auth.role() = 'authenticated');

-- INSERT/UPDATE via service role only (cron + ingestion).
-- No INSERT/UPDATE policy for authenticated role.

-- ── applications ────────────────────────────────────────────

DROP POLICY IF EXISTS "user owns applications" ON applications;

CREATE POLICY "user owns applications" ON applications
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── notifications ────────────────────────────────────────────

DROP POLICY IF EXISTS "user owns notifications" ON notifications;

CREATE POLICY "user owns notifications" ON notifications
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── resumes ─────────────────────────────────────────────────

DROP POLICY IF EXISTS "user owns resumes" ON resumes;

CREATE POLICY "user owns resumes" ON resumes
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── referral_contacts ────────────────────────────────────────

DROP POLICY IF EXISTS "user owns referral_contacts" ON referral_contacts;

CREATE POLICY "user owns referral_contacts" ON referral_contacts
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── job_matches ──────────────────────────────────────────────

DROP POLICY IF EXISTS "user owns job_matches" ON job_matches;

CREATE POLICY "user owns job_matches" ON job_matches
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── market_signals ───────────────────────────────────────────

DROP POLICY IF EXISTS "user owns market_signals" ON market_signals;

CREATE POLICY "user owns market_signals" ON market_signals
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── pulse_items (public read, service-role write) ────────────

DROP POLICY IF EXISTS "authenticated read pulse_items" ON pulse_items;

CREATE POLICY "authenticated read pulse_items" ON pulse_items
  FOR SELECT USING (auth.role() = 'authenticated');

-- ── pulse_interactions ───────────────────────────────────────

DROP POLICY IF EXISTS "user owns pulse_interactions" ON pulse_interactions;

CREATE POLICY "user owns pulse_interactions" ON pulse_interactions
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── Verification query ───────────────────────────────────────
-- Run after applying to confirm all policies are active:
--
-- SELECT tablename, policyname, cmd, qual
-- FROM   pg_policies
-- WHERE  schemaname = 'public'
-- ORDER  BY tablename, policyname;
