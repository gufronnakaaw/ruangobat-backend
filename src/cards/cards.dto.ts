import { z } from 'zod';

export const createCardSchema = z.object({
  category_id: z.string().uuid().optional(),
  sub_category_id: z.string().uuid().optional(),
  text: z.string().optional(),
  type: z.enum(['image', 'text', 'document']),
  by: z.string(),
});

export type CreateCardDto = z.infer<typeof createCardSchema>;

export const updateCardSchema = z.object({
  card_id: z.string().uuid(),
  text: z.string().optional(),
  type: z.enum(['image', 'text', 'document']),
  is_active: z.enum(['true', 'false']).optional(),
  by: z.string(),
});

export type UpdateCardDto = z.infer<typeof updateCardSchema>;
