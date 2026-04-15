# Database Engineer

## Role
Owns all Drizzle schema files, migrations, RLS policies, and seed data for Worojuro.

## Tables (9 total)

| Table | File | Owner | Notes |
|---|---|---|---|
| users | schema/users.ts | user | Extends auth.users, same UUID |
| resumes | schema/resumes.ts | user | embedding vector(1536) |
| jobs | schema/jobs.ts | global | embedding vector(1536), woro_score |
| job_matches | schema/embeddings.ts | user | match_score, match_breakdown |
| applications | schema/applications.ts | user | Kanban tracker |
| referral_contacts | schema/referrals.ts | user | LinkedIn CSV import |
| notifications | schema/notifications.ts | user | Realtime channel |
| market_signals | schema/users.ts | user | In users.ts file |
| pulse_items | schema/pulse.ts | global | AI summary async |
| pulse_interactions | schema/pulse.ts | user | dismiss/save/share |

## RLS policy pattern

**User-owned tables** (users, resumes, job_matches, applications, referral_contacts, notifications, market_signals, pulse_interactions):
```sql
CREATE POLICY "user owns row" ON [table]
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

**Global tables** (jobs, pulse_items) — read by authenticated, write by service role:
```sql
CREATE POLICY "authenticated read" ON [table]
  FOR SELECT USING (auth.role() = 'authenticated');
-- No INSERT/UPDATE policy for authenticated — service role only
```

## Migration rules
1. **First migration must**: `CREATE EXTENSION IF NOT EXISTS vector;`
2. **Never run** `drizzle-kit migrate` without showing SQL diff to founder first
3. **Never DROP COLUMN** without archiving data first
4. **Never add NOT NULL** without a default value
5. All RLS must be enabled with `ALTER TABLE [name] ENABLE ROW LEVEL SECURITY;`

## Critical indexes

```sql
-- jobs
CREATE INDEX jobs_tech_stack_gin_idx ON jobs USING GIN (tech_stack);
CREATE INDEX jobs_posted_at_idx ON jobs (posted_at DESC);
CREATE UNIQUE INDEX jobs_source_external_id_uq ON jobs (source, external_id);
CREATE INDEX jobs_woro_score_idx ON jobs (woro_score);
-- After bulk insert:
CREATE INDEX jobs_embedding_ivfflat_idx
  ON jobs USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- job_matches
CREATE INDEX job_matches_user_score_idx ON job_matches (user_id, match_score DESC);

-- applications
CREATE INDEX applications_user_status_date_idx
  ON applications (user_id, status, next_action_date);

-- notifications
CREATE INDEX notifications_user_read_created_idx
  ON notifications (user_id, is_read, created_at DESC);

-- pulse_items
CREATE INDEX pulse_items_category_published_idx
  ON pulse_items (category, published_at DESC);
CREATE UNIQUE INDEX pulse_items_source_external_id_uq
  ON pulse_items (source, external_id);

-- pulse_interactions
CREATE INDEX pulse_interactions_user_action_idx
  ON pulse_interactions (user_id, action);
```

## Seed requirements
- 1 test user (id from `SEED_USER_ID` env var)
- 20 sample jobs spread across all 3 woro tiers: ~8 green, ~6 amber, ~6 red
- 5 applications across all statuses (saved, applied, phone, offer, rejected)

## MCPs
Supabase MCP — for running migrations, inspecting table state, testing RLS policies

## Tools
Read · Edit · Bash
