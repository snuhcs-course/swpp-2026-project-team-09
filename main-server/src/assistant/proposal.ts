/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { type PublishedGlobalEventDto } from '../global-events/dto/global-event.dto.js';
import { JoinPolicy, QuestBoard } from '../generated/prisma/client.js';
import {
  descriptionSchema,
  type SubQuestContentDto,
  subQuestContentSchema,
  titleSchema,
} from '../quests/dto/quest-requests.dto.js';
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

// A Proposal that changes a 파티 already made, in place (P05 ticket 30): its 바꾸기 sends `step` as it is to the room's
// 일정 수정, `PUT /quests/:questId/sub-quests/:subQuestId`, which tells the other Holders as a change in the room does.
// `told` is how many other Holders that is, for the line after it.
export interface ProposalChange {
  questId: string;
  subQuestId: string;
  step: SubQuestContentDto;
  told: number;
}

// The Proposal of a reply. Its Global Event is whole, as the 행사 tab's cards are, so that the app fills the form's
// 관련 행사 and makes the Quest without asking for it. With `change`, it changes the made 파티 instead of making one.
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
  change?: ProposalChange;
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
  // The Quest 만들기 made of it, once made: the model reads it as a 파티 already posted, which proposeQuest does not
  // propose again.
  madeQuestId: z.uuid().optional(),
  // The change of a made 파티 it showed, before 바꾸기 was pressed: its 파티 is made, as above.
  change: z
    .strictObject({ questId: z.uuid(), subQuestId: z.uuid(), step: subQuestContentSchema, told: z.int().min(0) })
    .optional(),
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
export function proposalForModel({
  globalEvent,
  invitees,
  place,
  ...values
}: Omit<SentProposal, 'madeQuestId' | 'change'>): object {
  return {
    ...values,
    place: place === null ? null : { id: place.id, name: place.name },
    globalEvent:
      globalEvent === null ? null : { id: globalEvent.id, title: othersText('globalEvent.title', globalEvent.title) },
    invitees: invitees.map(({ id, name }) => ({ id, name: othersText('friend.name', name) })),
  };
}

// The Proposal of a reply as it is sent back, without its change, which the model is told of apart.
export function sentProposalOf({ change: _change, ...proposal }: QuestProposal): Omit<SentProposal, 'change'> {
  const { globalEvent } = proposal;
  return { ...proposal, globalEvent: globalEvent === null ? null : { id: globalEvent.id, title: globalEvent.title } };
}

// The id of the 파티 the last Proposal sent back stands for: the one made of it, or the one it showed a change of.
export function madeQuestIdOf(shown: SentProposal | null): string | undefined {
  return shown?.madeQuestId ?? shown?.change?.questId;
}
