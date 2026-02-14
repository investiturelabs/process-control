function escapeCsv(value: string | number | boolean): string {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadCsv(filename: string, rows: (string | number | boolean)[][]) {
  const csv = rows.map((row) => row.map(escapeCsv).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

import type { AuditSession, Department } from '@/types';

export function exportSessionsCsv(
  sessions: AuditSession[],
  departments: Department[],
  filename = 'audit-history.csv',
) {
  const header = [
    'Date',
    'Department',
    'Auditor',
    'Score %',
    'Points Earned',
    'Max Points',
    'Questions Answered',
  ];

  const rows = sessions.map((s) => {
    const dept = departments.find((d) => d.id === s.departmentId);
    return [
      new Date(s.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }),
      dept?.name ?? s.departmentId,
      s.auditorName,
      s.percentage,
      s.totalPoints,
      s.maxPoints,
      s.answers.length,
    ];
  });

  downloadCsv(filename, [header, ...rows]);
}

export function exportSingleAuditCsv(
  session: AuditSession,
  department: Department,
) {
  const dateStr = new Date(session.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const header = [
    'Category',
    'Question',
    'Answer',
    'Points Earned',
    'Points Possible',
  ];

  const answerMap = new Map(session.answers.map((a) => [a.questionId, a]));

  const rows = department.questions.map((q) => {
    const ans = answerMap.get(q.id);
    return [
      q.riskCategory,
      q.text,
      ans?.value ?? 'skipped',
      ans?.points ?? 0,
      q.pointsYes,
    ];
  });

  // Summary rows at the bottom
  const summary = [
    [],
    ['Summary'],
    ['Department', department.name],
    ['Date', dateStr],
    ['Auditor', session.auditorName],
    ['Score', `${session.percentage}%`],
    ['Total Points', `${session.totalPoints} / ${session.maxPoints}`],
  ];

  const filename = `audit-${department.name.toLowerCase().replace(/\s+/g, '-')}-${dateStr.replace(/\//g, '-')}.csv`;
  downloadCsv(filename, [header, ...rows, ...(summary as (string | number | boolean)[][])]);
}
