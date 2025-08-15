import { z } from 'zod';

export type TopicQuery = {
  q?: string;
  page?: string;
  filter?: string;
  sort?: string;
};

export const createTopicSchema = z.object({
  name: z.string().min(1, { message: 'Nama wajib diisi' }).trim(),
});

export type CreateTopicDto = z.infer<typeof createTopicSchema>;

export const updateTopicSchema = z.object({
  topic_id: z.string().uuid(),
  name: z.string().min(1).trim().optional(),
});

export type UpdateTopicDto = z.infer<typeof updateTopicSchema>;
