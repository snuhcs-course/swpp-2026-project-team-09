/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { JoinPolicy, QuestBoard } from '../../generated/prisma/client.js';

// Every field may be left out, and an id may be any text, so that the tool, not the model library, says which are
// missing or wrong.
export const input = z.object({
  title: z.string().optional().describe('The 파티 title, short, as its post shows it.'),
  description: z
    .string()
    .optional()
    .describe(
      "The recruiting post's text. When the User gave none for a 공개 파티, write a short one from their request.",
    ),
  joinPolicy: z
    .enum(JoinPolicy)
    .optional()
    .describe(
      'open (공개, 바로 참여): anyone joins at once; approval (공개, 승인 후 참여): the User approves each; closed (비공개): only the invited Friends, on no Board.',
    ),
  board: z
    .enum(QuestBoard)
    .optional()
    .describe(
      'The Board a 공개 파티 is posted on: meal 식사, career 진로, hobby 취미 (운동 too), show 공연. None for 비공개.',
    ),
  capacity: z.number().optional().describe('How many people the 파티 holds, the User included.'),
  startsAt: z
    .string()
    .optional()
    .describe(
      'When it starts, as an ISO date and time with its offset, such as 2027-01-05T12:00:00+09:00. With a Global Event, leave it out to start at the event, or give a meeting time before it.',
    ),
  placeId: z
    .string()
    .optional()
    .describe('Where it meets: the id resolvePlace returned, or the one in [Proposal shown: …].'),
  globalEventId: z
    .string()
    .optional()
    .describe('The related event: the id resolveGlobalEvent returned, or the one in [Proposal shown: …].'),
  inviteeIds: z
    .array(z.string())
    .optional()
    .describe('The Friends to invite: ids resolveFriend returned, or those in [Proposal shown: …].'),
  another: z
    .boolean()
    .optional()
    .describe('true only when the User asked for another 파티 beside the one in [Proposal made: …].'),
});

export type Input = z.output<typeof input>;

// What is missing or wrong, by field, worded for the model to ask the User.
export type FieldFailures = Partial<Record<keyof Input, string>>;

export function isField(name: unknown): name is keyof Input {
  return typeof name === 'string' && Object.hasOwn(input.shape, name);
}
