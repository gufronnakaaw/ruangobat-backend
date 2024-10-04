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
  created_by: z.string(),
  updated_by: z.string(),
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
  updated_by: z.string(),
});

export type UpdateProgramsDto = z.infer<typeof updateProgramsSchema>;
