// ─── Domain enums ─────────────────────────────────────────────────────────────

export type RemoteType = 'remote' | 'hybrid' | 'onsite';

export type ApplicationStatus =
  | 'saved'
  | 'applied'
  | 'oa'
  | 'phone'
  | 'interview'
  | 'offer'
  | 'rejected'
  | 'ghosted';

export type NotificationType =
  | 'new_match'
  | 'status_reminder'
  | 'market_signal'
  | 'fake_job_alert'
  | 'digest'
  | 'pulse_alert'
  | 'woro_alert'
  | 'next_action';

export type JobSource = 'remotive' | 'jobicy' | 'remoteok' | 'adzuna' | 'hn' | 'linkedin' | 'himalayas';

export type PulseSource =
  | 'hn'
  | 'devto'
  | 'github_trending'
  | 'layoffs_fyi'
  | 'techcrunch_rss'
  | 'reddit'
  | 'crunchbase_rss'
  | 'sec_edgar';

export type PulseCategory = 'tech_update' | 'layoff' | 'market_change' | 'funding' | 'ipo';

export type PulseInteractionAction = 'dismissed' | 'saved' | 'shared';

export type MarketSignalType = 'switch_now' | 'wait' | 'market_hot' | 'market_cold';

export type WoroBadgeTier = 'red' | 'amber' | 'green';

export type DigestFrequency = 'daily' | 'weekly' | 'never';

// ─── User ─────────────────────────────────────────────────────────────────────

export interface UserPreferences {
  skills: string[];
  tech_stack: string[];
  locations: string[];
  remote_pref: RemoteType;
  salary_min: number;
  salary_currency: string;
  notify_instant_threshold: number; // min match score to trigger instant alert
  notify_digest_frequency: DigestFrequency;
  favorite_companies: string[];
  hide_woro_below: number; // default 30 — jobs below this score hidden in feed
}

// ─── Woro score ───────────────────────────────────────────────────────────────

export interface WoroSignals {
  fake_job_score: number;           // 0–100, higher = more legit
  jd_quality_score: number;         // 0–100
  company_legitimacy_score: number; // 0–100
  repost_age_days?: number;
  has_vague_language: boolean;
  has_copy_paste_patterns: boolean;
  domain_age_days?: number;
  linkedin_employee_growth?: number;
  has_glassdoor_presence: boolean;
  explanation: string;
}

/** null = unscored (async pending). Never use 0 as "unscored". */
export function getWoroBadgeTier(score: number | null): WoroBadgeTier | null {
  if (score === null) return null;
  if (score < 40) return 'red';
  if (score <= 70) return 'amber';
  return 'green';
}

export const WORO_BADGE_LABELS: Record<WoroBadgeTier, string> = {
  red: 'Suspicious',
  amber: 'Verify',
  green: 'Looks legit',
};

export const WORO_BADGE_COLORS: Record<WoroBadgeTier, string> = {
  red: 'bg-red-100 text-red-700 border-red-200',
  amber: 'bg-amber-100 text-amber-700 border-amber-200',
  green: 'bg-green-100 text-green-700 border-green-200',
};

// ─── Match scoring ────────────────────────────────────────────────────────────

export interface MatchBreakdown {
  skills_score: number;
  tech_score: number;
  salary_score: number;
  location_score: number;
  perks_score: number;
  explanation: string;
}

// ─── Jobs ─────────────────────────────────────────────────────────────────────

export interface Job {
  id: string;
  source: JobSource;
  external_id: string;
  title: string;
  company: string;
  company_domain: string | null;
  location: string | null;
  remote_type: RemoteType | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  tech_stack: string[];
  perks: string[];
  description_raw: string;
  description_cleaned: string | null;
  posted_at: Date | null;
  ingested_at: Date;
  is_active: boolean;
  woro_score: number | null;
  woro_signals: WoroSignals | null;
}

export interface JobMatch extends Job {
  match_score: number;
  match_breakdown: MatchBreakdown;
  is_dismissed: boolean;
  is_saved: boolean;
}

// ─── Applications ─────────────────────────────────────────────────────────────

export interface Application {
  id: string;
  user_id: string;
  job_id: string | null;
  company: string;
  role: string;
  jd_url: string | null;
  status: ApplicationStatus;
  applied_date: Date | null;
  salary_offered: number | null;
  location: string | null;
  remote_type: RemoteType | null;
  referral_contact_id: string | null;
  notes: string | null;
  next_action: string | null;
  next_action_date: Date | null;
  offer_details: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
}

// ─── Referrals ────────────────────────────────────────────────────────────────

export interface ReferralContact {
  id: string;
  user_id: string;
  full_name: string;
  company: string | null;
  role: string | null;
  linkedin_url: string | null;
  email: string | null;
  source: 'linkedin_csv' | 'manual';
  imported_at: Date;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  metadata: Record<string, unknown>;
  is_read: boolean;
  created_at: Date;
}

// ─── Pulse ────────────────────────────────────────────────────────────────────

export interface PulseItem {
  id: string;
  source: PulseSource;
  external_id: string;
  category: PulseCategory;
  title: string;
  url: string;
  summary_raw: string;
  summary_ai: string | null; // null = pending async AI summary
  company: string | null;
  tags: string[];
  relevance_score: number;
  published_at: Date | null;
  ingested_at: Date;
}

export interface PulseInteraction {
  id: string;
  user_id: string;
  pulse_item_id: string;
  action: PulseInteractionAction;
  created_at: Date;
}

// ─── Market signals ───────────────────────────────────────────────────────────

export interface MarketSignal {
  id: string;
  user_id: string;
  signal_type: MarketSignalType;
  analysis: string;
  data_snapshot: Record<string, unknown>;
  generated_at: Date;
}

// ─── Salary formatting ────────────────────────────────────────────────────────

export function formatSalary(
  min: number | null,
  max: number | null,
  currency = 'USD'
): string {
  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `${fmt(min)}+`;
  if (max) return `Up to ${fmt(max)}`;
  return 'Not specified';
}

// ─── Resume ───────────────────────────────────────────────────────────────────

export interface ParsedResume {
  skills: string[];
  tech_stack: string[];
  experience: Array<{
    company: string;
    role: string;
    start_date: string;
    end_date: string | null;
    description: string;
  }>;
  education: Array<{
    institution: string;
    degree: string;
    field: string;
    year: number | null;
  }>;
}
