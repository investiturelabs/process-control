import type { AuditSession, Department } from '@/types';

// Fix #11: Handle \r in escapeCsv
function escapeCsv(value: string | number | boolean): string {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Fix #10: Delay revocation to avoid premature cleanup
function downloadCsv(filename: string, rows: (string | number | boolean)[][]) {
  const csv = rows.map((row) => row.map(escapeCsv).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function exportQuestionsCsv(departments: Department[], filename = 'questions-export.csv') {
  const header = ['Department', 'Risk Category', 'Question', 'Criteria', 'Answer Type', 'Points Yes', 'Points Partial', 'Points No'];
  const rows: (string | number | boolean)[][] = [];
  for (const dept of departments) {
    for (const q of dept.questions) {
      rows.push([dept.name, q.riskCategory, q.text, q.criteria, q.answerType, q.pointsYes, q.pointsPartial, q.pointsNo]);
    }
  }
  downloadCsv(filename, [header, ...rows]);
}

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
    // Fix #26: Validate date
    const dateStr = new Date(s.date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const safeDate = dateStr === 'Invalid Date' ? s.date : dateStr;
    return [
      safeDate,
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
  department?: Department,
) {
  const dateStr = new Date(session.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const safeDate = dateStr === 'Invalid Date' ? session.date : dateStr;

  const header = [
    'Category',
    'Question',
    'Answer',
    'Points Earned',
    'Points Possible',
  ];

  const hasSnapshots = session.answers.some((a) => a.questionText);
  let rows: (string | number | boolean)[][];
  let deptName: string;

  if (hasSnapshots) {
    // PCT-20: Build rows from snapshot data
    rows = session.answers.map((a) => [
      a.questionRiskCategory ?? 'Unknown',
      a.questionText ?? 'Unknown question',
      a.value ?? 'skipped',
      a.points,
      a.questionPointsYes ?? a.points,
    ]);
    deptName = department?.name ?? session.departmentId;
  } else if (department) {
    // Legacy: use current department questions
    const answerMap = new Map(session.answers.map((a) => [a.questionId, a]));
    rows = department.questions.map((q) => {
      const ans = answerMap.get(q.id);
      return [
        q.riskCategory,
        q.text,
        ans?.value ?? 'skipped',
        ans?.points ?? 0,
        q.pointsYes,
      ];
    });
    deptName = department.name;
  } else {
    // No snapshots and no department — minimal export
    rows = session.answers.map((a) => [
      '',
      a.questionId,
      a.value ?? 'skipped',
      a.points,
      '',
    ]);
    deptName = session.departmentId;
  }

  // Fix #27: Pad summary rows to match header column count (5 columns)
  const summary: (string | number | boolean)[][] = [
    ['', '', '', '', ''],
    ['Summary', '', '', '', ''],
    ['Department', deptName, '', '', ''],
    ['Date', safeDate, '', '', ''],
    ['Auditor', session.auditorName, '', '', ''],
    ['Score', `${session.percentage}%`, '', '', ''],
    ['Total Points', `${session.totalPoints} / ${session.maxPoints}`, '', '', ''],
  ];

  const filename = `audit-${deptName.toLowerCase().replace(/\s+/g, '-')}-${safeDate.replace(/\//g, '-')}.csv`;
  downloadCsv(filename, [header, ...rows, ...summary]);
}
