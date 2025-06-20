import { prompts } from './prompts.util';

export function buildPrompt(
  context?: string | string[],
  has_image?: boolean | number,
): string {
  let contextText = '';

  if (Array.isArray(context)) {
    contextText = context
      .map((ctx, i) => `\tContext #${i + 1}:\n\t${ctx}`)
      .join('\n\n');
  } else if (typeof context === 'string') {
    contextText = context;
  }

  if (has_image) {
    if (contextText) {
      return `
    [INSTRUCTION]
    ${prompts.INSTRUCTION}

    [CONTEXT]
${contextText}
      
    [ANSWER_FORMAT]
    ${prompts.ANSWER_FORMAT}`;
    } else {
      return `
    [INSTRUCTION]
    ${prompts.INSTRUCTION}
      
    [ANSWER_FORMAT]
    ${prompts.ANSWER_FORMAT}`;
    }
  }

  if (contextText) {
    return `
    [INSTRUCTION]
    ${prompts.INSTRUCTION}

    [CONTEXT]
${contextText}
      
    [ANSWER_FORMAT]
    ${prompts.ANSWER_FORMAT}`;
  }

  return `
    [INSTRUCTION]
    ${prompts.INSTRUCTION}
      
    [ANSWER_FORMAT]
    ${prompts.ANSWER_FORMAT}`;
}

export function parseIsActive(val: any): boolean | undefined {
  if (val === undefined) return undefined;
  return val === 'true' || val === true;
}

export function maskEmail(email: string) {
  const [name, domain] = email.split('@');
  const masked_name =
    name[0] + '*'.repeat(name.length - 2) + name[name.length - 1];
  return `${masked_name}@${domain}`;
}

export function maskPhoneNumber(phone_number: string) {
  const visible_start = phone_number.slice(0, 2);
  const visible_end = phone_number.slice(-2);
  const masked_middle = '*'.repeat(Math.max(phone_number.length - 4, 0));
  return `${visible_start}${masked_middle}${visible_end}`;
}

export function slug(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');
}

export function capitalize(words: string) {
  return words
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function getInitials(words: string) {
  return words
    .split(' ')
    .map((word) => word.charAt(0))
    .join('');
}

export function scoreCategory(score: number): string {
  if (typeof score !== 'number' || isNaN(score)) return '-';
  if (score < 0 || score > 100) return '-';

  if (score >= 81) return 'A';
  if (score >= 61) return 'B';
  if (score >= 41) return 'C';
  if (score >= 21) return 'D';
  return 'E';
}
