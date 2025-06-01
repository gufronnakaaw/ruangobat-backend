import { prompts } from './prompts.util';

export function buildPrompt(question: string, context?: string): string {
  if (context) {
    return `
      [INSTRUCTION]
      ${prompts.INSTRUCTION}

      [CONTEXT]

      [QUESTION]
      ${question}
      
      [ANSWER_FORMAT]
      ${prompts.ANSWER_FORMAT}
    `;
  }

  return `
      [INSTRUCTION]
      ${prompts.INSTRUCTION}

      [QUESTION]
      ${question}
      
      [ANSWER_FORMAT]
      ${prompts.ANSWER_FORMAT}
    `;
}
