import { z } from 'zod';

export const ProductTypeSchema = z.enum([
  'videocourse',
  'private',
  'apotekerclass',
  'videoukmppai',
  'theses',
  'research',
  'tryout',
  'book',
  'ai',
]);

export const createOrderSchema = z
  .object({
    product_id: z.string(),
    product_type: ProductTypeSchema,
    discount_amount: z.number().positive().optional(),
    discount_code: z.string().optional(),
  })
  .strict();

export type CreateOrderDto = z.infer<typeof createOrderSchema>;
