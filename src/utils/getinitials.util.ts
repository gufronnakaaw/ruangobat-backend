export function getInitials(words: string) {
  return words
    .split(' ')
    .map((word) => word.charAt(0))
    .join('');
}
