/**
 * TDD — pulse-summariser tests.
 *
 * Core rules:
 * 1. Returns null (graceful degradation) when AI call fails
 * 2. Trims whitespace from AI response before storing
 * 3. Passes category + title + truncated summaryRaw to AI
 * 4. Does not call DB update when AI returns null or throws
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./client', () => ({
  generateText: vi.fn(),
}));

import { generateText } from './client';
import { summarisePulseItem } from './pulse-summariser';

const mockGenerateText = vi.mocked(generateText);

// Build a mock DB where db.update() is trackable
function makeMockDb() {
  const where = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn().mockReturnValue({ where });
  const update = vi.fn().mockReturnValue({ set });
  const mockDb = {
    update,
    query: { pulseItems: { findMany: vi.fn().mockResolvedValue([]) } },
  } as unknown as Parameters<typeof summarisePulseItem>[0];
  return { mockDb, update };
}

describe('summarisePulseItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('calls generateText with category + title in message', async () => {
    mockGenerateText.mockResolvedValueOnce('Short two-sentence summary.');
    const { mockDb } = makeMockDb();

    await summarisePulseItem(mockDb, 'item-1', 'Stripe lays off 300', 'Details here.', 'layoff');

    const call = mockGenerateText.mock.calls[0];
    expect(call?.[0]).toContain('Stripe lays off 300');
    expect(call?.[0]).toContain('layoff');
  });

  it('calls db.update when AI returns a summary', async () => {
    mockGenerateText.mockResolvedValueOnce('  Two sentence result.  ');
    const { mockDb, update } = makeMockDb();

    await summarisePulseItem(mockDb, 'item-1', 'Title', 'Raw.', 'tech_update');

    expect(update).toHaveBeenCalled();
  });

  it('does not update DB when AI returns null', async () => {
    mockGenerateText.mockResolvedValueOnce(null);
    const { mockDb, update } = makeMockDb();

    await summarisePulseItem(mockDb, 'item-1', 'Title', 'Raw.', 'tech_update');

    expect(update).not.toHaveBeenCalled();
  });

  it('does not throw when AI call rejects (graceful degradation)', async () => {
    mockGenerateText.mockRejectedValueOnce(new Error('Ollama timeout'));
    const { mockDb } = makeMockDb();

    await expect(
      summarisePulseItem(mockDb, 'item-1', 'Title', 'Raw.', 'market_change')
    ).resolves.toBeUndefined();
  });

  it('does not update DB when AI call throws', async () => {
    mockGenerateText.mockRejectedValueOnce(new Error('Network error'));
    const { mockDb, update } = makeMockDb();

    await summarisePulseItem(mockDb, 'item-1', 'Title', 'Raw.', 'funding');

    expect(update).not.toHaveBeenCalled();
  });

  it('truncates summaryRaw to 1500 chars before sending to AI', async () => {
    mockGenerateText.mockResolvedValueOnce('Summary.');
    const { mockDb } = makeMockDb();
    const longRaw = 'x'.repeat(3000);

    await summarisePulseItem(mockDb, 'item-1', 'Title', longRaw, 'tech_update');

    const prompt = mockGenerateText.mock.calls[0]?.[0] as string;
    const xCount = (prompt.match(/x/g) ?? []).length;
    expect(xCount).toBeLessThanOrEqual(1500);
  });
});
