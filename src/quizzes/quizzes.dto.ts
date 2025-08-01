import { z } from 'zod';

export type QuizzesQuery = {
  q?: string;
  page: string;
  filter?: string;
  sort?: string;
};

export const createQuizSchema = z.object({
  category_id: z.string().uuid().optional(),
  sub_category_id: z.string().uuid().optional(),
  title: z
    .string()
    .trim()
    .transform((val) => val.replace(/\s+/g, ' ')),
  description: z
    .string()
    .trim()
    .transform((val) => val.replace(/\s+/g, ' '))
    .optional(),
  type: z.enum(['videocourse', 'apotekerclass', 'videoukmppai']),
  questions: z
    .array(
      z.object({
        number: z.number().positive().optional(),
        text: z.string(),
        explanation: z.string().optional(),
        url: z.string().optional(),
        type: z.enum(['text', 'video', 'image']),
        options: z
          .array(
            z.object({
              text: z.string(),
              is_correct: z.boolean(),
            }),
          )
          .min(5, { message: 'Harus diisi minimal 5 opsi' }),
      }),
    )
    .min(1, { message: 'Harus diisi minimal 1 soal' }),
  by: z.string(),
});

export type CreateQuizDto = z.infer<typeof createQuizSchema>;

export const updateQuizSchema = z.object({
  ass_id: z.string(),
  title: z
    .string()
    .trim()
    .transform((val) => val.replace(/\s+/g, ' '))
    .optional(),
  description: z
    .string()
    .trim()
    .transform((val) => val.replace(/\s+/g, ' '))
    .optional(),
  questions: z
    .array(
      z.object({
        assq_id: z.string().optional(),
        number: z.number().positive().optional(),
        text: z.string().optional(),
        explanation: z.string().optional(),
        url: z.string().optional(),
        type: z.enum(['text', 'video', 'image']).optional(),
        options: z
          .array(
            z.object({
              asso_id: z.string().optional(),
              text: z.string().optional(),
              is_correct: z.boolean().optional(),
            }),
          )
          .min(5, { message: 'Harus diisi minimal 5 opsi' })
          .optional(),
      }),
    )
    .min(1, { message: 'Harus diisi minimal 1 soal' })
    .optional(),
  by: z.string(),
  update_type: z.enum(['update_quiz', 'update_question', 'add_question']),
  is_active: z.boolean().optional(),
});

export type UpdateQuizDto = z.infer<typeof updateQuizSchema>;
