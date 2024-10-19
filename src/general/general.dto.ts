import { z } from 'zod';

export const createFeedbackSchema = z.object({
  user_id: z.string(),
  fullname: z.string(),
  text: z.string(),
  rating: z.number().positive().min(1),
});

export type CreateFeedbackDto = z.infer<typeof createFeedbackSchema>;
