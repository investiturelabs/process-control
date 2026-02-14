import { describe, it, expect } from 'vitest';
import { getDateCutoff, DATE_RANGE_LABELS } from '@/lib/date-utils';

describe('getDateCutoff', () => {
  it('returns null for "all"', () => {
    expect(getDateCutoff('all')).toBeNull();
  });

  it('returns a date ~30 days ago for "30d"', () => {
    const cutoff = getDateCutoff('30d')!;
    const diff = Date.now() - cutoff.getTime();
    const days = diff / (1000 * 60 * 60 * 24);
    expect(days).toBeGreaterThanOrEqual(29);
    expect(days).toBeLessThanOrEqual(31);
  });

  it('returns a date ~90 days ago for "90d"', () => {
    const cutoff = getDateCutoff('90d')!;
    const diff = Date.now() - cutoff.getTime();
    const days = diff / (1000 * 60 * 60 * 24);
    expect(days).toBeGreaterThanOrEqual(89);
    expect(days).toBeLessThanOrEqual(92);
  });

  it('returns a date ~6 months ago for "6m"', () => {
    const cutoff = getDateCutoff('6m')!;
    const diff = Date.now() - cutoff.getTime();
    const days = diff / (1000 * 60 * 60 * 24);
    expect(days).toBeGreaterThanOrEqual(150);
    expect(days).toBeLessThanOrEqual(200);
  });

  it('returns a date ~1 year ago for "1y"', () => {
    const cutoff = getDateCutoff('1y')!;
    const diff = Date.now() - cutoff.getTime();
    const days = diff / (1000 * 60 * 60 * 24);
    expect(days).toBeGreaterThanOrEqual(360);
    expect(days).toBeLessThanOrEqual(370);
  });
});

describe('DATE_RANGE_LABELS', () => {
  it('has labels for all ranges', () => {
    expect(DATE_RANGE_LABELS['30d']).toBe('30 days');
    expect(DATE_RANGE_LABELS['all']).toBe('All time');
  });
});
