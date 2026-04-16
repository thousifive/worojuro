# Worojuro — Product Strategy & Competitive Evaluation

**Author:** Strategist agent  
**Date:** 2026-04-16  
**Scope:** Idea validation · Competitive positioning · SWOT · Revenue roadmap

---

## 1. Idea Validation

### The real problem

Job seekers waste enormous time on three failure modes:

1. **Ghost jobs** — listings that have been open for months with no intention to hire. Estimated 20–40% of all listings on major boards are ghost posts (used for pipeline building, legal compliance, or abandoned requisitions). The candidate has no way to know.
2. **Poor signal-to-noise** — job boards return hundreds of results. Without personalised scoring, the candidate applies broadly and scatters effort.
3. **Process chaos** — tracking applications across Google Sheets, email, and memory leads to missed follow-ups, forgotten referrals, and zero pattern recognition across the search.

### Does Worojuro solve these?

| Pain | How Worojuro addresses it | Confidence |
|---|---|---|
| Ghost jobs | Woro score flags suspicious listings (repost age, JD vagueness, domain signals) | High — this is the core differentiator |
| Low signal feed | Vector similarity match score against real resume + preference filters | High — working in Phase 1 |
| Tracking chaos | Kanban tracker + apply confirm flow (no false-applied state) | High — working in Phase 1 |
| Referral blindness | LinkedIn CSV → chips on every card | Medium — depends on user importing CSV |
| Market context | Pulse feed (layoffs, funding, market signals) | Medium — pulse data quality varies by source |

**Verdict: Validated.** The ghost job problem alone is underserved. No current tool scores listing legitimacy. The founder is the exact target user — a software engineer doing an active job search who is frustrated by the noise.

---

## 2. Competitive Landscape

### Tier 1 — Direct competitors (tracker + feed)

| Product | Core strength | Ghost job detection | AI match score | Market pulse | Referral finder | Price |
|---|---|---|---|---|---|---|
| **Teal** | Resume builder + ATS keywords + tracker | ✗ | ✗ (keyword only) | ✗ | ✗ | Free / $29/mo Pro |
| **Huntr** | Clean Kanban tracker + company notes | ✗ | ✗ | ✗ | ✗ | Free / $5/mo |
| **Simplify** | Auto-fill applications + Chrome extension | ✗ | ✗ | ✗ | ✗ | Free / $10/mo |
| **Lunchclub / Pave** | Salary benchmarking | ✗ | ✗ | Partial | ✗ | Free |
| **Worojuro** | Ghost job detection + AI-matched feed + tracker + pulse | **✓ (Woro score)** | **✓ (cosine + LLM)** | **✓ (4 tabs)** | **✓ (CSV import)** | $0 Phase 1 |

### Tier 2 — Adjacent tools

| Product | What they do well | Our overlap | Their gap |
|---|---|---|---|
| **JobScan** | ATS resume keyword optimisation | Resume parsing | Not a tracker. No live feed. |
| **LinkedIn Jobs** | Volume. Network data. | Feed aggregation | Ghost jobs everywhere. No trust score. No tracker. |
| **Layoffs.fyi** | Best layoff tracking | Pulse layoff tab | No job search integration |
| **Glassdoor** | Company reviews, salary data | Company legitimacy signal | No personal job tracker |
| **Otta / Wellfound** | Curated startup jobs | Job source | No trust score. Manually curated only. |

### Key insight

**No competitor scores listing legitimacy.** Every tool assumes the job is real. Worojuro is the only product that answers: *"Should I even bother applying to this?"* — before the user spends 45 minutes on a cover letter for a ghost post.

---

## 3. Strengths

### S1 — Woro score (unique, defensible)
Nothing like it exists. Ghost job detection using LLM signal analysis (repost age, JD quality, company legitimacy) is a novel feature in the job search space. It takes a problem everyone has felt but no one has quantified and gives it a number. **This is the headline feature.**

### S2 — Apply confirm flow (UX insight)
The two-step "Did you apply?" pattern solves a real data integrity problem: most trackers show inflated application counts because users click Apply but never complete it. Worojuro's count is accurate. Accurate data = trustworthy analytics.

### S3 — Resume-matched feed (personalised, not keyword-based)
Vector cosine similarity against the user's actual resume embedding produces a qualitatively different feed than keyword-search tools. A senior TypeScript engineer gets different results than a junior Python dev — from the same job board data. Competitors use keyword matching; we use semantic understanding.

### S4 — Market pulse integrated into job search
Knowing that your target company just had a funding round — or just laid off 400 people — while you're actively tracking an application there is genuinely useful. Teal and Huntr show none of this. Worojuro surfaces it contextually (referral chips, "Companies hiring from this layoff" badge).

### S5 — Zero-cost architecture
$0/month on Vercel Hobby + Supabase free tier means Phase 1 has no runway pressure. The founder can iterate and find product-market fit without a burn clock.

### S6 — Phase 2 ready without rewrites
Every table has `user_id` + RLS. Multi-tenancy is a config change, not a migration. This is a competitive moat for scaling: most hobby projects get stuck doing schema rewrites when they try to productise.

---

## 4. Weaknesses

### W1 — No browser extension (biggest gap)
Teal and Simplify win deals because users can save jobs from LinkedIn and company career pages without leaving the tab. Worojuro requires manual ingestion via cron. Users who find a job on LinkedIn have no way to pull it into Worojuro without copy-pasting. **This is the #1 churn risk.**

### W2 — Limited job source volume
5 sources (Remotive, Jobicy, RemoteOK, Adzuna, HN Algolia) vs LinkedIn's millions. The feed is only as good as what gets ingested. Remote-first roles are well covered; enterprise / on-site roles are underrepresented.

### W3 — Woro score accuracy is LLM-dependent
A hallucinating Ollama instance (or a confused Haiku call) can mis-score a legitimate job as suspicious or miss a ghost post entirely. No ground truth feedback loop yet. Users have no way to report a wrong score.

### W4 — No resume builder
JobScan and Teal own the "optimise my resume for this JD" use case. Worojuro parses the resume but doesn't help improve it. Users who need resume help will use a second tool.

### W5 — Referral import is manual friction
LinkedIn CSV export is a 6-step process most users won't complete. A Chrome extension that reads LinkedIn connections directly would have 10× the adoption.

### W6 — Single user only (Phase 1)
A recruiter, career coach, or agency cannot use the product. The market is capped at individual job seekers until Phase 2 ships.

### W7 — No mobile experience
Job searching happens on phones. The current web app is not optimised for mobile. Candidates check notifications on mobile — the current Supabase Realtime bell is desktop-only in practice.

---

## 5. What We Can Improve (Phase 1.5 / Phase 2 priority list)

Ranked by RICE score (Worojuro dimensions):

| # | Improvement | Reach | Impact | Confidence | Effort | RICE |
|---|---|---|---|---|---|---|
| 1 | **Browser extension** (save job from any page) | High | Very high | Very high | High | **P0** |
| 2 | **Woro score feedback** (user marks score wrong) | High | High | High | Low | **P0** |
| 3 | **Mobile-responsive layout** | High | Medium | High | Medium | **P1** |
| 4 | **More job sources** (Greenhouse embed, Lever, Workday scraper) | High | High | Medium | High | **P1** |
| 5 | **Resume tailoring per JD** (AI diff: your resume vs JD requirements) | Medium | Very high | High | Medium | **P1** |
| 6 | **Interview prep** (AI generates likely questions from JD + resume) | Medium | High | High | Low | **P1** |
| 7 | **Woro score leaderboard** (which companies post the most ghost jobs) | Low | Medium | High | Low | **P2** |
| 8 | **Salary negotiation coach** (offer vs market rate, counter-offer script) | Low | Very high | Medium | Medium | **P2** |
| 9 | **LinkedIn connection direct import** (via extension, not CSV) | High | Medium | High | High | **P1** |
| 10 | **Team/agency plan** (career coach manages multiple clients) | Medium | High | Low | High | **P2** |

### The #1 improvement that unlocks everything: Browser extension

A Chrome extension that:
- Detects job listings on LinkedIn, Greenhouse, Lever, Workday, Indeed
- Adds a "Save to Worojuro" button with one click
- Pulls in the JD text directly (not scraped from a board) → better Woro score accuracy
- Shows the Woro score badge inline on LinkedIn search results

This single feature removes W1, improves W3 (richer JD = better scoring), and partially addresses W5 (connection import from LinkedIn profile pages).

---

## 6. Revenue Model & Features to Market

### Positioning statement

> **Worojuro is the only job search tool that tells you which jobs are real before you apply.**

That sentence is the marketing hook. Everything else is table stakes (tracker, feed, notifications). Lead with Woro score.

---

### Revenue tiers (Phase 2 SaaS)

#### Free tier — Hook
- Feed: up to 50 matches/week
- Woro score: visible but no full signal breakdown in tooltip
- Tracker: unlimited applications
- Pulse: latest 10 items per tab
- Referrals: up to 50 contacts

Goal: get users in, let them feel the value of the Woro score.

#### Pro — $12/month (individual)
| Feature | Why users pay |
|---|---|
| Unlimited feed matches | Power searchers exhaust free quota fast |
| Full Woro signal breakdown (tooltip) | Transparency on why a job scored red |
| Woro score feedback ("mark as wrong") | Agency over the AI |
| Resume tailoring per JD | High-intent users preparing applications |
| Interview prep (AI question generation) | High willingness-to-pay — interview anxiety is real |
| Priority ingestion (feed refreshed every 1h, not 6h) | Competitive advantage for hot markets |
| Saved searches + custom alerts | Power feature for active searchers |
| Salary negotiation coach | Very high WTP at offer stage |
| Mobile app | Convenience |

#### Team — $49/month (career coaches / agencies, up to 10 clients)
| Feature | Why coaches pay |
|---|---|
| Multi-user dashboard | Manage client pipelines in one view |
| Per-client Woro feed + tracker | Replace spreadsheets coaches send clients |
| White-label (coach's branding on reports) | Professional positioning |
| Client progress reports (weekly PDF digest) | Deliverable to justify coaching fees |
| Shared referral network across clients | Multiplies referral value |

#### Woro Score API — $99/month (job boards, HR tech)
Sell the ghost job detection engine as an API:
- Input: job title, company, JD text, posted date
- Output: woro_score (0–100) + signals JSON
- Use case: job boards want to surface "verified" listings, ATS vendors want to flag suspicious postings before they go live

This is a B2B revenue stream that doesn't require user acquisition. One contract with a mid-size job board = 100× individual subscribers.

---

### Features to market (by audience)

#### To active job seekers (primary)
1. **"Stop applying to ghost jobs"** — Woro score catches the listings no one else flags
2. **"Your feed, not everyone's feed"** — vector match to your actual resume, not keywords
3. **"Know before you apply"** — repost age, JD quality score, company legitimacy in one badge
4. **"Track what actually happened"** — apply confirm flow, overdue actions, funnel analytics

#### To career coaches (secondary)
1. **"Replace the tracking spreadsheet"** — Kanban for every client
2. **"Add AI analysis to your coaching"** — Woro score report as a deliverable
3. **"See the market your clients are applying to"** — Pulse feed gives macro context

#### To job boards / HR tech (B2B)
1. **"Ghost job score as a service"** — API access to Woro scorer
2. **"Increase listing quality"** — flag suspicious posts before they damage user trust
3. **"Reduce candidate frustration"** — verified listings get more qualified applicants

---

### Go-to-market sequence

```
Phase 1 (now)  → Founder uses it. Validates core loop.
                 Writes "I built a tool that detects ghost jobs" post.
                 Targets: HN "Show HN", Reddit r/cscareerquestions,
                           r/devops, LinkedIn.

Phase 2 (SaaS) → Launch on Product Hunt with Woro score as the hook.
                 Free tier drives signups. Pro converts at offer/interview stage.
                 Target: 1,000 MAU → 50 Pro ($600 MRR) in 90 days.

Phase 3 (B2B)  → Approach 2–3 niche job boards (Remotive, Wellfound)
                 about Woro score API integration.
                 One deal = ~$1,200 MRR.

Phase 4        → Career coach tier.
                 Target: 20 coaches × $49 = $980 MRR.
```

---

## 7. One-paragraph pitch (for marketing copy)

> Every major job board is polluted with ghost jobs — listings that have been open for months with no real intent to hire. Worojuro is the only job search tool that scores every listing for legitimacy before you apply. The **Woro score** (0–100) combines repost age, job description quality, and company signals into a single trust rating — so you spend your time on the 20% of jobs that are real, not the 80% that aren't. Add a personalised AI-matched feed, a Kanban tracker that only counts applications you actually submitted, and a market pulse that tells you which companies just raised funding (and are probably hiring) — and you have the job search tool that treats your time as the scarce resource it is.

---

*Saved to `docs/strategy-product-evaluation.md`*
