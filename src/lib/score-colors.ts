export function getScoreColor(percentage: number) {
  if (percentage >= 94) return { text: 'text-emerald-600', bg: 'bg-emerald-500', bgLight: 'bg-emerald-50' };
  if (percentage >= 91) return { text: 'text-primary', bg: 'bg-primary', bgLight: 'bg-primary/10' };
  if (percentage >= 80) return { text: 'text-amber-600', bg: 'bg-amber-500', bgLight: 'bg-amber-50' };
  return { text: 'text-red-600', bg: 'bg-red-500', bgLight: 'bg-red-50' };
}

export function getGradeLabel(percentage: number) {
  if (percentage >= 98) return 'Outstanding';
  if (percentage >= 94) return 'Great';
  if (percentage >= 91) return 'Very Good';
  if (percentage >= 80) return 'Needs Improvement';
  return 'Critical';
}
