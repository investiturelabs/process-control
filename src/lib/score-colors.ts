export function getScoreColor(percentage: number) {
  if (!Number.isFinite(percentage) || percentage < 0) {
    return { text: 'text-muted-foreground', bg: 'bg-muted', bgLight: 'bg-muted', hex: '#94a3b8' };
  }
  // Color thresholds: visual signal for score quality
  if (percentage >= 94) return { text: 'text-emerald-600', bg: 'bg-emerald-500', bgLight: 'bg-emerald-50', hex: '#059669' };
  if (percentage >= 91) return { text: 'text-primary', bg: 'bg-primary', bgLight: 'bg-primary/10', hex: '#3b82f6' };
  if (percentage >= 80) return { text: 'text-amber-600', bg: 'bg-amber-500', bgLight: 'bg-amber-50', hex: '#d97706' };
  return { text: 'text-red-600', bg: 'bg-red-500', bgLight: 'bg-red-50', hex: '#dc2626' };
}

export function getGradeLabel(percentage: number) {
  if (!Number.isFinite(percentage) || percentage < 0) return 'N/A';
  // Grade thresholds: intentionally differ from color thresholds (94 = "Great" but also emerald)
  if (percentage >= 98) return 'Outstanding';
  if (percentage >= 94) return 'Great';
  if (percentage >= 91) return 'Very Good';
  if (percentage >= 80) return 'Needs Improvement';
  return 'Critical';
}
