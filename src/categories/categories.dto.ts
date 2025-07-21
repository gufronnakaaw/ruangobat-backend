import { z } from 'zod';

export type CategoriesQuery = {
  q?: string;
  page: string;
  type?: 'videocourse' | 'apotekerclass' | 'videoukmppai';
  filter?: string;
  sort?: string;
};

export const createCategorySchema = z.object({
  name: z.string(),
  type: z.enum(['videocourse', 'apotekerclass', 'videoukmppai']),
  by: z.string(),
});

export type CreateCategoryDto = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = z.object({
  category_id: z.string().uuid(),
  name: z.string().optional(),
  is_active: z.enum(['true', 'false']).optional(),
  by: z.string(),
});

export type UpdateCategoryDto = z.infer<typeof updateCategorySchema>;

export const createSubCategorySchema = z.object({
  category_id: z.string().uuid(),
  name: z.string(),
  by: z.string(),
});

export type CreateSubCategoryDto = z.infer<typeof createSubCategorySchema>;

export const updateSubCategorySchema = z.object({
  sub_category_id: z.string().uuid(),
  name: z.string().optional(),
  is_active: z.enum(['true', 'false']).optional(),
  by: z.string(),
});

export type UpdateSubCategoryDto = z.infer<typeof updateSubCategorySchema>;
