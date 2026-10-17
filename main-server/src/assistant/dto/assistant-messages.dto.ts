/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { z } from 'zod';

// The conversation so far, as the app keeps it, the User's new message last. The server stores none of it.
export const assistantMessagesSchema = z.strictObject({
  messages: z
    .array(z.strictObject({ role: z.enum(['user', 'assistant']), text: z.string().trim().min(1) }))
    .min(1)
    .refine((messages) => messages.at(-1)?.role === 'user', "The last message must be the User's"),
});

export type AssistantMessages = z.infer<typeof assistantMessagesSchema>;

// The Assistant's reply, whole.
export interface AssistantReplyDto {
  text: string;
}
