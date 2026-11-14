/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { z } from 'zod';

// An Expo push token, at most 199 characters.
export const pushTokenSchema = z.strictObject({
  token: z.string().regex(/^Expo(nent)?PushToken\[[^\]\s]{1,180}\]$/u),
});

export type PushTokenDto = z.infer<typeof pushTokenSchema>;
