import { z } from 'zod';

export const sendWhatsappMessageSchema = z.object({
  leadId: z.string().cuid(),
  content: z.string().trim().min(1).max(4096)
});
