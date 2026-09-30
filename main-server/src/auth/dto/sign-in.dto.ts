import { z } from 'zod';

// The ID token the app obtained from Google Sign-In.
export const signInSchema = z.object({
  idToken: z.string().min(1),
});

export type SignInDto = z.infer<typeof signInSchema>;
