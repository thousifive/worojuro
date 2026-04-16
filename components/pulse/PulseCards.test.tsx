/**
 * TDD — Pulse card component render state tests.
 *
 * Covers:
 * - PulseCard: summary_ai null → shows summary_raw; summary_ai set → shows AI badge
 * - FundingCard: isFavoriteCompany=true → "Now hiring likely" badge visible
 * - FundingCard: isFavoriteCompany=false → badge absent
 * - LayoffCard: hiringFromLayoff=true → hiring chip visible
 * - LayoffCard: hiringFromLayoff=false → chip absent
 * - All cards: dismiss + save buttons fire callbacks
 * - All cards: render without crashing when optional props are omitted
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PulseCard } from './PulseCard';
import { FundingCard } from './FundingCard';
import { LayoffCard } from './LayoffCard';
import type { PulseItem } from '@/types';

// ── Shared fixture ────────────────────────────────────────────────────────────

function makeItem(overrides: Partial<PulseItem> = {}): PulseItem {
  return {
    id: 'item-1',
    source: 'hn',
    external_id: 'hn-123',
    category: 'tech_update',
    title: 'React 20 released with new compiler',
    url: 'https://example.com/react-20',
    summary_raw: 'React 20 improves performance by 40% using the new Forget compiler.',
    summary_ai: null,
    company: null,
    tags: ['react', 'frontend'],
    relevance_score: 75,
    published_at: new Date('2026-04-01'),
    ingested_at: new Date('2026-04-01'),
    ...overrides,
  };
}

// ── PulseCard ─────────────────────────────────────────────────────────────────

describe('PulseCard', () => {
  it('renders title', () => {
    render(<PulseCard item={makeItem()} />);
    expect(screen.getByText('React 20 released with new compiler')).toBeTruthy();
  });

  it('shows summary_raw when summary_ai is null', () => {
    render(<PulseCard item={makeItem({ summary_ai: null, summary_raw: 'Raw summary text.' })} />);
    expect(screen.getByText(/Raw summary text/)).toBeTruthy();
  });

  it('shows summary_ai text when set', () => {
    render(<PulseCard item={makeItem({ summary_ai: 'AI generated summary.', summary_raw: 'Raw.' })} />);
    expect(screen.getByText(/AI generated summary/)).toBeTruthy();
  });

  it('shows AI badge when summary_ai is set', () => {
    render(<PulseCard item={makeItem({ summary_ai: 'AI summary.' })} />);
    const aiBadges = screen.getAllByText('AI');
    expect(aiBadges.length).toBeGreaterThan(0);
  });

  it('does not show AI badge when summary_ai is null', () => {
    render(<PulseCard item={makeItem({ summary_ai: null })} />);
    // AI badge is inside a specific span — check it's absent
    expect(screen.queryByText('AI')).toBeNull();
  });

  it('renders tags', () => {
    render(<PulseCard item={makeItem({ tags: ['react', 'frontend'] })} />);
    expect(screen.getByText('react')).toBeTruthy();
    expect(screen.getByText('frontend')).toBeTruthy();
  });

  it('fires onDismiss when dismiss button clicked', () => {
    const onDismiss = vi.fn();
    render(<PulseCard item={makeItem()} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByTitle('Dismiss'));
    expect(onDismiss).toHaveBeenCalledWith('item-1');
  });

  it('fires onSave when save button clicked', () => {
    const onSave = vi.fn();
    render(<PulseCard item={makeItem()} onSave={onSave} />);
    fireEvent.click(screen.getByTitle('Save'));
    expect(onSave).toHaveBeenCalledWith('item-1');
  });

  it('renders without crashing when no callbacks provided', () => {
    expect(() => render(<PulseCard item={makeItem()} />)).not.toThrow();
  });
});

// ── FundingCard ───────────────────────────────────────────────────────────────

describe('FundingCard', () => {
  const fundingItem = makeItem({ category: 'funding', company: 'Stripe' });

  it('shows "Funding" badge for funding category', () => {
    render(<FundingCard item={fundingItem} />);
    expect(screen.getByText('Funding')).toBeTruthy();
  });

  it('shows "IPO" badge for ipo category', () => {
    render(<FundingCard item={makeItem({ category: 'ipo' })} />);
    expect(screen.getByText('IPO')).toBeTruthy();
  });

  it('shows "Now hiring likely" badge when isFavoriteCompany=true', () => {
    render(<FundingCard item={fundingItem} isFavoriteCompany={true} />);
    expect(screen.getByText('Now hiring likely')).toBeTruthy();
  });

  it('does NOT show "Now hiring likely" when isFavoriteCompany=false', () => {
    render(<FundingCard item={fundingItem} isFavoriteCompany={false} />);
    expect(screen.queryByText('Now hiring likely')).toBeNull();
  });

  it('does NOT show "Now hiring likely" when isFavoriteCompany is undefined', () => {
    render(<FundingCard item={fundingItem} />);
    expect(screen.queryByText('Now hiring likely')).toBeNull();
  });

  it('shows AI badge when summary_ai is set', () => {
    render(<FundingCard item={makeItem({ category: 'funding', summary_ai: 'Stripe raised $1B.' })} />);
    expect(screen.getByText('AI')).toBeTruthy();
  });

  it('fires onDismiss with correct id', () => {
    const onDismiss = vi.fn();
    render(<FundingCard item={fundingItem} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByTitle('Dismiss'));
    expect(onDismiss).toHaveBeenCalledWith('item-1');
  });

  it('fires onSave with correct id', () => {
    const onSave = vi.fn();
    render(<FundingCard item={fundingItem} onSave={onSave} />);
    fireEvent.click(screen.getByTitle('Save'));
    expect(onSave).toHaveBeenCalledWith('item-1');
  });
});

// ── LayoffCard ────────────────────────────────────────────────────────────────

describe('LayoffCard', () => {
  const layoffItem = makeItem({ category: 'layoff', company: 'BigCorp' });

  it('shows "Layoff" badge', () => {
    render(<LayoffCard item={layoffItem} />);
    expect(screen.getByText('Layoff')).toBeTruthy();
  });

  it('shows "Companies hiring from this layoff" chip when hiringFromLayoff=true', () => {
    render(<LayoffCard item={layoffItem} hiringFromLayoff={true} />);
    expect(screen.getByText('Companies hiring from this layoff')).toBeTruthy();
  });

  it('does NOT show hiring chip when hiringFromLayoff=false', () => {
    render(<LayoffCard item={layoffItem} hiringFromLayoff={false} />);
    expect(screen.queryByText('Companies hiring from this layoff')).toBeNull();
  });

  it('does NOT show hiring chip when hiringFromLayoff is undefined', () => {
    render(<LayoffCard item={layoffItem} />);
    expect(screen.queryByText('Companies hiring from this layoff')).toBeNull();
  });

  it('shows company name', () => {
    render(<LayoffCard item={layoffItem} />);
    expect(screen.getByText(/BigCorp/)).toBeTruthy();
  });

  it('shows AI badge when summary_ai is set', () => {
    render(<LayoffCard item={makeItem({ category: 'layoff', summary_ai: 'AI summary of layoff.' })} />);
    expect(screen.getByText('AI')).toBeTruthy();
  });

  it('fires onDismiss with correct id', () => {
    const onDismiss = vi.fn();
    render(<LayoffCard item={layoffItem} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByTitle('Dismiss'));
    expect(onDismiss).toHaveBeenCalledWith('item-1');
  });

  it('fires onSave with correct id', () => {
    const onSave = vi.fn();
    render(<LayoffCard item={layoffItem} onSave={onSave} />);
    fireEvent.click(screen.getByTitle('Save'));
    expect(onSave).toHaveBeenCalledWith('item-1');
  });

  it('renders without crashing when no callbacks provided', () => {
    expect(() => render(<LayoffCard item={layoffItem} />)).not.toThrow();
  });
});
