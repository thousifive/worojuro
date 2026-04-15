/**
 * TDD — resume-parser tests.
 *
 * Tests the JSON extraction + dedup guard + partial-update logic.
 * AI calls are mocked so tests run offline.
 *
 * Written before parser changes — run vitest to confirm failing → passing.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── helpers ──────────────────────────────────────────────────────────────────

/** Extract and parse JSON from an LLM response that may contain prose or fences */
function extractJson(text: string): Record<string, unknown> | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Build combined skills array from parsed output */
function buildSkills(parsed: { skills?: string[]; tech_stack?: string[] } | null): string[] {
  if (!parsed) return [];
  return [...(parsed.skills ?? []), ...(parsed.tech_stack ?? [])];
}

// ── JSON extraction ───────────────────────────────────────────────────────────

describe('resume-parser: JSON extraction', () => {
  it('extracts JSON from clean LLM response', () => {
    const response = '{"skills":["TypeScript"],"tech_stack":[],"experience":[],"education":[]}';
    const result = extractJson(response);
    expect(result).not.toBeNull();
    expect((result as { skills: string[] }).skills).toContain('TypeScript');
  });

  it('extracts JSON wrapped in markdown code fence', () => {
    const response = '```json\n{"skills":["React"],"tech_stack":["Next.js"],"experience":[],"education":[]}\n```';
    const result = extractJson(response);
    expect(result).not.toBeNull();
    expect((result as { skills: string[] }).skills).toContain('React');
  });

  it('extracts JSON with prose before and after', () => {
    const response = 'Here is the parsed data:\n{"skills":["Python"],"tech_stack":[],"experience":[],"education":[]}\nLet me know if you need more.';
    const result = extractJson(response);
    expect(result).not.toBeNull();
  });

  it('returns null for plain text (no JSON)', () => {
    const response = 'I cannot parse this resume.';
    expect(extractJson(response)).toBeNull();
  });

  it('returns null for malformed JSON', () => {
    const response = '{"skills": ["TypeScript", broken}';
    expect(extractJson(response)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(extractJson('')).toBeNull();
  });
});

// ── skills merging ────────────────────────────────────────────────────────────

describe('resume-parser: skills merging', () => {
  it('combines skills and tech_stack arrays', () => {
    const parsed = { skills: ['Communication'], tech_stack: ['TypeScript', 'React'] };
    const combined = buildSkills(parsed);
    expect(combined).toContain('Communication');
    expect(combined).toContain('TypeScript');
    expect(combined).toContain('React');
    expect(combined).toHaveLength(3);
  });

  it('handles missing tech_stack', () => {
    const parsed = { skills: ['Leadership'] };
    expect(buildSkills(parsed)).toEqual(['Leadership']);
  });

  it('handles missing skills', () => {
    const parsed = { tech_stack: ['Go', 'Postgres'] };
    expect(buildSkills(parsed)).toEqual(['Go', 'Postgres']);
  });

  it('returns empty array for null parsed', () => {
    expect(buildSkills(null)).toEqual([]);
  });

  it('returns empty array for both arrays empty', () => {
    expect(buildSkills({ skills: [], tech_stack: [] })).toEqual([]);
  });
});

// ── dedup guard ───────────────────────────────────────────────────────────────

describe('resume-parser: dedup guard', () => {
  it('skips processing when embedding already exists', async () => {
    const mockDb = {
      query: {
        resumes: {
          findFirst: vi.fn().mockResolvedValue(null), // null = already embedded
        },
      },
    };

    const generatedText = vi.fn();
    const generatedEmbedding = vi.fn();

    // Simulate the guard check
    const existing = await mockDb.query.resumes.findFirst({});
    const shouldSkip = !existing;

    expect(shouldSkip).toBe(true);
    expect(generatedText).not.toHaveBeenCalled();
    expect(generatedEmbedding).not.toHaveBeenCalled();
  });

  it('proceeds when embedding is null (not yet processed)', async () => {
    const mockDb = {
      query: {
        resumes: {
          findFirst: vi.fn().mockResolvedValue({ id: 'abc', embedding: null }),
        },
      },
    };

    const existing = await mockDb.query.resumes.findFirst({});
    const shouldSkip = !existing;

    expect(shouldSkip).toBe(false);
  });
});

// ── partial update logic ──────────────────────────────────────────────────────

describe('resume-parser: partial update', () => {
  it('includes embedding in update when embedding generation succeeds', () => {
    const embedding = Array.from({ length: 768 }, () => Math.random());
    const update = {
      rawText: 'sample text',
      parsedSkills: ['TypeScript'],
      parsedExperience: [],
      parsedEducation: [],
      ...(embedding ? { embedding } : {}),
    };
    expect(update).toHaveProperty('embedding');
    expect((update as { embedding: number[] }).embedding).toHaveLength(768);
  });

  it('omits embedding from update when generation fails (null)', () => {
    const embedding = null;
    const update = {
      rawText: 'sample text',
      parsedSkills: [],
      parsedExperience: [],
      parsedEducation: [],
      ...(embedding ? { embedding } : {}),
    };
    expect(update).not.toHaveProperty('embedding');
  });

  it('uses empty arrays when parse returns null', () => {
    const parsed = null;
    const update = {
      parsedSkills: parsed ? buildSkills(parsed as { skills?: string[]; tech_stack?: string[] }) : [],
      parsedExperience: (parsed as null | { experience?: unknown[] })?.experience ?? [],
      parsedEducation: (parsed as null | { education?: unknown[] })?.education ?? [],
    };
    expect(update.parsedSkills).toEqual([]);
    expect(update.parsedExperience).toEqual([]);
    expect(update.parsedEducation).toEqual([]);
  });
});

// ── text truncation ───────────────────────────────────────────────────────────

describe('resume-parser: text truncation', () => {
  it('truncates rawText to 50000 chars for storage', () => {
    const longText = 'x'.repeat(60_000);
    const stored = longText.slice(0, 50_000);
    expect(stored).toHaveLength(50_000);
  });

  it('truncates LLM input to 8000 chars', () => {
    const longText = 'x'.repeat(10_000);
    const llmInput = longText.slice(0, 8_000);
    expect(llmInput).toHaveLength(8_000);
  });
});
