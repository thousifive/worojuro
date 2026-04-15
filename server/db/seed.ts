/**
 * Seed script for local development.
 * Run: npx tsx server/db/seed.ts
 *
 * Creates:
 *   - 1 test user (matches Supabase auth test account)
 *   - 20 sample jobs with woro scores spread across all three tiers
 *   - 5 applications across all statuses
 */

import { db, users, jobs, applications } from './index';
import { randomUUID } from 'crypto';

const TEST_USER_ID = process.env.SEED_USER_ID ?? 'replace-with-supabase-auth-uid';

const SAMPLE_JOBS = [
  // Green tier (woro_score > 70) — 8 jobs
  {
    source: 'remotive' as const,
    externalId: 'rem-001',
    title: 'Senior Full Stack Engineer',
    company: 'Stripe',
    companyDomain: 'stripe.com',
    location: 'Remote — US',
    remoteType: 'remote' as const,
    salaryMin: 180000,
    salaryMax: 240000,
    salaryCurrency: 'USD',
    techStack: ['TypeScript', 'React', 'Go', 'PostgreSQL'],
    perks: ['equity', '401k', 'health'],
    descriptionRaw: 'Build payment infrastructure used by millions of businesses...',
    woroScore: 92,
    woroSignals: {
      fake_job_score: 95,
      jd_quality_score: 90,
      company_legitimacy_score: 98,
      has_vague_language: false,
      has_copy_paste_patterns: false,
      has_glassdoor_presence: true,
      explanation: 'Well-known company, detailed JD, consistent headcount growth.',
    },
  },
  {
    source: 'jobicy' as const,
    externalId: 'job-002',
    title: 'Staff Engineer, Platform',
    company: 'Linear',
    companyDomain: 'linear.app',
    location: 'Remote — Worldwide',
    remoteType: 'remote' as const,
    salaryMin: 200000,
    salaryMax: 280000,
    salaryCurrency: 'USD',
    techStack: ['TypeScript', 'React', 'Node.js', 'PostgreSQL'],
    perks: ['equity', 'async-first'],
    descriptionRaw: 'Build the tools that ship software...',
    woroScore: 88,
    woroSignals: {
      fake_job_score: 90,
      jd_quality_score: 85,
      company_legitimacy_score: 92,
      has_vague_language: false,
      has_copy_paste_patterns: false,
      has_glassdoor_presence: true,
      explanation: 'Verified company, specific role requirements, active hiring.',
    },
  },
  // Amber tier (40–70) — 6 jobs
  {
    source: 'adzuna' as const,
    externalId: 'adz-010',
    title: 'Software Engineer II',
    company: 'Acme Corp',
    companyDomain: 'acmecorp.io',
    location: 'New York, NY',
    remoteType: 'hybrid' as const,
    salaryMin: 140000,
    salaryMax: 170000,
    salaryCurrency: 'USD',
    techStack: ['Python', 'Django', 'React'],
    perks: ['health'],
    descriptionRaw: 'Join our growing team to build exciting products...',
    woroScore: 55,
    woroSignals: {
      fake_job_score: 60,
      jd_quality_score: 50,
      company_legitimacy_score: 58,
      has_vague_language: true,
      has_copy_paste_patterns: false,
      has_glassdoor_presence: false,
      explanation: 'Vague language detected. No Glassdoor presence. Verify before applying.',
    },
  },
  // Red tier (< 40) — 6 jobs
  {
    source: 'hn' as const,
    externalId: 'hn-020',
    title: 'Senior Developer - Multiple Openings',
    company: 'TechStartup XYZ',
    companyDomain: 'techstartupxyz.net',
    location: 'Remote',
    remoteType: 'remote' as const,
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    techStack: ['JavaScript'],
    perks: [],
    descriptionRaw: 'We are looking for passionate developers to join our rockstar team and disrupt the industry with cutting-edge solutions...',
    woroScore: 18,
    woroSignals: {
      fake_job_score: 15,
      jd_quality_score: 10,
      company_legitimacy_score: 20,
      repost_age_days: 180,
      has_vague_language: true,
      has_copy_paste_patterns: true,
      has_glassdoor_presence: false,
      explanation: 'Multiple ghost signals: reposted 180 days, vague language, copy-paste patterns, no salary, no Glassdoor.',
    },
  },
] as const;

async function seed() {
  console.log('Seeding database...');

  // Upsert test user profile
  await db
    .insert(users)
    .values({
      id: TEST_USER_ID,
      email: 'founder@worojuro.dev',
      fullName: 'Worojuro Founder',
      preferences: {
        skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL'],
        tech_stack: ['Next.js', 'tRPC', 'Supabase'],
        locations: ['Remote', 'New York'],
        remote_pref: 'remote',
        salary_min: 150000,
        salary_currency: 'USD',
        notify_instant_threshold: 80,
        notify_digest_frequency: 'daily',
        favorite_companies: ['Stripe', 'Linear', 'Vercel'],
        hide_woro_below: 30,
      },
    })
    .onConflictDoNothing();

  // Insert sample jobs
  for (const job of SAMPLE_JOBS) {
    await db
      .insert(jobs)
      .values({
        id: randomUUID(),
        ...job,
        postedAt: new Date(Date.now() - Math.random() * 7 * 86400000),
      })
      .onConflictDoNothing();
  }

  // Insert sample applications across all statuses
  const statuses = ['saved', 'applied', 'phone', 'offer', 'rejected'] as const;
  for (const status of statuses) {
    await db
      .insert(applications)
      .values({
        id: randomUUID(),
        userId: TEST_USER_ID,
        company: `Company ${status}`,
        role: 'Software Engineer',
        status,
        notes: `Test application in ${status} status`,
      })
      .onConflictDoNothing();
  }

  console.log('Seed complete.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
