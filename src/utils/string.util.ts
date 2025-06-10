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
