import { z } from 'zod';
import { newProfileSchema } from '../../users/dto/new-profile.dto.js';

// The ID token the app obtained from Google Sign-In.
export const signInSchema = z.object({
  idToken: z.string().min(1),
});

export type SignInDto = z.infer<typeof signInSchema>;

// The app's sign-in. A new account's first one also carries the profile that the app's onboarding collected.
export const appSignInSchema = signInSchema.extend({
  profile: newProfileSchema.optional(),
});

export type AppSignInDto = z.infer<typeof appSignInSchema>;
