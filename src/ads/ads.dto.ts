import { z } from 'zod';

export type AdsQuery = {
  q?: string;
  page?: string;
  filter?: string;
  sort?: string;
};

export const createAdsSchema = z.object({
  title: z.string().min(1, { message: 'Judul wajib diisi' }).trim(),
  description: z.string().optional(),
  img_url: z.string().optional(),
  link: z.string().optional(),
  type: z.enum(['homepage', 'detailpage']),
});

export type CreateAdsDto = z.infer<typeof createAdsSchema>;

export const updateAdsSchema = z.object({
  ad_id: z.string().uuid(),
  title: z.string().min(1).trim().optional(),
  description: z.string().optional(),
  img_url: z.string().optional(),
  link: z.string().optional(),
  is_active: z.enum(['true', 'false']).optional(),
});

export type UpdateAdsDto = z.infer<typeof updateAdsSchema>;
