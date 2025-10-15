import { z } from 'zod';

export type EventsQuery = {
  q?: string;
  page?: string;
  filter?: string;
  sort?: string;
};

export const createEventSchema = z.object({
  title: z.string(),
  university_name: z.string(),
  registration_date: z.string(),
  content: z.string(),
  province: z.string(),
});

export type CreateEventDto = z.infer<typeof createEventSchema>;

export const updateEventSchema = z.object({
  event_id: z.string(),
  title: z.string().optional(),
  university_name: z.string().optional(),
  registration_date: z.string().optional(),
  content: z.string().optional(),
  province: z.string().optional(),
});

export type UpdateEventDto = z.infer<typeof updateEventSchema>;
