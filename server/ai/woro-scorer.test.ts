/**
 * TDD — woro-scorer tests.
 *
 * Core rules:
 * 1. Score always 0–100 when AI succeeds
 * 2. Returns null (never 0) on AI failure — null means unscored
 * 3. Signals shape matches WoroSignals type
 * 4. Clamps: negative → 0, >100 → 100
 *
 * Mocks server/ai/client.ts (unified AI entry point, Ollama active).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the unified AI client — replaces Ollama/Anthropic calls
vi.mock('./client', () => ({
  generateText: vi.fn(),
}));

import { generateText } from './client';
import { scoreJob, type WoroScorerInput } from './woro-scorer';

const mockGenerateText = vi.mocked(generateText);

const mockInput: WoroScorerInput = {
  jobId: 'test-job-id',
  title: 'Senior Software Engineer',
  company: 'Acme Corp',
  companyDomain: 'acmecorp.com',
  descriptionRaw: 'We are looking for a senior engineer to build scalable systems using TypeScript and PostgreSQL...',
  postedAt: new Date('2026-04-01'),
  source: 'remotive',
};

function makeResponse(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    woro_score: 82,
    fake_job_score: 88,
    jd_quality_score: 78,
    company_legitimacy_score: 75,
    has_vague_language: false,
    has_copy_paste_patterns: false,
    has_glassdoor_presence: true,
    explanation: 'Detailed JD, real company domain, no ghost signals.',
    ...overrides,
  });
}

describe('scoreJob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('returns score in range 0–100 on success', async () => {
    mockGenerateText.mockResolvedValueOnce(makeResponse());
    const result = await scoreJob(mockInput);
    expect(result).not.toBeNull();
    expect(result!.score).toBeGreaterThanOrEqual(0);
    expect(result!.score).toBeLessThanOrEqual(100);
  });

  it('returns null (not 0) when AI call throws', async () => {
    mockGenerateText.mockRejectedValueOnce(new Error('Ollama timeout'));
    const result = await scoreJob(mockInput);
    // Critical: null means unscored. 0 means suspicious. Different semantics.
    expect(result).toBeNull();
  });

  it('returns null (not 0) when response has no valid JSON', async () => {
    mockGenerateText.mockResolvedValueOnce('Sorry, I cannot score this job.');
    const result = await scoreJob(mockInput);
    expect(result).toBeNull();
  });

  it('returns null when generateText returns null', async () => {
    mockGenerateText.mockResolvedValueOnce(null);
    const result = await scoreJob(mockInput);
    expect(result).toBeNull();
  });

  it('clamps score to 0 if AI returns negative number', async () => {
    mockGenerateText.mockResolvedValueOnce(makeResponse({ woro_score: -10 }));
    const result = await scoreJob(mockInput);
    expect(result!.score).toBe(0);
  });

  it('clamps score to 100 if AI returns > 100', async () => {
    mockGenerateText.mockResolvedValueOnce(makeResponse({ woro_score: 150 }));
    const result = await scoreJob(mockInput);
    expect(result!.score).toBe(100);
  });

  it('returns complete WoroSignals shape', async () => {
    mockGenerateText.mockResolvedValueOnce(makeResponse());
    const result = await scoreJob(mockInput);
    expect(result!.signals).toMatchObject({
      fake_job_score: expect.any(Number),
      jd_quality_score: expect.any(Number),
      company_legitimacy_score: expect.any(Number),
      has_vague_language: expect.any(Boolean),
      has_copy_paste_patterns: expect.any(Boolean),
      has_glassdoor_presence: expect.any(Boolean),
      explanation: expect.any(String),
    });
  });

  it('tier boundaries: score < 40 is red tier', async () => {
    mockGenerateText.mockResolvedValueOnce(makeResponse({ woro_score: 18 }));
    const result = await scoreJob(mockInput);
    expect(result!.score).toBe(18);
    // Visual tier logic tested in WoroScoreBadge.test.tsx — score stored raw in DB
  });

  it('parses JSON wrapped in markdown code fences', async () => {
    const fenced = '```json\n' + makeResponse({ woro_score: 75 }) + '\n```';
    mockGenerateText.mockResolvedValueOnce(fenced);
    const result = await scoreJob(mockInput);
    expect(result).not.toBeNull();
    expect(result!.score).toBe(75);
  });

  it('does not throw when called with null postedAt', async () => {
    mockGenerateText.mockResolvedValueOnce(makeResponse());
    const result = await scoreJob({ ...mockInput, postedAt: null });
    expect(result).not.toBeNull();
  });
});
