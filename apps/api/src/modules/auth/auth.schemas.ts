import { z } from 'zod';

const passwordSchema = z.string().min(8, 'A senha deve ter ao menos 8 caracteres.').max(128);

export const setupAdminSchema = z.object({
  name: z.string().trim().min(2, 'Informe seu nome.').max(120),
  email: z.string().trim().email('Informe um e-mail válido.').toLowerCase(),
  password: passwordSchema
});

export const loginSchema = z.object({
  email: z.string().trim().email('Informe um e-mail válido.').toLowerCase(),
  password: passwordSchema
});

export type SetupAdminInput = z.infer<typeof setupAdminSchema>;
