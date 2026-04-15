/**
 * TDD — WoroScoreBadge tests written before final component polish.
 *
 * Critical render states:
 *   null  → loading skeleton (async pending — must NOT show "0" or any score)
 *   < 40  → red badge + "Suspicious"
 *   40–70 → amber badge + "Verify"
 *   > 70  → green badge + "Looks legit"
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WoroScoreBadge } from './WoroScoreBadge';

describe('WoroScoreBadge', () => {
  describe('null score (unscored — async pending)', () => {
    it('renders without showing any number', () => {
      render(<WoroScoreBadge score={null} />);
      expect(screen.queryByText('0')).toBeNull();
      expect(screen.queryByText('null')).toBeNull();
    });

    it('does not show any tier label', () => {
      render(<WoroScoreBadge score={null} />);
      expect(screen.queryByText('Suspicious')).toBeNull();
      expect(screen.queryByText('Verify')).toBeNull();
      expect(screen.queryByText('Looks legit')).toBeNull();
    });
  });

  describe('red tier (score < 40)', () => {
    it('shows the score number', () => {
      render(<WoroScoreBadge score={18} showLabel />);
      expect(screen.getByText('18')).toBeTruthy();
    });

    it('shows "Suspicious" label when showLabel=true', () => {
      render(<WoroScoreBadge score={18} showLabel />);
      expect(screen.getByText('Suspicious')).toBeTruthy();
    });

    it('applies red colour classes', () => {
      const { container } = render(<WoroScoreBadge score={18} />);
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain('red');
    });

    it('renders at score=0', () => {
      render(<WoroScoreBadge score={0} showLabel />);
      expect(screen.getByText('0')).toBeTruthy();
      expect(screen.getByText('Suspicious')).toBeTruthy();
    });

    it('renders at score=39 (boundary)', () => {
      render(<WoroScoreBadge score={39} showLabel />);
      expect(screen.getByText('Suspicious')).toBeTruthy();
    });
  });

  describe('amber tier (score 40–70)', () => {
    it('shows "Verify" label', () => {
      render(<WoroScoreBadge score={55} showLabel />);
      expect(screen.getByText('Verify')).toBeTruthy();
    });

    it('applies amber colour classes', () => {
      const { container } = render(<WoroScoreBadge score={55} />);
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain('amber');
    });

    it('renders at score=40 (lower boundary)', () => {
      render(<WoroScoreBadge score={40} showLabel />);
      expect(screen.getByText('Verify')).toBeTruthy();
    });

    it('renders at score=70 (upper boundary)', () => {
      render(<WoroScoreBadge score={70} showLabel />);
      expect(screen.getByText('Verify')).toBeTruthy();
    });
  });

  describe('green tier (score > 70)', () => {
    it('shows "Looks legit" label', () => {
      render(<WoroScoreBadge score={85} showLabel />);
      expect(screen.getByText('Looks legit')).toBeTruthy();
    });

    it('applies green colour classes', () => {
      const { container } = render(<WoroScoreBadge score={85} />);
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain('green');
    });

    it('renders at score=71 (boundary)', () => {
      render(<WoroScoreBadge score={71} showLabel />);
      expect(screen.getByText('Looks legit')).toBeTruthy();
    });

    it('renders at score=100', () => {
      render(<WoroScoreBadge score={100} showLabel />);
      expect(screen.getByText('100')).toBeTruthy();
      expect(screen.getByText('Looks legit')).toBeTruthy();
    });
  });

  describe('tooltip with signals', () => {
    const signals = {
      fake_job_score: 85,
      jd_quality_score: 78,
      company_legitimacy_score: 80,
      has_vague_language: false,
      has_copy_paste_patterns: false,
      has_glassdoor_presence: true,
      explanation: 'Detailed JD, real company.',
    };

    it('shows explanation text in tooltip', () => {
      render(<WoroScoreBadge score={82} signals={signals} />);
      expect(screen.getByTitle('Detailed JD, real company.')).toBeTruthy();
    });
  });
});
