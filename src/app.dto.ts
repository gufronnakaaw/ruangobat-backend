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

export const createUniversitySchema = z.object({
  title: z.string().min(1, { message: 'Nama universitas tidak boleh kosong' }),
  description: z.string().optional(),
  tests: z.array(z.string().min(1, { message: 'Minimal 1 ujian dipilih' })),
  by: z.string(),
});

export type CreateUniversityDto = z.infer<typeof createUniversitySchema>;

export const updateUniversitySchema = z.object({
  univ_id: z.string(),
  title: z
    .string()
    .min(1, { message: 'Nama universitas tidak boleh kosong' })
    .optional(),
  description: z.string().optional(),
  is_active: z.enum(['true', 'false']).optional(),
  tests: z.array(z.string().min(1, { message: 'Minimal 1 ujian dipilih' })),
  by: z.string(),
});

export type UpdateUniversityDto = z.infer<typeof updateUniversitySchema>;

export type StartAssessmentQuestion = {
  assq_id: string;
  text: string;
  url?: string;
  type?: 'text' | 'video' | 'image';
  options: {
    text: string;
    asso_id: string;
  }[];
};

export const finishAssessmentSchema = z.object({
  ass_id: z.string(),
  questions: z
    .array(
      z.object({
        number: z.number().positive(),
        assq_id: z.string(),
        user_answer: z.string().optional(),
      }),
    )
    .min(1),
});

export type FinishAssessmentDto = z.infer<typeof finishAssessmentSchema>;
