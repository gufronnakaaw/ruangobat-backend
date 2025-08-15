import { z } from 'zod';

export type ArticlesQuery = {
  q?: string;
  page?: string;
  filter?: string;
  sort?: string;
};

export const createArticleSchema = z.object({
  topic_id: z.string().uuid(),
  title: z.string(),
  description: z.string().optional(),
  content: z.string(),
  is_active: z.enum(['true', 'false']).optional(),
});

export type CreateArticleDto = z.infer<typeof createArticleSchema>;

export const updateArticleSchema = z.object({
  article_id: z.string(),
  topic_id: z.string().uuid().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  content: z.string().optional(),
  is_active: z.enum(['true', 'false']).optional(),
});

export type UpdateArticleDto = z.infer<typeof updateArticleSchema>;
