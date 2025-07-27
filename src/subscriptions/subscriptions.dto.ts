import { z } from 'zod';

export type SubscriptionsQuery = {
  q?: string;
  page: string;
  type?: 'videocourse' | 'apotekerclass';
};

export const createSubscriptionPackageSchema = z.object({
  name: z.string().min(1, 'Nama paket tidak boleh kosong'),
  price: z.number().min(0, 'Harga harus bernilai positif'),
  duration: z.number().min(1, 'Durasi harus minimal 1 bulan'),
  type: z.enum(['videocourse', 'apotekerclass']),
  link_order: z.string().url('Link order harus berupa URL yang valid'),
  benefits: z.array(z.string()).min(1, 'Minimal 1 benefit'),
  by: z.string(),
});

export type CreateSubscriptionPackageDto = z.infer<
  typeof createSubscriptionPackageSchema
>;

export const updateSubscriptionPackageSchema = z.object({
  package_id: z.string().uuid('ID paket tidak valid'),
  name: z.string().min(1, 'Nama paket tidak boleh kosong').optional(),
  price: z.number().min(0, 'Harga harus bernilai positif').optional(),
  duration: z.number().min(1, 'Durasi harus minimal 1 bulan').optional(),
  type: z.enum(['videocourse', 'apotekerclass']).optional(),
  link_order: z
    .string()
    .url('Link order harus berupa URL yang valid')
    .optional(),
  benefits: z
    .array(
      z.object({
        benefit_id: z.string().optional(),
        description: z.string().optional(),
      }),
    )
    .min(1, 'Minimal 1 benefit')
    .optional(),
  is_active: z.boolean().optional(),
  by: z.string(),
});

export type UpdateSubscriptionPackageDto = z.infer<
  typeof updateSubscriptionPackageSchema
>;
