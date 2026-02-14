import { describe, it, expect } from 'vitest';
import { exportSessionsCsv, exportSingleAuditCsv } from '@/lib/export';

describe('export utilities', () => {
  it('exportSessionsCsv is defined', () => {
    expect(exportSessionsCsv).toBeDefined();
    expect(typeof exportSessionsCsv).toBe('function');
  });

  it('exportSingleAuditCsv is defined', () => {
    expect(exportSingleAuditCsv).toBeDefined();
    expect(typeof exportSingleAuditCsv).toBe('function');
  });
});
