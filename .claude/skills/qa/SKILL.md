# QA Engineer

## Role
Tests all critical paths in Worojuro. Unit tests with Vitest. E2E with Playwright.

## Critical test scenarios

### Woro score (P0)
- Always returns 0–100 when AI succeeds
- Returns `null` (never `0`) when AI call fails — null means unscored
- `woro_signals` shape matches `WoroSignals` type exactly
- Graceful degradation: AI timeout → null score, job still visible in feed
- Woro alert triggered when score < 40 for a matched job (check notifications table)

### WoroScoreBadge component (P0)
- `score=null` renders loading skeleton, no number shown
- `score=18` renders red badge with "Suspicious"
- `score=55` renders amber badge with "Verify"
- `score=85` renders green badge with "Looks legit"
- Tooltip shows correct `woro_signals` breakdown on hover

### Tracker status transitions (P0)
Valid: any status → any status
Invalid: reject transitions to self (no-op, not error)
Test all 8 statuses: saved · applied · oa · phone · interview · offer · rejected · ghosted

### Resume upload (P0)
- Valid PDF → accepted, parse triggered
- Valid DOCX → accepted, parse triggered
- `.exe` or `.txt` → rejected with clear error
- File > 10MB → rejected before Storage upload
- Re-upload when embedding exists → skip OpenAI call (check dedup)

### Referral matching (P1)
- Exact company match → contact returned
- Partial match ("Stripe" in "Stripe, Inc") → contact returned
- No match → empty array (not 404)

### Notification realtime (P1)
- Notification broadcast → received by subscribed client within 2s
- Bell badge count increments without page refresh

### RLS security (P0)
- User A CANNOT read user B's: applications, notifications, job_matches, pulse_interactions, resumes, referral_contacts
- User A CAN read global: jobs, pulse_items
- Test with two separate Supabase auth sessions

### Cron security (P0)
- GET /api/cron/ingest without `CRON_SECRET` header → 401
- GET /api/cron/digest without `CRON_SECRET` header → 401
- GET /api/cron/ingest with wrong secret → 401
- GET /api/cron/ingest with correct secret → 200

### Deduplication (P0)
- Same `(source, external_id)` ingested twice → only 1 row in jobs table
- Same `(source, external_id)` for pulse_items ingested twice → only 1 row

### Dismissed pulse items (P1)
- After dismissing a pulse_item → never reappears in `pulse.getFeed` for that user
- Other users still see the item

## Playwright E2E — full flow (P0)
```
signup → email confirmation → login
→ upload resume (PDF)
→ wait for parse complete (poll resume.getActive)
→ browse feed → verify WoroScoreBadge renders
→ click "Save" on a job
→ navigate to Tracker → verify job appears in "Saved" column
→ drag to "Applied"
→ navigate to Notifications → verify notification exists
```

## Test file locations
`*.test.ts` files alongside source files for unit tests.
`e2e/` directory for Playwright flows.

## Tools
Read · Edit · Bash · Grep
