// AI-generated with Claude Opus 5.5, 2026-10-06, prompted by fyoon46, reviewed by TaeHyun79 in #44
import { z } from 'zod';
import { MeetupState, Prisma } from '../../generated/prisma/client.js';
import { placeSchema, subQuestContentSchema } from '../../quests/dto/quest-requests.dto.js';
import { HolderDto, SubQuestPlaceDto, toPlaceDto } from '../../quests/dto/quest.dto.js';

// The content of the Sub Quest that accepting it creates, with a start and a place required, and the Friend it is for.
export const proposeMeetupSchema = subQuestContentSchema.safeExtend({
  receiverId: z.uuid(),
  startsAt: z.iso.datetime({ offset: true }),
  place: placeSchema,
});

export type ProposeMeetupDto = z.infer<typeof proposeMeetupSchema>;

export interface MeetupDto {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  place: SubQuestPlaceDto | null;
  state: MeetupState | 'expired';
  proposer: HolderDto;
  receiver: HolderDto;
}

export interface MeetupsDto {
  received: MeetupDto[];
  sent: MeetupDto[];
}

const USER_SUMMARY = { select: { id: true, name: true, department: true } } as const;

export const MEETUP_INCLUDE = {
  place: true,
  proposer: USER_SUMMARY,
  receiver: USER_SUMMARY,
} satisfies Prisma.MeetupInclude;

type StoredMeetup = Prisma.MeetupGetPayload<{ include: typeof MEETUP_INCLUDE }>;

// A proposed Meetup whose start has passed at `now` is expired. Nothing stores it.
export function toMeetupDto(meetup: StoredMeetup, now: Date): MeetupDto {
  const expired = meetup.state === MeetupState.proposed && meetup.startsAt <= now;
  return {
    id: meetup.id,
    title: meetup.title,
    startsAt: meetup.startsAt.toISOString(),
    endsAt: meetup.endsAt?.toISOString() ?? null,
    place: toPlaceDto(meetup),
    state: expired ? 'expired' : meetup.state,
    proposer: meetup.proposer,
    receiver: meetup.receiver,
  };
}
