import z from 'zod';

export type AccessesQuery = {
  q?: string;
  page?: number;
  filter?: string;
  sort?: string;
};

export const TypeAccess = z.enum([
  'videocourse',
  'apotekerclass',
  'videoukmppai',
  'book',
  'ai',
]);

export const OrderItemTypeSchema = z.enum([
  'videocourse',
  'apotekerclass',
  'videoukmppai',
  'theses',
  'research',
  'tryout',
  'book',
  'ai',
]);

export const createAccessSchema = z
  .object({
    idempotency_key: z.string(),
    type_access: TypeAccess,
    user_id: z.string().min(1, 'User ID harus diisi'),
    user_timezone: z.string().default('Asia/Jakarta'),
    product_id: z.string(),
    product_type: OrderItemTypeSchema,
    discount_amount: z.number().optional(),
    discount_code: z.string().optional(),
    univ_tests: z.array(z.string()).optional(),
  })
  .strict();

export type CreateAccessDto = z.infer<typeof createAccessSchema>;

export const updatePlanSchema = z
  .object({
    access_id: z.string().min(1, 'Access ID harus diisi'),
    idempotency_key: z.string(),
    type_access: TypeAccess,
    user_timezone: z.string().default('Asia/Jakarta'),
    product_id: z.string(),
    product_type: OrderItemTypeSchema,
    discount_amount: z.number().optional(),
    discount_code: z.string().optional(),
  })
  .strict();

export type UpdatePlanDto = z.infer<typeof updatePlanSchema>;

export const uuidSchema = z.string().uuid('Access ID harus berupa UUID');

export const upsertTestsSchema = z.object({
  access_id: z.string().uuid('Access ID harus berupa UUID'),
  user_id: z.string().min(1, 'User ID harus diisi'),
  univ_tests: z
    .array(
      z.object({
        access_test_id: z.string().uuid('Access Test ID harus berupa UUID'),
        univ_id: z.string().min(1, 'Universitas ID harus diisi'),
      }),
    )
    .min(1, 'Minimal satu universitas harus dipilih'),
});

export type UpsertTestsDto = z.infer<typeof upsertTestsSchema>;

export const revokeAccessSchema = z.object({
  access_id: z.string().uuid('Access ID harus berupa UUID'),
  reason: z.string().min(1, 'Alasan harus diisi'),
});

export type RevokeAccessDto = z.infer<typeof revokeAccessSchema>;
