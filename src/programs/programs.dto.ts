import { z } from 'zod';

export type ProgramsQuery = {
  q?: string;
  page: string;
  type?: 'free' | 'paid';
};

export const followPaidProgramsSchema = z.object({
  program_id: z.string(),
  code: z.string().min(8, { message: 'Kode akses minimal 8 karakter' }),
});

export type FollowPaidProgramsDto = z.infer<typeof followPaidProgramsSchema>;
