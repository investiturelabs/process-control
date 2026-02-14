import { describe, it, expect } from 'vitest';
import { getFirstName, computePartialPoints } from '@/lib/utils';

describe('getFirstName', () => {
  it('returns empty string for null', () => {
    expect(getFirstName(null)).toBe('');
  });

  it('returns empty string for missing name', () => {
    expect(getFirstName({})).toBe('');
  });

  it('returns first name from full name', () => {
    expect(getFirstName({ name: 'Jane Smith' })).toBe('Jane');
  });

  it('returns single name as-is', () => {
    expect(getFirstName({ name: 'Jane' })).toBe('Jane');
  });

  it('handles multi-word names', () => {
    expect(getFirstName({ name: 'Mary Jane Watson' })).toBe('Mary');
  });
});

describe('computePartialPoints', () => {
  it('returns floor of half for even numbers', () => {
    expect(computePartialPoints(10)).toBe(5);
  });

  it('floors correctly for odd numbers', () => {
    expect(computePartialPoints(5)).toBe(2);
    expect(computePartialPoints(3)).toBe(1);
  });

  it('returns 0 for 0', () => {
    expect(computePartialPoints(0)).toBe(0);
  });
});
