import { z } from 'zod';

export type AdminQuery = {
  q?: string;
  page: string;
};

export const createProgramsSchema = z.object({
  title: z
    .string()
    .min(1, { message: 'Title wajib diisi' })
    .trim()
    .transform((val) => val.replace(/\s+/g, ' ')),
  type: z.enum(['free', 'paid']),
  price: z
    .number()
    .positive({ message: 'Harga harus positif' })
    .min(1, { message: 'Minimal harga Rp1' })
    .optional(),
  tests: z.array(z.string()).min(1, { message: 'Harus diisi minimal 1 test' }),
  by: z.string(),
});

export type CreateProgramsDto = z.infer<typeof createProgramsSchema>;

export const updateStatusProgramsSchema = z.object({
  program_id: z.string(),
  is_active: z.boolean(),
});

export type UpdateStatusProgramsDto = z.infer<
  typeof updateStatusProgramsSchema
>;

export const updateProgramsSchema = z.object({
  program_id: z.string(),
  title: z
    .string()
    .trim()
    .transform((val) => val.replace(/\s+/g, ' '))
    .optional(),
  type: z.enum(['free', 'paid']).optional(),
  price: z.number().positive({ message: 'Harga harus positif' }).optional(),
  tests: z.array(z.string()).min(1, { message: 'Harus diisi minimal 1 test' }),
  by: z.string(),
});

export type UpdateProgramsDto = z.infer<typeof updateProgramsSchema>;

export const createTestsSchema = z.object({
  title: z
    .string()
    .trim()
    .transform((val) => val.replace(/\s+/g, ' ')),
  description: z
    .string()
    .trim()
    .transform((val) => val.replace(/\s+/g, ' ')),
  start: z.string(),
  end: z.string(),
  duration: z.number().positive(),
  questions: z
    .array(
      z.object({
        number: z.number().positive().optional(),
        text: z.string(),
        explanation: z.string(),
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

export type CreateTestsDto = z.infer<typeof createTestsSchema>;

export const inviteUsersSchema = z.object({
  program_id: z.string(),
  users: z
    .array(z.string())
    .min(1, { message: 'Harus diisi minimal 1 pengguna' }),
  by: z.string(),
});

export type InviteUsersDto = z.infer<typeof inviteUsersSchema>;
