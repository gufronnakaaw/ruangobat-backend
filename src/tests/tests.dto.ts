import { z } from 'zod';

export type StartTestQuestion = {
  question_id: string;
  text: string;
  url?: string;
  type?: 'text' | 'video' | 'image';
  options: {
    text: string;
    option_id: string;
  }[];
};

export const finishTestsSchema = z.object({
  test_id: z.string(),
  questions: z
    .array(
      z.object({
        number: z.number().positive(),
        question_id: z.string(),
        user_answer: z.string(),
      }),
    )
    .min(1),
});

export type FinishTestsDto = z.infer<typeof finishTestsSchema>;
