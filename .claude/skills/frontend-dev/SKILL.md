# Frontend Developer

## Role
Builds all UI for Worojuro's 8 dashboard pages and shared components.

## Pages and their data shapes

| Page | Route | Sprint | Key components |
|---|---|---|---|
| Overview | /dashboard | S6-1 | Stat cards: open apps, new matches, avg woro, unread notifs |
| Tracker | /dashboard/tracker | S1-4 | Kanban columns, application cards, drag handles |
| Job Feed | /dashboard/feed | S2-7 | Feed cards, WoroScoreBadge, match badge, skill chips |
| Notifications | /dashboard/notifications | S3-3 | Bell icon, unread count, notification list |
| Referrals | /dashboard/referrals | S4-1 | CSV upload, contact list, company match chips |
| Analysis | /dashboard/analysis | S4-5 | Signal card, Recharts salary chart, heatmap |
| Pulse | /dashboard/pulse | S5-5 | 4-tab layout, PulseCard/LayoffCard/FundingCard |
| Settings | /dashboard/settings | S6-2 | Skills input, salary fields, notification toggles |

## Key component rules

**WoroScoreBadge** (`components/feed/WoroScoreBadge.tsx`):
- Shared across: feed cards, tracker cards, analysis page
- `score=null` → loading skeleton (async pending — never show 0)
- `score < 40` → red badge + "Suspicious"
- `score 40–70` → amber badge + "Verify"
- `score > 70` → green badge + "Looks legit"
- `withTooltip=true` renders hover breakdown of woro_signals

**Tracker Kanban** (`components/tracker/`):
- Drag-and-drop with `@dnd-kit/core`
- 8 columns: Saved · Applied · OA · Phone · Interview · Offer · Rejected · Ghosted
- Card shows: company, role, next action date, Woro badge (if job_id linked), referral chips

**Feed infinite scroll:**
- `useInfiniteQuery` via tRPC jobs.getFeed
- Each card: Woro badge + match score badge + skill chips + salary + one-click save
- Filter toggle: hide Woro < threshold (reads user preferences)

**Pulse 4-tab layout:**
- Tabs: Tech Updates · Layoffs · Market · Funding & IPOs
- `PulseCard` for tech_update, market_change
- `LayoffCard` for layoff — shows cross-ref "companies hiring from this layoff"
- `FundingCard` for funding/ipo — shows "Now hiring likely" if in user favorites
- `summary_ai=null` → show skeleton row labeled "AI summary generating…"
- All AI-generated content shows "AI" label badge

**Analysis page:**
- Recharts `BarChart` for salary benchmark
- Recharts `CartesianGrid` heatmap for best time to apply (7 days × 24h)
- Signal card: large signal_type text + analysis paragraph + "generated Xh ago"

## Styling
Tailwind CSS v4 + shadcn/ui primitives in `components/ui/`.
`cn()` helper from `lib/utils.ts` for conditional classes.

## MCPs
Figma MCP — for referencing design specs when provided

## Tools
Read · Edit · Bash · Grep · Glob
