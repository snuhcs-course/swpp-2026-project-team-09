import { GlobalEvent, GlobalEventState, Prisma, SubQuest } from '../../generated/prisma/client.js';

// A Place from the list, with its id, or a point with the label the app showed. The attending Sub Quest's is the
// Global Event's position and place text.
export interface SubQuestPlaceDto {
  placeId: string | null;
  label: string;
  latitude: number;
  longitude: number;
}

export interface SubQuestDto {
  id: string;
  // Follows the Global Event: no Holder edits or cancels it.
  attending: boolean;
  title: string;
  startsAt: string | null;
  endsAt: string | null;
  place: SubQuestPlaceDto | null;
  // How it ends: by its end time passing, or by the Holder marking it done.
  completion: 'by_time' | 'by_hand';
  // Only the attending Sub Quest is ever cancelled, with its Global Event.
  cancelled: boolean;
  // Marked done by the User who reads it.
  done: boolean;
  // For the User who reads it.
  ended: boolean;
}

export interface HolderDto {
  id: string;
  name: string;
  department: string;
}

export interface QuestDto {
  id: string;
  title: string;
  globalEvent: { id: string; title: string } | null;
  holders: HolderDto[];
  subQuests: SubQuestDto[];
}

// Every Holder's progress, from which the reader's own is picked.
export const SUB_QUEST_INCLUDE = {
  place: true,
  progress: { select: { holder: { select: { userId: true } } } },
} satisfies Prisma.SubQuestInclude;

export const QUEST_INCLUDE = {
  globalEvent: true,
  holders: {
    include: { user: { select: { id: true, name: true, department: true } } },
    orderBy: [{ user: { name: 'asc' } }, { userId: 'asc' }],
  },
  subQuests: { include: SUB_QUEST_INCLUDE, orderBy: [{ attending: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }] },
} satisfies Prisma.QuestInclude;

type StoredSubQuest = Prisma.SubQuestGetPayload<{ include: typeof SUB_QUEST_INCLUDE }>;

type StoredQuest = Prisma.QuestGetPayload<{ include: typeof QUEST_INCLUDE }>;

// The content of the attending Sub Quest is the Global Event's as it is now.
function contentOf(
  subQuest: StoredSubQuest,
  globalEvent: GlobalEvent | null,
): Pick<SubQuestDto, 'title' | 'startsAt' | 'endsAt' | 'place' | 'cancelled'> {
  if (subQuest.attending && globalEvent !== null) {
    const { latitude, longitude } = globalEvent;
    return {
      title: globalEvent.title,
      startsAt: globalEvent.startsAt?.toISOString() ?? null,
      endsAt: globalEvent.endsAt?.toISOString() ?? null,
      place:
        latitude === null || longitude === null
          ? null
          : { placeId: null, label: globalEvent.place ?? '', latitude, longitude },
      cancelled: globalEvent.state !== GlobalEventState.published,
    };
  }
  const { place } = subQuest;
  return {
    title: subQuest.title ?? '',
    startsAt: subQuest.startsAt?.toISOString() ?? null,
    endsAt: subQuest.endsAt?.toISOString() ?? null,
    place:
      place === null
        ? pointOf(subQuest)
        : { placeId: place.id, label: place.name, latitude: place.latitude, longitude: place.longitude },
    cancelled: false,
  };
}

function pointOf({ latitude, longitude, placeLabel }: SubQuest): SubQuestPlaceDto | null {
  return latitude === null || longitude === null || placeLabel === null
    ? null
    : { placeId: null, label: placeLabel, latitude, longitude };
}

// As `userId` reads it. Ended is computed at `now` and never stored.
export function toSubQuestDto(
  subQuest: StoredSubQuest,
  globalEvent: GlobalEvent | null,
  userId: string,
  now: Date,
): SubQuestDto {
  const content = contentOf(subQuest, globalEvent);
  const done = subQuest.progress.some(({ holder }) => holder.userId === userId);
  const passed = content.endsAt !== null && new Date(content.endsAt) <= now;
  return {
    id: subQuest.id,
    attending: subQuest.attending,
    ...content,
    completion: content.endsAt === null ? 'by_hand' : 'by_time',
    done,
    ended: content.cancelled || done || passed,
  };
}

export function toQuestDto(quest: StoredQuest, userId: string, now: Date): QuestDto {
  const { globalEvent } = quest;
  return {
    id: quest.id,
    title: quest.title,
    globalEvent: globalEvent === null ? null : { id: globalEvent.id, title: globalEvent.title },
    holders: quest.holders.map(({ user }) => user),
    subQuests: quest.subQuests.map((subQuest) => toSubQuestDto(subQuest, globalEvent, userId, now)),
  };
}
