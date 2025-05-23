import { z } from 'zod';

export const createFeedbackSchema = z.object({
  user_id: z.string(),
  fullname: z.string(),
  text: z.string(),
  rating: z.number().positive().min(1),
});

export type CreateFeedbackDto = z.infer<typeof createFeedbackSchema>;

export const sendEmailSchema = z.object({
  email: z.string().email({ message: 'Email tidak valid' }),
});

export type SendEmailDto = z.infer<typeof sendEmailSchema>;

export const verifyOtpSchema = z.object({
  otp_code: z
    .string()
    .min(1, { message: 'OTP minimal 1 karakter' })
    .max(6, { message: 'OTP maksimal 6 karakter' }),
  user_id: z.string(),
});

export type VerifyOtpDto = z.infer<typeof verifyOtpSchema>;

export const resetPasswordSchema = z.object({
  password: z.string().min(8, { message: 'Password minimal 8 karakter' }),
  token: z.string(),
});

export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;
