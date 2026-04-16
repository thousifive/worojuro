-- ============================================================
-- Worojuro — Performance indexes
-- Run in Supabase SQL editor AFTER bulk job ingestion.
-- (ivfflat requires data to tune the `lists` parameter.)
-- ============================================================

-- ── Vector similarity index (ivfflat) ───────────────────────
-- Rule: run once ≥ 1,000 jobs are ingested.
-- lists = sqrt(row_count) is a good starting point.
-- For ~10k jobs: lists = 100.
-- Re-run with higher lists if feed p95 latency > 2s.

CREATE INDEX IF NOT EXISTS jobs_embedding_ivfflat_idx
  ON jobs USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX IF NOT EXISTS resumes_embedding_ivfflat_idx
  ON resumes USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 10);

-- ── Composite indexes for feed query ────────────────────────
-- job_matches — already created by Drizzle schema (job_matches_user_score_idx)
-- This is a reminder, not a re-run:
-- CREATE INDEX job_matches_user_score_idx ON job_matches (user_id, match_score DESC);

-- ── Partial index: active unscored jobs ─────────────────────
-- Speeds up the cron scorer loop (WHERE woro_score IS NULL AND is_active = true)
CREATE INDEX IF NOT EXISTS jobs_unscored_active_idx
  ON jobs (created_at DESC)
  WHERE woro_score IS NULL AND is_active = true;

-- ── Partial index: active unembedded jobs ────────────────────
-- Speeds up the embedding backfill pass (WHERE embedding IS NULL AND is_active = true)
CREATE INDEX IF NOT EXISTS jobs_unembedded_active_idx
  ON jobs (created_at DESC)
  WHERE embedding IS NULL AND is_active = true;

-- ── Verify ───────────────────────────────────────────────────
-- SELECT indexname, indexdef
-- FROM   pg_indexes
-- WHERE  tablename IN ('jobs', 'resumes', 'job_matches')
-- ORDER  BY tablename, indexname;
