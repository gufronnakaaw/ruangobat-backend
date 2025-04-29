import { z } from 'zod';

export const userRegisterSchema = z.object({
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
  password: z.string().min(8, { message: 'Password minimal 8 karakter' }),
  token: z.string(),
});

export type UserRegisterDto = z.infer<typeof userRegisterSchema>;

export const userRegisterTemporarySchema = z.object({
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
  password: z.string().min(8, { message: 'Password minimal 8 karakter' }),
});

export type UserRegisterTemporaryDto = z.infer<
  typeof userRegisterTemporarySchema
>;

export const userLoginSchema = z.object({
  email: z.string().email({ message: 'Email tidak valid' }),
  password: z.string().min(8, { message: 'Password minimal 8 karakter' }),
});

export type UserLoginDto = z.infer<typeof userLoginSchema>;

export const adminRegisterSchema = z.object({
  fullname: z
    .string()
    .min(1, { message: 'Nama lengkap wajib diisi' })
    .trim()
    .transform((val) => val.replace(/\s+/g, ' ')),
  password: z.string().min(8, { message: 'Password minimal 8 karakter' }),
  role: z.enum(['admin', 'superadmin']),
  access_key: z.string().min(8, { message: 'Access key minimal 8 karakter' }),
});

export type AdminRegisterDto = z.infer<typeof adminRegisterSchema>;

export const adminLoginSchema = z.object({
  admin_id: z.string().min(1, { message: 'Admin ID wajib diisi' }),
  password: z.string().min(8, { message: 'Password minimal 8 karakter' }),
});

export type AdminLoginDto = z.infer<typeof adminLoginSchema>;
