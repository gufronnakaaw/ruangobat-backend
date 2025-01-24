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
  price: z.string().optional(),
  tests: z.array(z.string()).min(1, { message: 'Harus diisi minimal 1 test' }),
  url_qr_code: z.string(),
  by: z.string(),
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
  price: z.string().optional(),
  tests: z.array(z.string()).min(1, { message: 'Harus diisi minimal 1 test' }),
  url_qr_code: z.string().optional(),
  by: z.string(),
});

export type UpdateProgramsDto = z.infer<typeof updateProgramsSchema>;

export const createTestsSchema = z.object({
  title: z
    .string()
    .trim()
    .transform((val) => val.replace(/\s+/g, ' ')),
  description: z
    .string()
    .trim()
    .transform((val) => val.replace(/\s+/g, ' ')),
  start: z.string(),
  end: z.string(),
  duration: z.number().positive(),
  questions: z
    .array(
      z.object({
        number: z.number().positive().optional(),
        text: z.string(),
        explanation: z.string(),
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

export type CreateTestsDto = z.infer<typeof createTestsSchema>;

export const updateTestsSchema = z.object({
  test_id: z.string(),
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
  start: z.string().optional(),
  end: z.string().optional(),
  duration: z.number().positive().optional(),
  questions: z
    .array(
      z.object({
        question_id: z.string().optional(),
        text: z.string().optional(),
        explanation: z.string().optional(),
        url: z.string().optional(),
        type: z.enum(['text', 'video', 'image']).optional(),
        options: z
          .array(
            z.object({
              option_id: z.string().optional(),
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
  update_type: z.enum(['update_test', 'update_question', 'add_question']),
});

export type UpdateTestsDto = z.infer<typeof updateTestsSchema>;

export const inviteUsersSchema = z.object({
  program_id: z.string(),
  users: z
    .array(z.string())
    .min(1, { message: 'Harus diisi minimal 1 pengguna' }),
  by: z.string(),
});

export type InviteUsersDto = z.infer<typeof inviteUsersSchema>;

export const updateStatusTestsSchema = z.object({
  test_id: z.string(),
  is_active: z.boolean(),
});

export type UpdateStatusTestsDto = z.infer<typeof updateStatusTestsSchema>;

export const approvedUserSchema = z.object({
  user_id: z.string(),
  program_id: z.string(),
});

export type ApprovedUserDto = z.infer<typeof approvedUserSchema>;

export const updateUserSchema = z.object({
  user_id: z.string(),
  type: z.enum(['reset', 'edit']),
  email: z.string().email({ message: 'Email tidak valid' }).optional(),
  phone_number: z
    .string()
    .regex(/^(?:\+62|62|0)8[1-9][0-9]{7,11}$/, {
      message: 'Nomor telepon tidak valid',
    })
    .min(10, { message: 'Nomor telepon minimal 10 karakter' })
    .optional(),
});

export type UpdateUserDto = z.infer<typeof updateUserSchema>;

export const createMentorSchema = z.object({
  fullname: z
    .string()
    .min(1, { message: 'Nama lengkap wajib diisi' })
    .trim()
    .transform((val) => val.replace(/\s+/g, ' ')),
  nickname: z
    .string()
    .min(1, { message: 'Nama panggilan wajib diisi' })
    .trim()
    .transform((val) => val.replace(/\s+/g, ' ')),
  mentor_title: z
    .string()
    .min(1, { message: 'Title mentor wajib diisi' })
    .trim()
    .transform((val) => val.replace(/\s+/g, ' ')),
  description: z.string(),
  is_show: z.enum(['true', 'false']),
  by: z.string(),
});

export type CreateMentorDto = z.infer<typeof createMentorSchema>;

export const updateMentorSchema = z.object({
  mentor_id: z.string(),
  with_image: z.enum(['true', 'false']),
  fullname: z
    .string()
    .min(1, { message: 'Nama lengkap wajib diisi' })
    .trim()
    .transform((val) => val.replace(/\s+/g, ' '))
    .optional(),
  nickname: z
    .string()
    .min(1, { message: 'Nama panggilan wajib diisi' })
    .trim()
    .transform((val) => val.replace(/\s+/g, ' '))
    .optional(),
  mentor_title: z
    .string()
    .min(1, { message: 'Title mentor wajib diisi' })
    .trim()
    .transform((val) => val.replace(/\s+/g, ' '))
    .optional(),
  description: z.string().optional(),
  is_show: z.enum(['true', 'false']),
  by: z.string(),
});

export type UpdateMentorDto = z.infer<typeof updateMentorSchema>;

export const createProductSharedSchema = z.object({
  university_id: z.string().optional(),
  title: z
    .string()
    .min(1, { message: 'Title wajib diisi' })
    .trim()
    .transform((val) => val.replace(/\s+/g, ' ')),
  description: z
    .string()
    .min(1, { message: 'Title wajib diisi' })
    .trim()
    .transform((val) => val.replace(/\s+/g, ' ')),
  thumbnail_type: z.enum(['video', 'image']),
  by: z.string(),
  price: z.string(),
  link_order: z.string(),
  video_url: z.string().optional(),
});

export type CreateProductSharedDto = z.infer<typeof createProductSharedSchema>;

export const updateProductSharedSchema = z.object({
  subject_id: z.string().optional(),
  thesis_id: z.string().optional(),
  research_id: z.string().optional(),
  pa_id: z.string().optional(),
  title: z
    .string()
    .min(1, { message: 'Title wajib diisi' })
    .trim()
    .transform((val) => val.replace(/\s+/g, ' '))
    .optional(),
  description: z
    .string()
    .min(1, { message: 'Title wajib diisi' })
    .trim()
    .transform((val) => val.replace(/\s+/g, ' '))
    .optional(),
  thumbnail_type: z.enum(['video', 'image']).optional(),
  with_image: z.enum(['true', 'false']),
  is_active: z.enum(['true', 'false']).optional(),
  by: z.string(),
  price: z.string().optional(),
  link_order: z.string().optional(),
  video_url: z.string().optional(),
});

export type UpdateProductSharedDto = z.infer<typeof updateProductSharedSchema>;

export const createSubjectPrivateSchema = z.object({
  title: z
    .string()
    .min(1, { message: 'Title wajib diisi' })
    .trim()
    .transform((val) => val.replace(/\s+/g, ' ')),
  description: z
    .string()
    .min(1, { message: 'Title wajib diisi' })
    .trim()
    .transform((val) => val.replace(/\s+/g, ' ')),
  by: z.string(),
  subject_parts: z.array(
    z.object({
      description: z
        .string()
        .min(1, { message: 'Title wajib diisi' })
        .trim()
        .transform((val) => val.replace(/\s+/g, ' ')),
      price: z.number(),
      link_order: z.string(),
    }),
  ),
});

export type CreateSubjectPrivateDto = z.infer<
  typeof createSubjectPrivateSchema
>;

export const updateSubjectPrivateSchema = z.object({
  subject_id: z.string(),
  title: z
    .string()
    .min(1, { message: 'Title wajib diisi' })
    .trim()
    .transform((val) => val.replace(/\s+/g, ' '))
    .optional(),
  description: z
    .string()
    .min(1, { message: 'Title wajib diisi' })
    .trim()
    .transform((val) => val.replace(/\s+/g, ' '))
    .optional(),
  by: z.string(),
  subject_parts: z
    .array(
      z.object({
        subject_part_id: z.string(),
        description: z
          .string()
          .min(1, { message: 'Title wajib diisi' })
          .trim()
          .transform((val) => val.replace(/\s+/g, ' '))
          .optional(),
        price: z.number().optional(),
        link_order: z.string().optional(),
      }),
    )
    .optional(),
});

export type UpdateSubjectPrivateDto = z.infer<
  typeof updateSubjectPrivateSchema
>;

export const classMentorSchema = z.object({
  type: z.enum([
    'preparation',
    'private',
    'thesis',
    'research',
    'pharmacist_admission',
  ]),
  mentors: z.array(z.string()),
  by: z.string(),
});

export type CreateClassMentorDto = z.infer<typeof classMentorSchema>;

export type ClassMentorType =
  | 'preparation'
  | 'private'
  | 'thesis'
  | 'research'
  | 'pharmacist_admission';

export const createPharmacistAdmissionSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  by: z.string(),
});

export type CreatePharmacistAdmissionDto = z.infer<
  typeof createPharmacistAdmissionSchema
>;

export const updatePharmacistAdmissionSchema = z.object({
  university_id: z.string(),
  with_image: z.enum(['true', 'false']),
  name: z.string().optional(),
  description: z.string().optional(),
  is_active: z.enum(['true', 'false']),
  by: z.string(),
});

export type UpdatePharmacistAdmissionDto = z.infer<
  typeof updatePharmacistAdmissionSchema
>;
