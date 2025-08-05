import { z } from 'zod';

export type MyQuery = {
  q?: string;
  page?: string;
  filter?: string;
  sort?: string;
};

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
  entry_year: z.string().optional(),
});

export type UserUpdateDto = z.infer<typeof userUpdateSchema>;

export const userSendEmailSchema = z.object({
  type: z.enum(['input', 'db']),
  email: z.string().email().optional(),
});

export type UserSendEmailDto = z.infer<typeof userSendEmailSchema>;

export const userVerifyEmailSchema = z.object({
  otp_code: z.string().min(6, { message: 'OTP tidak valid' }),
});

export type UserVerifyEmailDto = z.infer<typeof userVerifyEmailSchema>;

export const userChangeEmailSchema = z.object({
  email: z.string().email(),
  otp_code: z.string().min(6, { message: 'OTP tidak valid' }),
});

export type UserChangeEmailDto = z.infer<typeof userChangeEmailSchema>;
