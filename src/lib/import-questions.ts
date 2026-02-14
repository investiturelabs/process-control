export interface ParsedQuestion {
  departmentName: string;
  riskCategory: string;
  text: string;
  criteria: string;
  answerType: 'yes_no' | 'yes_no_partial';
  pointsYes: number;
  pointsPartial: number;
  pointsNo: number;
}

export interface ParseResult {
  questions: ParsedQuestion[];
  errors: string[];
  warnings: string[];
}

const EXPECTED_HEADERS = [
  'department',
  'risk category',
  'question',
  'criteria',
  'answer type',
  'points yes',
  'points partial',
  'points no',
];

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

function splitCSVRows(text: string): string[] {
  const rows: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      current += ch;
    } else if (!inQuotes && (ch === '\n' || ch === '\r')) {
      if (ch === '\r' && i + 1 < text.length && text[i + 1] === '\n') {
        i++; // skip \n after \r
      }
      rows.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) {
    rows.push(current);
  }
  return rows;
}

function normalizeAnswerType(value: string): 'yes_no' | 'yes_no_partial' | null {
  const lower = value.toLowerCase().trim().replace(/[\s/]+/g, '_');
  if (lower === 'yes_no') return 'yes_no';
  if (lower === 'yes_no_partial') return 'yes_no_partial';
  return null;
}

export function parseQuestionsCsv(csvText: string): ParseResult {
  const questions: ParsedQuestion[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  const rows = splitCSVRows(csvText.trim());
  if (rows.length === 0) {
    errors.push('CSV file is empty.');
    return { questions, errors, warnings };
  }

  const headerFields = parseCSVLine(rows[0]).map((h) => h.toLowerCase().trim());

  // Validate all expected headers are present
  const missingHeaders = EXPECTED_HEADERS.filter((h) => !headerFields.includes(h));
  if (missingHeaders.length > 0) {
    errors.push(`Missing required columns: ${missingHeaders.join(', ')}`);
    return { questions, errors, warnings };
  }

  const colIndex = Object.fromEntries(EXPECTED_HEADERS.map((h) => [h, headerFields.indexOf(h)]));

  if (rows.length === 1) {
    warnings.push('CSV contains only headers, no data rows.');
    return { questions, errors, warnings };
  }

  const seen = new Set<string>();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row.trim()) continue;

    const fields = parseCSVLine(row);
    const rowNum = i + 1;

    const deptName = (fields[colIndex['department']] || '').trim();
    const riskCategory = (fields[colIndex['risk category']] || '').trim();
    const text = (fields[colIndex['question']] || '').trim();
    const criteria = (fields[colIndex['criteria']] || '').trim();
    const answerTypeRaw = (fields[colIndex['answer type']] || '').trim();
    const pointsYesRaw = (fields[colIndex['points yes']] || '').trim();
    const pointsPartialRaw = (fields[colIndex['points partial']] || '').trim();
    const pointsNoRaw = (fields[colIndex['points no']] || '').trim();

    if (!deptName) {
      errors.push(`Row ${rowNum}: Missing department name.`);
      continue;
    }
    if (!text) {
      errors.push(`Row ${rowNum}: Missing question text.`);
      continue;
    }

    const answerType = normalizeAnswerType(answerTypeRaw || 'yes_no');
    if (!answerType) {
      errors.push(`Row ${rowNum}: Invalid answer type "${answerTypeRaw}". Use yes_no or yes_no_partial.`);
      continue;
    }

    const pointsYes = parseInt(pointsYesRaw || '5', 10);
    const pointsPartial = parseInt(pointsPartialRaw || '3', 10);
    const pointsNo = parseInt(pointsNoRaw || '0', 10);

    if (!Number.isFinite(pointsYes) || pointsYes < 0) {
      errors.push(`Row ${rowNum}: Points Yes must be a non-negative integer.`);
      continue;
    }
    if (!Number.isFinite(pointsPartial) || pointsPartial < 0) {
      errors.push(`Row ${rowNum}: Points Partial must be a non-negative integer.`);
      continue;
    }
    if (!Number.isFinite(pointsNo) || pointsNo < 0) {
      errors.push(`Row ${rowNum}: Points No must be a non-negative integer.`);
      continue;
    }

    const dupeKey = `${deptName.toLowerCase()}::${text.toLowerCase()}`;
    if (seen.has(dupeKey)) {
      warnings.push(`Row ${rowNum}: Duplicate question "${text}" in "${deptName}".`);
    }
    seen.add(dupeKey);

    questions.push({
      departmentName: deptName,
      riskCategory: riskCategory || 'General',
      text,
      criteria,
      answerType,
      pointsYes,
      pointsPartial: answerType === 'yes_no_partial' ? pointsPartial : 0,
      pointsNo,
    });
  }

  return { questions, errors, warnings };
}
