import { describe, it, expect } from 'vitest';
import {
  sanitize,
  sanitizeEmail,
  validateLength,
  validateUrl,
  validatePoints,
  MAX_LENGTHS,
} from '../validators';

describe('sanitize', () => {
  it('trims whitespace and returns cleaned value', () => {
    expect(sanitize('  hello  ', 'test', 200)).toBe('hello');
  });

  it('throws on empty string', () => {
    expect(() => sanitize('', 'field', 200)).toThrow('field cannot be empty');
  });

  it('throws on whitespace-only string', () => {
    expect(() => sanitize('   ', 'field', 200)).toThrow('field cannot be empty');
  });

  it('throws when exceeding max length', () => {
    expect(() => sanitize('a'.repeat(201), 'name', 200)).toThrow(
      'name exceeds maximum length of 200 characters'
    );
  });

  it('accepts string at exactly max length', () => {
    const value = 'a'.repeat(200);
    expect(sanitize(value, 'name', 200)).toBe(value);
  });
});

describe('sanitizeEmail', () => {
  it('lowercases and trims email', () => {
    expect(sanitizeEmail('  Alice@Example.COM  ', 'email')).toBe('alice@example.com');
  });

  it('throws on empty email', () => {
    expect(() => sanitizeEmail('', 'email')).toThrow('email cannot be empty');
  });

  it('throws on invalid email format', () => {
    expect(() => sanitizeEmail('not-an-email', 'email')).toThrow(
      'email is not a valid email address'
    );
  });

  it('throws on email without @', () => {
    expect(() => sanitizeEmail('alice.example.com', 'email')).toThrow(
      'email is not a valid email address'
    );
  });

  it('throws on email without domain', () => {
    expect(() => sanitizeEmail('alice@', 'email')).toThrow(
      'email is not a valid email address'
    );
  });

  it('throws on email exceeding max length', () => {
    const longEmail = 'a'.repeat(246) + '@test.com';
    expect(() => sanitizeEmail(longEmail, 'email')).toThrow(
      'email exceeds maximum length of 254 characters'
    );
  });

  it('accepts valid emails', () => {
    expect(sanitizeEmail('user@domain.com', 'email')).toBe('user@domain.com');
    expect(sanitizeEmail('user+tag@domain.co.uk', 'email')).toBe('user+tag@domain.co.uk');
  });
});

describe('validateLength', () => {
  it('does not throw for valid length', () => {
    expect(() => validateLength('hello', 'field', 10)).not.toThrow();
  });

  it('throws when length exceeds max', () => {
    expect(() => validateLength('hello world', 'field', 5)).toThrow(
      'field exceeds maximum length of 5 characters'
    );
  });

  it('accepts exact max length', () => {
    expect(() => validateLength('12345', 'field', 5)).not.toThrow();
  });
});

describe('validateUrl', () => {
  it('accepts undefined', () => {
    expect(() => validateUrl(undefined, 'url')).not.toThrow();
  });

  it('accepts valid https URL', () => {
    expect(() => validateUrl('https://example.com', 'url')).not.toThrow();
  });

  it('rejects http URL', () => {
    expect(() => validateUrl('http://example.com', 'url')).toThrow(
      'url must start with https://'
    );
  });

  it('rejects non-URL string', () => {
    expect(() => validateUrl('not-a-url', 'url')).toThrow(
      'url must start with https://'
    );
  });

  it('throws when URL exceeds max length', () => {
    const longUrl = 'https://' + 'a'.repeat(2041);
    expect(() => validateUrl(longUrl, 'url')).toThrow(
      'url exceeds maximum length of 2048 characters'
    );
  });
});

describe('validatePoints', () => {
  it('accepts valid point values', () => {
    expect(() => validatePoints(10, 5, 0)).not.toThrow();
  });

  it('accepts all zeros', () => {
    expect(() => validatePoints(0, 0, 0)).not.toThrow();
  });

  it('accepts equal values', () => {
    expect(() => validatePoints(5, 5, 5)).not.toThrow();
  });

  it('rejects negative pointsYes', () => {
    expect(() => validatePoints(-1, 0, 0)).toThrow('Point values must be non-negative');
  });

  it('rejects negative pointsPartial', () => {
    expect(() => validatePoints(5, -1, 0)).toThrow('Point values must be non-negative');
  });

  it('rejects negative pointsNo', () => {
    expect(() => validatePoints(5, 3, -1)).toThrow('Point values must be non-negative');
  });

  it('rejects non-integer values', () => {
    expect(() => validatePoints(5.5, 3, 0)).toThrow('Point values must be integers');
  });

  it('rejects pointsYes < pointsPartial', () => {
    expect(() => validatePoints(3, 5, 0)).toThrow('pointsYes must be >= pointsPartial');
  });

  it('rejects pointsPartial < pointsNo', () => {
    expect(() => validatePoints(10, 3, 5)).toThrow('pointsPartial must be >= pointsNo');
  });
});

describe('MAX_LENGTHS', () => {
  it('has expected values', () => {
    expect(MAX_LENGTHS.name).toBe(200);
    expect(MAX_LENGTHS.email).toBe(254);
    expect(MAX_LENGTHS.text).toBe(2000);
    expect(MAX_LENGTHS.criteria).toBe(5000);
    expect(MAX_LENGTHS.riskCategory).toBe(200);
    expect(MAX_LENGTHS.icon).toBe(50);
    expect(MAX_LENGTHS.url).toBe(2048);
  });
});
