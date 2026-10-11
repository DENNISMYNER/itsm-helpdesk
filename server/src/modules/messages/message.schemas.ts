import { z } from 'zod';

export const postMessageSchema = z.object({
  body: z.string().trim().min(1, 'Message cannot be empty').max(4000, 'Message is too long'),
  /** Internal notes are visible to staff only. */
  isInternal: z.boolean().default(false),
});
export type PostMessageInput = z.infer<typeof postMessageSchema>;
