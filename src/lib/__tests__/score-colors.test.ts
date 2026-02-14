import { describe, it, expect } from 'vitest';
import { getScoreColor, getGradeLabel } from '@/lib/score-colors';

describe('getScoreColor', () => {
  it('returns emerald for >= 94', () => {
    expect(getScoreColor(94).text).toBe('text-emerald-600');
    expect(getScoreColor(100).text).toBe('text-emerald-600');
  });

  it('returns primary for 91-93', () => {
    expect(getScoreColor(91).text).toBe('text-primary');
    expect(getScoreColor(93).text).toBe('text-primary');
  });

  it('returns amber for 80-90', () => {
    expect(getScoreColor(80).text).toBe('text-amber-600');
    expect(getScoreColor(90).text).toBe('text-amber-600');
  });

  it('returns red for < 80', () => {
    expect(getScoreColor(79).text).toBe('text-red-600');
    expect(getScoreColor(0).text).toBe('text-red-600');
  });

  it('returns muted fallback for NaN', () => {
    expect(getScoreColor(NaN).text).toBe('text-muted-foreground');
  });

  it('returns muted fallback for negative', () => {
    expect(getScoreColor(-5).text).toBe('text-muted-foreground');
  });

  it('returns muted fallback for Infinity', () => {
    expect(getScoreColor(Infinity).text).toBe('text-muted-foreground');
  });
});

describe('getGradeLabel', () => {
  it('returns Outstanding for >= 98', () => {
    expect(getGradeLabel(98)).toBe('Outstanding');
    expect(getGradeLabel(100)).toBe('Outstanding');
  });

  it('returns Great for 94-97', () => {
    expect(getGradeLabel(94)).toBe('Great');
    expect(getGradeLabel(97)).toBe('Great');
  });

  it('returns Very Good for 91-93', () => {
    expect(getGradeLabel(91)).toBe('Very Good');
  });

  it('returns Needs Improvement for 80-90', () => {
    expect(getGradeLabel(80)).toBe('Needs Improvement');
  });

  it('returns Critical for < 80', () => {
    expect(getGradeLabel(79)).toBe('Critical');
  });

  it('returns N/A for NaN', () => {
    expect(getGradeLabel(NaN)).toBe('N/A');
  });
});
