export function scoreCategory(score: number): string {
  if (typeof score !== 'number' || isNaN(score)) return '-';
  if (score < 0 || score > 100) return '-';

  if (score >= 81) return 'A';
  if (score >= 61) return 'B';
  if (score >= 41) return 'C';
  if (score >= 21) return 'D';
  return 'E';
}
