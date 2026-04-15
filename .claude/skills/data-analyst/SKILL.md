# Data Analyst

## Role
Defines and queries Worojuro-specific metrics. Writes SQL views for the analytics layer.
Feeds weekly data to market-analyser.ts for the switch/wait signal.

## Worojuro metrics to own

### Job search funnel
```sql
-- Application funnel rate per status stage
SELECT status, COUNT(*) as count,
  ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 1) as pct
FROM applications
WHERE user_id = $1
GROUP BY status;
```

### Response timing
```sql
-- Average days-to-response per company (from applied → phone/interview/offer/rejected)
SELECT company,
  AVG(
    EXTRACT(EPOCH FROM (updated_at - applied_date::timestamptz)) / 86400
  ) as avg_days_to_response
FROM applications
WHERE user_id = $1 AND status IN ('phone','interview','offer','rejected')
  AND applied_date IS NOT NULL
GROUP BY company ORDER BY avg_days_to_response;
```

### Woro score distribution
```sql
-- % of feed jobs in each tier
SELECT
  CASE WHEN woro_score < 40 THEN 'red'
       WHEN woro_score BETWEEN 40 AND 70 THEN 'amber'
       ELSE 'green' END as tier,
  COUNT(*) as count,
  source
FROM jobs
WHERE is_active = true AND woro_score IS NOT NULL
GROUP BY tier, source ORDER BY source, tier;
```

### Fake job rate by source
```sql
-- Which sources produce the most suspicious jobs
SELECT source,
  COUNT(*) FILTER (WHERE woro_score < 40) as red_count,
  COUNT(*) as total,
  ROUND(COUNT(*) FILTER (WHERE woro_score < 40)::numeric / COUNT(*) * 100, 1) as red_pct
FROM jobs
WHERE woro_score IS NOT NULL
GROUP BY source ORDER BY red_pct DESC;
```

### Match score distribution
```sql
-- How well are the user's matches scoring?
SELECT
  CASE WHEN match_score >= 80 THEN 'excellent'
       WHEN match_score >= 60 THEN 'good'
       WHEN match_score >= 40 THEN 'fair'
       ELSE 'poor' END as tier,
  COUNT(*) as count
FROM job_matches
WHERE user_id = $1
GROUP BY tier;
```

### Best tech keywords in feed
```sql
-- Which tech keywords appear most in high-scoring matches
SELECT unnest(j.tech_stack) as tech, AVG(jm.match_score) as avg_score, COUNT(*) as jobs
FROM job_matches jm
JOIN jobs j ON j.id = jm.job_id
WHERE jm.user_id = $1
GROUP BY tech HAVING COUNT(*) >= 3
ORDER BY avg_score DESC LIMIT 20;
```

### Notification engagement
```sql
SELECT type,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE is_read = true) as read_count,
  ROUND(COUNT(*) FILTER (WHERE is_read = true)::numeric / COUNT(*) * 100, 1) as read_rate
FROM notifications
WHERE user_id = $1
GROUP BY type ORDER BY read_rate DESC;
```

## Output location
SQL views → `server/db/analytics/`
One file per view group: funnel.sql, woro_distribution.sql, match_quality.sql

## MCPs
Supabase MCP — for running analytical queries against live data

## Tools
Read · Bash · WebSearch
