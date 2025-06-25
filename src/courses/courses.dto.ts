import { z } from 'zod';

export const createCourseSchema = z.object({
  category_id: z.string().uuid().optional(),
  sub_category_id: z.string().uuid().optional(),
  title: z.string(),
  preview_url: z.string().url().optional(),
  description: z.string(),
  type: z.enum(['videocourse', 'apotekerclass', 'videoukmppai']),
  by: z.string(),
});

export type CreateCourseDto = z.infer<typeof createCourseSchema>;

export const updateCourseSchema = z.object({
  course_id: z.string().uuid().optional(),
  title: z.string().optional(),
  preview_url: z.string().url().optional(),
  description: z.string().optional(),
  is_active: z.enum(['true', 'false']),
  by: z.string(),
});

export type UpdateCourseDto = z.infer<typeof updateCourseSchema>;

export const createSegmentSchema = z.object({
  course_id: z.string().uuid(),
  title: z.string(),
  by: z.string(),
});

export type CreateSegmentDto = z.infer<typeof createSegmentSchema>;

export const updateSegmentSchema = z.object({
  segment_id: z.string().uuid(),
  title: z.string().optional(),
  is_active: z.boolean().optional(),
  by: z.string().optional(),
});

export type UpdateSegmentDto = z.infer<typeof updateSegmentSchema>;

export const createContentSchema = z.object({
  segment_id: z.string(),
  contents: z
    .array(
      z.object({
        title: z.string(),
        video_url: z.string().url().optional(),
        video_note_url: z.string().url().optional(),
        video_note: z.string().optional(),
        content_type: z.enum(['video', 'test']),
        test_type: z.enum(['pre', 'post']).optional(),
      }),
    )
    .min(1, 'Minimal 1 konten harus ditambahkan'),
  by: z.string(),
});

export type CreateContentDto = z.infer<typeof createContentSchema>;

export const updateContentSchema = z.object({
  content_id: z.string().uuid(),
  title: z.string().optional(),
  video_url: z.string().url().optional(),
  video_note_url: z.string().url().optional(),
  video_note: z.string().optional(),
  is_active: z.boolean().optional(),
  by: z.string(),
});

export type UpdateContentDto = z.infer<typeof updateContentSchema>;

export const createTestSchema = z.object({
  segment_id: z.string(),
  title: z.string(),
  test_type: z.enum(['pre', 'post']),
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

export type CreateTestDto = z.infer<typeof createTestSchema>;
