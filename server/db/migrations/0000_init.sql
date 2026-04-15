-- =============================================================================
-- Migration 0000: Initial schema
-- Review this SQL diff before running: npx drizzle-kit migrate
-- =============================================================================

-- ── Extensions ────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- ── users ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          uuid PRIMARY KEY,  -- FK to auth.users, same UUID
  email       text NOT NULL,
  full_name   text,
  resume_parsed_at timestamptz,
  preferences jsonb NOT NULL DEFAULT '{
    "skills": [],
    "tech_stack": [],
    "locations": [],
    "remote_pref": "remote",
    "salary_min": 0,
    "salary_currency": "USD",
    "notify_instant_threshold": 80,
    "notify_digest_frequency": "daily",
    "favorite_companies": [],
    "hide_woro_below": 30
  }'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user reads own row" ON users FOR SELECT USING (id = auth.uid());
CREATE POLICY "user updates own row" ON users FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "user inserts own row" ON users FOR INSERT WITH CHECK (id = auth.uid());

-- ── resumes ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS resumes (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name           text NOT NULL,
  storage_path        text NOT NULL,
  parsed_skills       text[] NOT NULL DEFAULT '{}',
  parsed_experience   jsonb NOT NULL DEFAULT '[]',
  parsed_education    jsonb NOT NULL DEFAULT '[]',
  raw_text            text,
  embedding           vector(768),    -- 768=Ollama nomic-embed-text; switch to vector(1536) for OpenAI
  is_active           boolean NOT NULL DEFAULT true,
  version_label       text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user owns resumes" ON resumes
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── jobs ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jobs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source              text NOT NULL,
  external_id         text NOT NULL,
  title               text NOT NULL,
  company             text NOT NULL,
  company_domain      text,
  location            text,
  remote_type         text,
  salary_min          integer,
  salary_max          integer,
  salary_currency     text,
  tech_stack          text[] NOT NULL DEFAULT '{}',
  perks               text[] NOT NULL DEFAULT '{}',
  description_raw     text NOT NULL,
  description_cleaned text,
  embedding           vector(768),    -- 768=Ollama nomic-embed-text; switch to vector(1536) for OpenAI
  posted_at           timestamptz,
  ingested_at         timestamptz NOT NULL DEFAULT now(),
  is_active           boolean NOT NULL DEFAULT true,
  woro_score          integer,          -- 0-100, null = unscored
  woro_signals        jsonb,
  CONSTRAINT jobs_source_external_id_uq UNIQUE (source, external_id)
);

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
-- Authenticated users can SELECT; INSERT/UPDATE only via service role
CREATE POLICY "authenticated read jobs" ON jobs FOR SELECT USING (auth.role() = 'authenticated');

CREATE INDEX jobs_posted_at_idx ON jobs (posted_at DESC);
CREATE INDEX jobs_woro_score_idx ON jobs (woro_score);
CREATE INDEX jobs_tech_stack_gin_idx ON jobs USING GIN (tech_stack);
-- ivfflat index: run AFTER bulk insert (requires data to tune lists parameter)
-- CREATE INDEX jobs_embedding_ivfflat_idx ON jobs USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ── job_matches ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS job_matches (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id           uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  match_score      integer NOT NULL,
  match_breakdown  jsonb NOT NULL,
  is_dismissed     boolean NOT NULL DEFAULT false,
  is_saved         boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT job_matches_user_job_uq UNIQUE (user_id, job_id)
);

ALTER TABLE job_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user owns job_matches" ON job_matches
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE INDEX job_matches_user_score_idx ON job_matches (user_id, match_score DESC);

-- ── applications ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS applications (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id               uuid REFERENCES jobs(id) ON DELETE SET NULL,
  company              text NOT NULL,
  role                 text NOT NULL,
  jd_url               text,
  status               text NOT NULL DEFAULT 'saved',
  applied_date         date,
  salary_offered       integer,
  location             text,
  remote_type          text,
  referral_contact_id  uuid,   -- FK added after referral_contacts table
  notes                text,
  next_action          text,
  next_action_date     date,
  offer_details        jsonb,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user owns applications" ON applications
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE INDEX applications_user_status_date_idx ON applications (user_id, status, next_action_date);

-- ── referral_contacts ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referral_contacts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name    text NOT NULL,
  company      text,
  role         text,
  linkedin_url text,
  email        text,
  source       text NOT NULL DEFAULT 'manual',
  imported_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE referral_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user owns referral_contacts" ON referral_contacts
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Add deferred FK from applications to referral_contacts
ALTER TABLE applications
  ADD CONSTRAINT applications_referral_contact_fk
  FOREIGN KEY (referral_contact_id)
  REFERENCES referral_contacts(id)
  ON DELETE SET NULL;

-- ── notifications ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       text NOT NULL,
  title      text NOT NULL,
  body       text NOT NULL,
  metadata   jsonb NOT NULL DEFAULT '{}',
  is_read    boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user owns notifications" ON notifications
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE INDEX notifications_user_read_created_idx ON notifications (user_id, is_read, created_at DESC);

-- Enable Realtime on notifications (Supabase dashboard: Database → Replication)
-- Or via SQL:
-- ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ── market_signals ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS market_signals (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  signal_type   text NOT NULL,
  analysis      text NOT NULL,
  data_snapshot jsonb NOT NULL,
  generated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE market_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user owns market_signals" ON market_signals
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── pulse_items ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pulse_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source          text NOT NULL,
  external_id     text NOT NULL,
  category        text NOT NULL,
  title           text NOT NULL,
  url             text NOT NULL,
  summary_raw     text NOT NULL,
  summary_ai      text,           -- null = pending async AI summary
  company         text,
  tags            text[] NOT NULL DEFAULT '{}',
  relevance_score integer NOT NULL DEFAULT 50,
  published_at    timestamptz,
  ingested_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pulse_items_source_external_id_uq UNIQUE (source, external_id)
);

ALTER TABLE pulse_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated read pulse_items" ON pulse_items FOR SELECT USING (auth.role() = 'authenticated');

CREATE INDEX pulse_items_category_published_idx ON pulse_items (category, published_at DESC);
CREATE INDEX pulse_items_tags_gin_idx ON pulse_items USING GIN (tags);

-- ── pulse_interactions ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pulse_interactions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pulse_item_id uuid NOT NULL REFERENCES pulse_items(id) ON DELETE CASCADE,
  action        text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pulse_interactions_user_item_uq UNIQUE (user_id, pulse_item_id)
);

ALTER TABLE pulse_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user owns pulse_interactions" ON pulse_interactions
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE INDEX pulse_interactions_user_action_idx ON pulse_interactions (user_id, action);
