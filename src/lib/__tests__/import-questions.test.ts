import { describe, it, expect } from 'vitest';
import { parseQuestionsCsv } from '@/lib/import-questions';

describe('parseQuestionsCsv', () => {
  const VALID_HEADER = 'Department,Risk Category,Question,Criteria,Answer Type,Points Yes,Points Partial,Points No';

  it('parses valid CSV with all 8 columns', () => {
    const csv = `${VALID_HEADER}\nBakery,Safety,Is the oven clean?,Check oven,yes_no,5,3,0`;
    const result = parseQuestionsCsv(csv);
    expect(result.errors).toHaveLength(0);
    expect(result.questions).toHaveLength(1);
    expect(result.questions[0]).toEqual({
      departmentName: 'Bakery',
      riskCategory: 'Safety',
      text: 'Is the oven clean?',
      criteria: 'Check oven',
      answerType: 'yes_no',
      pointsYes: 5,
      pointsPartial: 0,
      pointsNo: 0,
    });
  });

  it('handles quoted fields with embedded commas', () => {
    const csv = `${VALID_HEADER}\nBakery,Safety,"Is the oven clean, sanitized?",Criteria,yes_no,5,3,0`;
    const result = parseQuestionsCsv(csv);
    expect(result.errors).toHaveLength(0);
    expect(result.questions[0].text).toBe('Is the oven clean, sanitized?');
  });

  it('handles quoted fields with embedded newlines', () => {
    const csv = `${VALID_HEADER}\nBakery,Safety,"Is the oven\nclean?",Criteria,yes_no,5,3,0`;
    const result = parseQuestionsCsv(csv);
    expect(result.errors).toHaveLength(0);
    expect(result.questions[0].text).toBe('Is the oven\nclean?');
  });

  it('reports error for missing required columns', () => {
    const csv = 'Department,Question\nBakery,Is it clean?';
    const result = parseQuestionsCsv(csv);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('Missing required columns');
  });

  it('reports error for invalid answerType', () => {
    const csv = `${VALID_HEADER}\nBakery,Safety,Question,Criteria,invalid_type,5,3,0`;
    const result = parseQuestionsCsv(csv);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Invalid answer type');
  });

  it('reports error for negative points', () => {
    const csv = `${VALID_HEADER}\nBakery,Safety,Question,Criteria,yes_no,-5,3,0`;
    const result = parseQuestionsCsv(csv);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Points Yes');
  });

  it('handles case-insensitive headers', () => {
    const csv = 'department,risk category,question,criteria,answer type,points yes,points partial,points no\nBakery,Safety,Q1,,yes_no,5,3,0';
    const result = parseQuestionsCsv(csv);
    expect(result.errors).toHaveLength(0);
    expect(result.questions).toHaveLength(1);
  });

  it('returns warnings for duplicate questions', () => {
    const csv = `${VALID_HEADER}\nBakery,Safety,Same question,,yes_no,5,3,0\nBakery,Safety,Same question,,yes_no,5,3,0`;
    const result = parseQuestionsCsv(csv);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('Duplicate');
    expect(result.questions).toHaveLength(2);
  });

  it('handles empty CSV (header only, no data rows)', () => {
    const csv = VALID_HEADER;
    const result = parseQuestionsCsv(csv);
    expect(result.questions).toHaveLength(0);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('only headers');
  });

  it('handles Windows-style \\r\\n line endings', () => {
    const csv = `${VALID_HEADER}\r\nBakery,Safety,Q1,,yes_no,5,3,0\r\nDeli,Safety,Q2,,yes_no,5,3,0`;
    const result = parseQuestionsCsv(csv);
    expect(result.errors).toHaveLength(0);
    expect(result.questions).toHaveLength(2);
  });

  it('normalizes Yes/No to yes_no answerType', () => {
    const csv = `${VALID_HEADER}\nBakery,Safety,Q1,,Yes/No,5,3,0`;
    const result = parseQuestionsCsv(csv);
    expect(result.errors).toHaveLength(0);
    expect(result.questions[0].answerType).toBe('yes_no');
  });

  it('handles empty criteria field gracefully', () => {
    const csv = `${VALID_HEADER}\nBakery,Safety,Q1,,yes_no,5,3,0`;
    const result = parseQuestionsCsv(csv);
    expect(result.errors).toHaveLength(0);
    expect(result.questions[0].criteria).toBe('');
  });

  it('reports error for missing department name', () => {
    const csv = `${VALID_HEADER}\n,Safety,Q1,,yes_no,5,3,0`;
    const result = parseQuestionsCsv(csv);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Missing department');
  });

  it('reports error for missing question text', () => {
    const csv = `${VALID_HEADER}\nBakery,Safety,,,yes_no,5,3,0`;
    const result = parseQuestionsCsv(csv);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Missing question');
  });
});
