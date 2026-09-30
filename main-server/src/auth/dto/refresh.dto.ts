import { z } from 'zod';

// The refresh token the app received at sign-in or at its last refresh.
export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export type RefreshDto = z.infer<typeof refreshSchema>;
