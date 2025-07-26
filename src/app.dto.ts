import { z } from 'zod';

export type AppQuery = {
  q?: string;
  page?: number;
  filter?: string;
  sort?: string;
  type?: string;
};

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
  field_id: z.enum(['ass_id', 'content_id']),
  value_id: z.string(),
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

export const createProgressSchema = z.object({
  content_id: z.string().uuid(),
});

export type CreateProgressDto = z.infer<typeof createProgressSchema>;

export const uploadFilesSchema = z.object({
  files: z
    .array(
      z.object({
        filename: z.string(),
        type: z.string(),
      }),
    )
    .min(1),
  folder: z.string(),
  by: z.string(),
});

export type UploadFilesDto = z.infer<typeof uploadFilesSchema>;

export const createFolderSchema = z.object({
  name: z.string(),
  folder: z.string(),
  by: z.string(),
});

export type CreateFolderDto = z.infer<typeof createFolderSchema>;

export const createGeneralTestimonialSchema = z.object({
  content: z.string(),
});

export type CreateGeneralTestimonialDto = z.infer<
  typeof createGeneralTestimonialSchema
>;

export const createTryoutSchema = z.object({
  title: z
    .string()
    .trim()
    .transform((val) => val.replace(/\s+/g, ' ')),
  description: z
    .string()
    .trim()
    .transform((val) => val.replace(/\s+/g, ' '))
    .optional(),
  questions: z
    .array(
      z.object({
        number: z.number().positive().optional(),
        text: z.string(),
        explanation: z.string().optional(),
        url: z.string().optional(),
        type: z.enum(['text', 'video', 'image']),
        options: z
          .array(
            z.object({
              text: z.string(),
              is_correct: z.boolean(),
            }),
          )
          .min(5, { message: 'Harus diisi minimal 5 opsi' }),
      }),
    )
    .min(1, { message: 'Harus diisi minimal 1 soal' }),
  by: z.string(),
});

export type CreateTryoutDto = z.infer<typeof createTryoutSchema>;

export const updateTryoutSchema = z.object({
  ass_id: z.string(),
  title: z
    .string()
    .trim()
    .transform((val) => val.replace(/\s+/g, ' '))
    .optional(),
  description: z
    .string()
    .trim()
    .transform((val) => val.replace(/\s+/g, ' '))
    .optional(),
  questions: z
    .array(
      z.object({
        assq_id: z.string().optional(),
        number: z.number().positive().optional(),
        text: z.string().optional(),
        explanation: z.string().optional(),
        url: z.string().optional(),
        type: z.enum(['text', 'video', 'image']).optional(),
        options: z
          .array(
            z.object({
              asso_id: z.string().optional(),
              text: z.string().optional(),
              is_correct: z.boolean().optional(),
            }),
          )
          .min(5, { message: 'Harus diisi minimal 5 opsi' })
          .optional(),
      }),
    )
    .min(1, { message: 'Harus diisi minimal 1 soal' })
    .optional(),
  by: z.string(),
  update_type: z.enum(['update_tryout', 'update_question', 'add_question']),
  is_active: z.boolean().optional(),
});

export type UpdateTryoutDto = z.infer<typeof updateTryoutSchema>;
