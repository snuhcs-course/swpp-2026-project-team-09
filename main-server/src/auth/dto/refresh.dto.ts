// AI-generated with Claude Opus 5.5, 2026-09-30, prompted by TaeHyun79, reviewed by fyoon46 in #9
import { z } from 'zod';

// The refresh token the app received at sign-in or at its last refresh.
export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export type RefreshDto = z.infer<typeof refreshSchema>;
