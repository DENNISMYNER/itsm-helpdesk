import { z } from 'zod';

const email = z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address'));

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email,
  // bcrypt only uses the first 72 bytes, so longer passwords add no security.
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must be at most 72 characters')
    .regex(/[A-Za-z]/, 'Password must contain a letter')
    .regex(/[0-9]/, 'Password must contain a number'),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required').max(72),
});
export type LoginInput = z.infer<typeof loginSchema>;
