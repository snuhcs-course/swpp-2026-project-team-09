/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { z } from 'zod';
import { JoinPolicy, QuestBoard } from '../generated/prisma/client.js';
import { descriptionSchema, titleSchema } from '../quests/dto/quest-requests.dto.js';

// A Proposal: a Quest the Assistant filled in, which does not exist until the User makes it with 만들기. It holds what
// the party form fills from: an Open or Approval Quest (the form's 공개, 바로 참여 or 승인 후 참여) on a Board, with its
// capacity and when it starts, in Korea time. The app sends the last one back with the conversation, and proposeQuest
// checks it again, so this shape bounds only its size.
export const questProposalSchema = z.strictObject({
  title: titleSchema,
  description: descriptionSchema,
  joinPolicy: z.enum([JoinPolicy.open, JoinPolicy.approval]),
  board: z.enum(QuestBoard),
  capacity: z.int(),
  startsAt: z.iso.datetime({ offset: true }),
});

export type QuestProposal = z.infer<typeof questProposalSchema>;

// What a Proposal adds to the length of the messages it is sent back with: its text. The other values are short.
export function proposalLength({ title, description }: QuestProposal): number {
  return title.length + description.length;
}
