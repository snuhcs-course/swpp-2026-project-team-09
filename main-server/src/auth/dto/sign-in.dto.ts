/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-09-29  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { z } from 'zod';

// The ID token the app obtained from Google Sign-In.
export const signInSchema = z.object({
  idToken: z.string().min(1),
});

export type SignInDto = z.infer<typeof signInSchema>;
