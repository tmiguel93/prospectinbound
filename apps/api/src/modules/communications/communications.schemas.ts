import { z } from 'zod';

export const internalMessageSchema = z.object({
  content: z.string().trim().min(1).max(4096)
});
