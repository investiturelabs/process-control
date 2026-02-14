import type { Company, User, Department, AuditSession, Invitation } from '@/types';

export interface BackupData {
  version: 1;
  exportedAt: string;
  company: Company | null;
  users: User[];
  departments: Department[];
  sessions: AuditSession[];
  invitations: Invitation[];
}

export function createBackup(data: Omit<BackupData, 'version' | 'exportedAt'>): BackupData {
  return { version: 1, exportedAt: new Date().toISOString(), ...data };
}

export function downloadBackup(backup: BackupData, filename?: string) {
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
