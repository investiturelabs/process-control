import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportSessionsCsv, exportSingleAuditCsv, exportQuestionsCsv } from '@/lib/export';
import type { Department } from '@/types';

describe('export utilities', () => {
  it('exportSessionsCsv is defined', () => {
    expect(exportSessionsCsv).toBeDefined();
    expect(typeof exportSessionsCsv).toBe('function');
  });

  it('exportSingleAuditCsv is defined', () => {
    expect(exportSingleAuditCsv).toBeDefined();
    expect(typeof exportSingleAuditCsv).toBe('function');
  });

  describe('exportQuestionsCsv', () => {
    let clickSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      clickSpy = vi.fn();
      vi.spyOn(document, 'createElement').mockReturnValue({
        set href(_: string) {},
        set download(_: string) {},
        click: clickSpy,
      } as unknown as HTMLAnchorElement);
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    });

    const depts: Department[] = [
      {
        id: 'd1',
        name: 'Bakery',
        icon: 'Building2',
        questions: [
          { id: 'q1', departmentId: 'd1', riskCategory: 'Safety', text: 'Q1', criteria: 'C1', answerType: 'yes_no', pointsYes: 5, pointsPartial: 0, pointsNo: 0 },
          { id: 'q2', departmentId: 'd1', riskCategory: 'Hygiene', text: 'Q2', criteria: '', answerType: 'yes_no_partial', pointsYes: 10, pointsPartial: 7, pointsNo: 0 },
        ],
      },
      {
        id: 'd2',
        name: 'Deli',
        icon: 'ShoppingCart',
        questions: [],
      },
    ];

    it('generates correct 8-column header', () => {
      const blobSpy = vi.spyOn(globalThis, 'Blob');
      exportQuestionsCsv(depts);
      const csvContent = blobSpy.mock.calls[0]![0]![0] as string;
      const firstLine = csvContent.split('\n')[0];
      expect(firstLine).toBe('Department,Risk Category,Question,Criteria,Answer Type,Points Yes,Points Partial,Points No');
      blobSpy.mockRestore();
    });

    it('includes questions from all departments', () => {
      const blobSpy = vi.spyOn(globalThis, 'Blob');
      exportQuestionsCsv(depts);
      const csvContent = blobSpy.mock.calls[0]![0]![0] as string;
      const lines = csvContent.split('\n');
      // header + 2 questions from Bakery + 0 from Deli
      expect(lines).toHaveLength(3);
      expect(lines[1]).toContain('Bakery');
      expect(lines[2]).toContain('Bakery');
      blobSpy.mockRestore();
    });

    it('handles departments with 0 questions', () => {
      const blobSpy = vi.spyOn(globalThis, 'Blob');
      exportQuestionsCsv([depts[1]]); // Deli only, no questions
      const csvContent = blobSpy.mock.calls[0]![0]![0] as string;
      const lines = csvContent.split('\n');
      expect(lines).toHaveLength(1); // header only
      blobSpy.mockRestore();
    });
  });
});
