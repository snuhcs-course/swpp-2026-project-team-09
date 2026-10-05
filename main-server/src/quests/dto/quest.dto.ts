import { GlobalEvent, GlobalEventState, JoinPolicy, Place, Prisma, SubQuest } from '../../generated/prisma/client.js';

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
  // Null for a Class Quest only.
  leader: HolderDto | null;
  capacity: number;
  joinPolicy: JoinPolicy;
  // In the order they entered.
  holders: HolderDto[];
  subQuests: SubQuestDto[];
  // Computed from the timetable and never stored (class-quests.service.ts).
  classQuest: boolean;
}

// A Quest as a User who does not hold it reads it: in the list of recruiting Quests, in a request to join it and in an
// invitation into it.
export interface QuestSummaryDto {
  id: string;
  title: string;
  globalEvent: { id: string; title: string } | null;
  leader: HolderDto;
  holderCount: number;
  capacity: number;
  joinPolicy: JoinPolicy;
}

// A Quest in the list of recruiting Quests.
export interface RecruitingQuestDto extends QuestSummaryDto {
  // The first Sub Quest ahead.
  nextSubQuest: Pick<SubQuestDto, 'id' | 'attending' | 'title' | 'startsAt' | 'endsAt' | 'place'>;
}

// Every Holder's progress, from which the reader's own is picked.
export const SUB_QUEST_INCLUDE = {
  place: true,
  progress: { select: { holder: { select: { userId: true } } } },
} satisfies Prisma.SubQuestInclude;

export const HOLDER_SELECT = { id: true, name: true, department: true } satisfies Prisma.UserSelect;

export const QUEST_SUMMARY_INCLUDE = {
  globalEvent: true,
  leader: { select: HOLDER_SELECT },
  holders: { select: { id: true } },
} satisfies Prisma.QuestInclude;

export const QUEST_INCLUDE = {
  globalEvent: true,
  leader: { select: HOLDER_SELECT },
  holders: { include: { user: { select: HOLDER_SELECT } }, orderBy: [{ joinedAt: 'asc' }, { id: 'asc' }] },
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
  return {
    title: subQuest.title ?? '',
    startsAt: subQuest.startsAt?.toISOString() ?? null,
    endsAt: subQuest.endsAt?.toISOString() ?? null,
    place: toPlaceDto(subQuest),
    cancelled: false,
  };
}

// The stored Place, or the stored point with its label, or null when there is neither.
export function toPlaceDto({
  place,
  latitude,
  longitude,
  placeLabel,
}: Pick<SubQuest, 'latitude' | 'longitude' | 'placeLabel'> & { place: Place | null }): SubQuestPlaceDto | null {
  if (place !== null) {
    return { placeId: place.id, label: place.name, latitude: place.latitude, longitude: place.longitude };
  }
  return latitude === null || longitude === null || placeLabel === null
    ? null
    : { placeId: null, label: placeLabel, latitude, longitude };
}

// Ended for every Holder alike: cancelled, or its end time has passed by `now`.
function passed({ cancelled, endsAt }: Pick<SubQuestDto, 'cancelled' | 'endsAt'>, now: Date): boolean {
  return cancelled || (endsAt !== null && new Date(endsAt) <= now);
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
  return {
    id: subQuest.id,
    attending: subQuest.attending,
    ...content,
    completion: content.endsAt === null ? 'by_hand' : 'by_time',
    done,
    ended: done || passed(content, now),
  };
}

// Whether a Sub Quest of the Quest has not passed for every Holder. A mark of done is one Holder's own and does not
// count.
export function hasSubQuestsAhead(quest: StoredQuest, now: Date): boolean {
  return quest.subQuests.some((subQuest) => !passed(contentOf(subQuest, quest.globalEvent), now));
}

export function toQuestDto(quest: StoredQuest, userId: string, now: Date): QuestDto {
  const { globalEvent } = quest;
  return {
    id: quest.id,
    title: quest.title,
    globalEvent: globalEvent === null ? null : { id: globalEvent.id, title: globalEvent.title },
    leader: quest.leader,
    capacity: quest.capacity,
    joinPolicy: quest.joinPolicy,
    holders: quest.holders.map(({ user }) => user),
    subQuests: quest.subQuests.map((subQuest) => toSubQuestDto(subQuest, globalEvent, userId, now)),
    classQuest: false,
  };
}

// Null for a Quest without a Sub Quest ahead, which is not in the list.
export function toRecruitingQuestDto(quest: StoredQuest, now: Date): RecruitingQuestDto | null {
  const { globalEvent } = quest;
  for (const subQuest of quest.subQuests) {
    const { cancelled, ...content } = contentOf(subQuest, globalEvent);
    if (!passed({ cancelled, endsAt: content.endsAt }, now)) {
      return {
        ...toQuestSummaryDto(quest),
        nextSubQuest: { id: subQuest.id, attending: subQuest.attending, ...content },
      };
    }
  }
  return null;
}

export function toQuestSummaryDto(
  quest: Prisma.QuestGetPayload<{ include: typeof QUEST_SUMMARY_INCLUDE }>,
): QuestSummaryDto {
  const { globalEvent } = quest;
  return {
    id: quest.id,
    title: quest.title,
    globalEvent: globalEvent === null ? null : { id: globalEvent.id, title: globalEvent.title },
    leader: quest.leader,
    holderCount: quest.holders.length,
    capacity: quest.capacity,
    joinPolicy: quest.joinPolicy,
  };
}
