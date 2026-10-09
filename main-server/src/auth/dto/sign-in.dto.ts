// AI-generated with Claude Opus 5.5, 2026-09-29, prompted by TaeHyun79, reviewed by fyoon46 in #5
import { z } from 'zod';

// The ID token the app obtained from Google Sign-In.
export const signInSchema = z.object({
  idToken: z.string().min(1),
});

export type SignInDto = z.infer<typeof signInSchema>;
