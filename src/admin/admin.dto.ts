import { z } from 'zod';

export const createBankSchema = z.object({
  title: z.string(),
  questions: z.array(
    z.object({
      question_text: z.string(),
      options: z.array(
        z.object({
          option_text: z.string(),
          is_correct: z.boolean(),
        }),
      ),
    }),
  ),
});

export type CreateBankDto = z.infer<typeof createBankSchema>;
