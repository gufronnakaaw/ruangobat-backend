import { z } from 'zod';

export const userUpdateSchema = z.object({
  fullname: z
    .string()
    .trim()
    .transform((val) => val.replace(/\s+/g, ' '))
    .optional(),
  phone_number: z
    .string()
    .regex(/^(?:\+62|62|0)8[1-9][0-9]{7,11}$/, {
      message: 'Nomor telepon tidak valid',
    })
    .min(10, { message: 'Nomor telepon minimal 10 karakter' })
    .optional(),
  university: z
    .string()
    .trim()
    .transform((val) => val.replace(/\s+/g, ' '))
    .optional(),
  gender: z.enum(['M', 'F']).optional(),
});

export type UserUpdateDto = z.infer<typeof userUpdateSchema>;
