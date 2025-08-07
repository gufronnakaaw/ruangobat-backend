import { z } from 'zod';

export type ActivitiesQuery = {
  q?: string;
  page?: number;
  filter?: string;
  sort?: string;
  type?: string;
};

export const createProductLogSchema = z.object({
  action: z.enum(['click', 'view']),
  user_id: z.string(),
  product_id: z.string(),
  product_name: z.string(),
  product_type: z.enum([
    'apotekerclass',
    'videoukmppai',
    'videocourse',
    'research',
    'private',
    'tryout',
    'theses',
    'book',
    'ai',
  ]),
});

export type CreateProductLogDto = z.infer<typeof createProductLogSchema>;
