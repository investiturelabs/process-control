import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createBackup, downloadBackup, type BackupData } from '@/lib/backup';

describe('backup', () => {
  describe('createBackup', () => {
    it('returns object with version: 1', () => {
      const result = createBackup({
        company: null,
        users: [],
        departments: [],
        sessions: [],
        invitations: [],
      });
      expect(result.version).toBe(1);
    });

    it('includes exportedAt as ISO string', () => {
      const result = createBackup({
        company: null,
        users: [],
        departments: [],
        sessions: [],
        invitations: [],
      });
      expect(result.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('passes through all 5 table arrays', () => {
      const users = [{ id: 'u1', name: 'Test', email: 'test@test.com', role: 'admin' as const, avatarColor: '#000' }];
      const departments = [{ id: 'd1', name: 'Deli', icon: 'Building2', questions: [] }];
      const result = createBackup({
        company: { id: 'c1', name: 'Test Co' },
        users,
        departments,
        sessions: [],
        invitations: [],
      });
      expect(result.users).toBe(users);
      expect(result.departments).toBe(departments);
      expect(result.company).toEqual({ id: 'c1', name: 'Test Co' });
    });

    it('handles null company', () => {
      const result = createBackup({
        company: null,
        users: [],
        departments: [],
        sessions: [],
        invitations: [],
      });
      expect(result.company).toBeNull();
    });

    it('handles empty arrays for all tables', () => {
      const result = createBackup({
        company: null,
        users: [],
        departments: [],
        sessions: [],
        invitations: [],
      });
      expect(result.users).toEqual([]);
      expect(result.departments).toEqual([]);
      expect(result.sessions).toEqual([]);
      expect(result.invitations).toEqual([]);
    });
  });

  describe('downloadBackup', () => {
    let mockClick: ReturnType<typeof vi.fn>;
    let createdElement: Record<string, unknown>;

    beforeEach(() => {
      mockClick = vi.fn();
      createdElement = {};
      vi.spyOn(document, 'createElement').mockReturnValue({
        set href(val: string) { createdElement.href = val; },
        get href() { return createdElement.href as string; },
        set download(val: string) { createdElement.download = val; },
        get download() { return createdElement.download as string; },
        click: mockClick,
      } as unknown as HTMLAnchorElement);
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    });

    it('creates Blob with application/json MIME type', () => {
      const blobSpy = vi.spyOn(globalThis, 'Blob');
      const backup: BackupData = {
        version: 1,
        exportedAt: '2025-01-01T00:00:00.000Z',
        company: null,
        users: [],
        departments: [],
        sessions: [],
        invitations: [],
      };
      downloadBackup(backup);
      expect(blobSpy).toHaveBeenCalledWith(
        [JSON.stringify(backup, null, 2)],
        { type: 'application/json' },
      );
      expect(mockClick).toHaveBeenCalled();
      blobSpy.mockRestore();
    });
  });
});
