/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { z } from 'zod';
import { type PublishedGlobalEventDto } from '../global-events/dto/global-event.dto.js';
import { JoinPolicy, QuestBoard } from '../generated/prisma/client.js';
import { descriptionSchema, titleSchema } from '../quests/dto/quest-requests.dto.js';
import { type FacilityBooking } from './facility-booking.js';
import { othersText } from './others-text.js';

// A Proposal: a Quest the Assistant filled in, which does not exist until the User makes it with 만들기. It holds what
// the party form fills from: a 공개 파티, Open or Approval, on a Board, or a 비공개 one (Closed) without one, with its
// capacity and when it starts, in Korea time, and the Place, the Global Event and the Friends to invite that the
// resolvers found, each with the words the card shows for it.

// A Place by its name, as a Sub Quest's place shows it, with the page where it is booked online, if one is known
// (seed/facility-booking.json), which the made card opens with 시설 예약하기.
export interface ProposalPlace {
  id: string;
  name: string;
  booking: FacilityBooking | null;
}

// A Friend to invite, by name and id only: never where they are.
export interface ProposalFriend {
  id: string;
  name: string;
}

// The Proposal of a reply. Its Global Event is whole, as the 행사 tab's cards are, so that the app fills the form's
// 관련 행사 and makes the Quest without asking for it.
export interface QuestProposal {
  title: string;
  description: string;
  joinPolicy: JoinPolicy;
  board: QuestBoard | null;
  capacity: number;
  startsAt: string;
  place: ProposalPlace | null;
  globalEvent: PublishedGlobalEventDto | null;
  invitees: ProposalFriend[];
}

// What the text of a name sent back may hold: no more than a Place's, a User's or an event's.
const nameSchema = z.string().max(200);

// The Proposal as the app sends the last one back: the same values, its Global Event by id and title, as cards go
// back by reference. proposeQuest checks them again, so this shape bounds only their size; the fields ticket 06 did
// not have may be left out.
export const questProposalSchema = z.strictObject({
  title: titleSchema,
  description: descriptionSchema,
  joinPolicy: z.enum(JoinPolicy),
  board: z.enum(QuestBoard).nullable(),
  capacity: z.int(),
  startsAt: z.iso.datetime({ offset: true }),
  // Its booking page is taken and dropped: proposeQuest finds it again from the table.
  place: z
    .strictObject({
      id: z.uuid(),
      name: nameSchema,
      booking: z
        .strictObject({ label: nameSchema, url: z.string().max(2000) })
        .nullable()
        .optional(),
    })
    .nullable()
    .default(null),
  globalEvent: z.strictObject({ id: z.uuid(), title: nameSchema }).nullable().default(null),
  // More than any capacity, so that only proposeQuest decides how many fit.
  invitees: z
    .array(z.strictObject({ id: z.uuid(), name: nameSchema }))
    .max(20)
    .default([]),
});

export type SentProposal = z.infer<typeof questProposalSchema>;

// What a Proposal adds to the length of the messages it is sent back with: its text and its names. The other values
// are short.
export function proposalLength({ title, description, place, globalEvent, invitees }: SentProposal): number {
  const names = [place?.name, globalEvent?.title, ...invitees.map(({ name }) => name)];
  return title.length + description.length + names.reduce((total, name) => total + (name?.length ?? 0), 0);
}

// The Proposal as the model reads it, in a tool's answer or sent back: the event's title and the Friends' names, which
// other people wrote, inside delimiters. The Place's booking page is the card's alone: the model is not told of it.
export function proposalForModel({ globalEvent, invitees, place, ...values }: SentProposal): object {
  return {
    ...values,
    place: place === null ? null : { id: place.id, name: place.name },
    globalEvent:
      globalEvent === null ? null : { id: globalEvent.id, title: othersText('globalEvent.title', globalEvent.title) },
    invitees: invitees.map(({ id, name }) => ({ id, name: othersText('friend.name', name) })),
  };
}

// The Proposal of a reply as it is sent back.
export function sentProposalOf(proposal: QuestProposal): SentProposal {
  const { globalEvent } = proposal;
  return { ...proposal, globalEvent: globalEvent === null ? null : { id: globalEvent.id, title: globalEvent.title } };
}
