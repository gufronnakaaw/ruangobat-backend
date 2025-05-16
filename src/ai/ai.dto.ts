import { z } from 'zod';

export type AiQuery = {
  q?: string;
  page: string;
};

export const createProviderSchema = z.object({
  name: z.string().min(1, 'Nama provider tidak boleh kosong'),
  model: z.string().min(1, 'Model tidak boleh kosong'),
  api_key: z.string().min(1, 'API key tidak boleh kosong'),
  api_url: z.string().url('URL tidak valid'),
  type: z.enum(['free', 'paid']),
  by: z.string(),
});

export type CreateProviderDto = z.infer<typeof createProviderSchema>;

export const updateProviderSchema = z.object({
  provider_id: z.string(),
  name: z.string().optional(),
  model: z.string().optional(),
  api_key: z.string().optional(),
  api_url: z.string().url('URL tidak valid').optional(),
  type: z.enum(['free', 'paid']).optional(),
  is_active: z.boolean().optional(),
  by: z.string(),
});

export type UpdateProviderDto = z.infer<typeof updateProviderSchema>;

export const createContextSchema = z.object({
  title: z.string().min(1, 'Judul tidak boleh kosong'),
  content: z.string().min(1, 'Konten tidak boleh kosong'),
  type: z.string().min(1, 'Tipe tidak boleh kosong'),
  by: z.string(),
});

export type CreateContextDto = z.infer<typeof createContextSchema>;

export const updateContextSchema = z.object({
  context_id: z.string(),
  title: z.string().optional(),
  content: z.string().optional(),
  type: z.string().optional(),
  is_active: z.boolean().optional().default(true),
  by: z.string(),
});

export type UpdateContextDto = z.infer<typeof updateContextSchema>;

export const createAiLimit = z.object({
  type: z.enum(['free', 'paid']),
  total: z.number().int().nonnegative(),
  by: z.string(),
});

export type CreateAiLimitDto = z.infer<typeof createAiLimit>;

export const updateAiLimit = z.object({
  limit_id: z.string(),
  type: z.enum(['free', 'paid']).optional(),
  total: z.number().int().nonnegative().optional(),
  by: z.string(),
});

export type UpdateAiLimitDto = z.infer<typeof updateAiLimit>;

export const createUserAiLimit = z.object({
  user_id: z.string(),
  total: z.number().int().nonnegative(),
  expired_at: z.string().optional(),
  by: z.string(),
});

export type CreateUserAiLimitDto = z.infer<typeof createUserAiLimit>;

export const updateUserAiLimit = z.object({
  user_id: z.string(),
  total: z.number().int().nonnegative().optional(),
  expired_at: z.string().optional(),
  by: z.string(),
});

export type UpdateUserAiLimitDto = z.infer<typeof updateUserAiLimit>;
