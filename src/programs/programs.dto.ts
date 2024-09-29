import { z } from 'zod';

export type ProgramsQuery = {
  q?: string;
  page: string;
  plan?: string;
};

export const followProgramsSchema = z.object({
  program_id: z.string(),
  type: z.enum(['free', 'paid']),
  code: z
    .string()
    .min(8, { message: 'Kode akses minimal 8 karakter' })
    .optional(),
});

export type FollowProgramsDto = z.infer<typeof followProgramsSchema>;
