import { z } from 'zod';

export const createBatchUsersSchema = z.object({
  access_key: z.string(),
  users: z
    .array(
      z.object({
        fullname: z
          .string()
          .min(1, { message: 'Nama lengkap wajib diisi' })
          .trim()
          .transform((val) => val.replace(/\s+/g, ' ')),
        email: z.string().email({ message: 'Email tidak valid' }),
        phone_number: z
          .string()
          .regex(/^(?:\+62|62|0)8[1-9][0-9]{7,11}$/, {
            message: 'Nomor telepon tidak valid',
          })
          .min(10, { message: 'Nomor telepon minimal 10 karakter' }),
        university: z
          .string()
          .min(1, { message: 'Asal Kampus wajib diisi' })
          .trim()
          .transform((val) => val.replace(/\s+/g, ' ')),
        gender: z.enum(['M', 'F']),
        password: z
          .string()
          .min(8, { message: 'Password minimal 8 karakter' })
          .optional(),
      }),
    )
    .min(1),
});

export type CreateBatchUsersDto = z.infer<typeof createBatchUsersSchema>;

export const createBatchCategoriesSchema = z.object({
  name: z.string(),
  categories: z.array(
    z.object({
      name: z.string(),
      url: z.string(),
    }),
  ),
  type: z.enum(['videocourse', 'apotekerclass', 'videoukmppai']),
  by: z.string(),
});

export type CreateBatchCategoriesDto = z.infer<
  typeof createBatchCategoriesSchema
>;

export const createBatchSubCategoriesSchema = z.object({
  category_id: z.string().uuid(),
  subcategories: z.array(
    z.object({
      name: z.string(),
      url: z.string(),
    }),
  ),
  type: z.enum(['videocourse', 'apotekerclass', 'videoukmppai']),
  by: z.string(),
});

export type CreateBatchSubCategoriesDto = z.infer<
  typeof createBatchSubCategoriesSchema
>;
