/**
 * TDD — pulse router tests.
 *
 * Covers:
 * 1. Dedup — same (source, externalId) never inserts twice
 * 2. Dismiss — getFeed excludes dismissed items
 * 3. Interact upsert — second action overwrites first (saved → dismissed)
 * 4. getFeed excludes items from other users' dismissals
 * 5. getStats counts exclude dismissed items
 *
 * Uses in-memory mock stores — no real DB.
 */

import { describe, it, expect, beforeEach } from 'vitest';

// ── In-memory stores ──────────────────────────────────────────────────────────

interface MockPulseItem {
  id: string;
  source: string;
  externalId: string;
  category: 'tech_update' | 'layoff' | 'market_change' | 'funding' | 'ipo';
  title: string;
  url: string;
  summaryRaw: string;
  summaryAi: string | null;
  company: string | null;
  tags: string[];
  publishedAt: Date | null;
}

interface MockInteraction {
  id: string;
  userId: string;
  pulseItemId: string;
  action: 'dismissed' | 'saved' | 'shared';
}

let itemStore: MockPulseItem[] = [];
let interactionStore: MockInteraction[] = [];

// ── Logic extracted for unit testing ─────────────────────────────────────────

/** Dedup insert — mirrors onConflictDoNothing on (source, externalId) */
function insertItemIfNew(item: Omit<MockPulseItem, 'id'>): boolean {
  const exists = itemStore.some(
    (i) => i.source === item.source && i.externalId === item.externalId
  );
  if (exists) return false;
  itemStore.push({ ...item, id: `item-${itemStore.length + 1}` });
  return true;
}

/** getFeed logic — excludes dismissed items for a user */
function getFeed(userId: string, category: MockPulseItem['category'], limit = 20): MockPulseItem[] {
  const dismissedIds = interactionStore
    .filter((i) => i.userId === userId && i.action === 'dismissed')
    .map((i) => i.pulseItemId);

  return itemStore
    .filter((item) => item.category === category && !dismissedIds.includes(item.id))
    .slice(0, limit);
}

/** interact upsert — mirrors onConflictDoUpdate on (userId, pulseItemId) */
function upsertInteraction(userId: string, pulseItemId: string, action: MockInteraction['action']): void {
  const existing = interactionStore.findIndex(
    (i) => i.userId === userId && i.pulseItemId === pulseItemId
  );
  if (existing !== -1) {
    interactionStore[existing]!.action = action;
  } else {
    interactionStore.push({ id: `int-${interactionStore.length + 1}`, userId, pulseItemId, action });
  }
}

/** getStats — count per category, excluding dismissed */
function getStats(userId: string): Record<string, number> {
  const dismissedIds = interactionStore
    .filter((i) => i.userId === userId && i.action === 'dismissed')
    .map((i) => i.pulseItemId);

  const counts: Record<string, number> = {};
  for (const item of itemStore) {
    if (dismissedIds.includes(item.id)) continue;
    counts[item.category] = (counts[item.category] ?? 0) + 1;
  }
  return counts;
}

// ── Test fixtures ─────────────────────────────────────────────────────────────

function makeItem(overrides: Partial<MockPulseItem> = {}): Omit<MockPulseItem, 'id'> {
  return {
    source: 'hn',
    externalId: `ext-${Math.random()}`,
    category: 'tech_update',
    title: 'Test pulse item',
    url: 'https://example.com',
    summaryRaw: 'Raw summary text.',
    summaryAi: null,
    company: null,
    tags: ['test'],
    publishedAt: new Date(),
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('pulse dedup', () => {
  beforeEach(() => {
    itemStore = [];
    interactionStore = [];
  });

  it('inserts a new item', () => {
    const inserted = insertItemIfNew(makeItem({ source: 'hn', externalId: 'abc-123' }));
    expect(inserted).toBe(true);
    expect(itemStore).toHaveLength(1);
  });

  it('skips duplicate (source, externalId)', () => {
    insertItemIfNew(makeItem({ source: 'hn', externalId: 'abc-123' }));
    const second = insertItemIfNew(makeItem({ source: 'hn', externalId: 'abc-123', title: 'Different title' }));
    expect(second).toBe(false);
    expect(itemStore).toHaveLength(1);
  });

  it('allows same externalId from different sources', () => {
    insertItemIfNew(makeItem({ source: 'hn', externalId: '999' }));
    const second = insertItemIfNew(makeItem({ source: 'devto', externalId: '999' }));
    expect(second).toBe(true);
    expect(itemStore).toHaveLength(2);
  });

  it('allows different externalIds from same source', () => {
    insertItemIfNew(makeItem({ source: 'hn', externalId: 'a1' }));
    insertItemIfNew(makeItem({ source: 'hn', externalId: 'a2' }));
    expect(itemStore).toHaveLength(2);
  });
});

describe('pulse getFeed + dismiss', () => {
  beforeEach(() => {
    itemStore = [];
    interactionStore = [];
  });

  it('returns items for the requested category', () => {
    insertItemIfNew(makeItem({ category: 'tech_update', externalId: 'tu-1' }));
    insertItemIfNew(makeItem({ category: 'layoff', externalId: 'l-1' }));

    const feed = getFeed('user-1', 'tech_update');
    expect(feed).toHaveLength(1);
    expect(feed[0]!.category).toBe('tech_update');
  });

  it('excludes items the user dismissed', () => {
    insertItemIfNew(makeItem({ category: 'tech_update', externalId: 'tu-1' }));
    insertItemIfNew(makeItem({ category: 'tech_update', externalId: 'tu-2' }));

    const dismissedId = itemStore[0]!.id;
    upsertInteraction('user-1', dismissedId, 'dismissed');

    const feed = getFeed('user-1', 'tech_update');
    expect(feed).toHaveLength(1);
    expect(feed[0]!.id).not.toBe(dismissedId);
  });

  it('does not exclude items another user dismissed', () => {
    insertItemIfNew(makeItem({ category: 'layoff', externalId: 'l-1' }));
    upsertInteraction('user-2', itemStore[0]!.id, 'dismissed');

    const feed = getFeed('user-1', 'layoff');
    expect(feed).toHaveLength(1);
  });

  it('shows all items when user has no interactions', () => {
    insertItemIfNew(makeItem({ category: 'funding', externalId: 'f-1' }));
    insertItemIfNew(makeItem({ category: 'funding', externalId: 'f-2' }));

    expect(getFeed('user-1', 'funding')).toHaveLength(2);
  });
});

describe('pulse interact upsert', () => {
  beforeEach(() => {
    itemStore = [];
    interactionStore = [];
  });

  it('creates new interaction on first call', () => {
    upsertInteraction('user-1', 'item-abc', 'saved');
    expect(interactionStore).toHaveLength(1);
    expect(interactionStore[0]!.action).toBe('saved');
  });

  it('overwrites action on second call (saved → dismissed)', () => {
    upsertInteraction('user-1', 'item-abc', 'saved');
    upsertInteraction('user-1', 'item-abc', 'dismissed');
    expect(interactionStore).toHaveLength(1);
    expect(interactionStore[0]!.action).toBe('dismissed');
  });

  it('different users get separate interaction rows', () => {
    upsertInteraction('user-1', 'item-abc', 'saved');
    upsertInteraction('user-2', 'item-abc', 'dismissed');
    expect(interactionStore).toHaveLength(2);
  });

  it('same user, different items get separate rows', () => {
    upsertInteraction('user-1', 'item-1', 'saved');
    upsertInteraction('user-1', 'item-2', 'saved');
    expect(interactionStore).toHaveLength(2);
  });
});

describe('pulse getStats', () => {
  beforeEach(() => {
    itemStore = [];
    interactionStore = [];
  });

  it('counts items per category', () => {
    insertItemIfNew(makeItem({ category: 'tech_update', externalId: 'tu-1' }));
    insertItemIfNew(makeItem({ category: 'tech_update', externalId: 'tu-2' }));
    insertItemIfNew(makeItem({ category: 'layoff', externalId: 'l-1' }));

    const stats = getStats('user-1');
    expect(stats['tech_update']).toBe(2);
    expect(stats['layoff']).toBe(1);
  });

  it('excludes dismissed items from counts', () => {
    insertItemIfNew(makeItem({ category: 'funding', externalId: 'f-1' }));
    insertItemIfNew(makeItem({ category: 'funding', externalId: 'f-2' }));
    upsertInteraction('user-1', itemStore[0]!.id, 'dismissed');

    const stats = getStats('user-1');
    expect(stats['funding']).toBe(1);
  });

  it('saved items still count (only dismissed excluded)', () => {
    insertItemIfNew(makeItem({ category: 'market_change', externalId: 'mc-1' }));
    upsertInteraction('user-1', itemStore[0]!.id, 'saved');

    const stats = getStats('user-1');
    expect(stats['market_change']).toBe(1);
  });
});
