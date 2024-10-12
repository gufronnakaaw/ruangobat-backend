import { z } from 'zod';

export const updateAdminsSchema = z.object({
  fullname: z
    .string()
    .trim()
    .transform((val) => val.replace(/\s+/g, ' '))
    .optional(),
  password: z
    .string()
    .min(8, { message: 'Password minimal 8 karakter' })
    .optional(),
  role: z.enum(['admin', 'superadmin']).optional(),
  access_key: z.string().min(8, { message: 'Access key minimal 8 karakter' }),
  admin_id: z.string(),
});

export type UpdateAdminsDto = z.infer<typeof updateAdminsSchema>;
