/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type Prisma } from '../generated/prisma/client.js';

// The User's Quests of a day, as the Assistant knows them: those they hold, and those they were invited to and have
// not answered. Each starts that day in Korea. A Class is no Quest here: the Timetable gives the Classes.

export type KeptKind = 'meal-lunch' | 'meal-dinner' | 'meet' | 'event' | 'seat' | 'other';

// How each of the others stands to it: the Leader, a Holder, an invitation waiting, or one declined.
export type KeptAnswer = 'leads' | 'accepted' | 'waiting' | 'declined';

export interface KeptQuest {
  kind: KeptKind;
  questId: string;
  title: string;
  start: Date;
  end: Date | null;
  // The first step's Place, else the words the User gave for it; both null for a step without one.
  placeId: string | null;
  placeLabel: string | null;
  // The others of it, in the order of the Leader, the Holders, the invited, the declined; never the User. A User who only
  // holds an invitation sees the Holders alone, as the invitation card shows them; a Holder sees everyone, as a Quest's
  // members show them.
  people: { userId: string; name: string; answer: KeptAnswer }[];
  // The User leads it.
  mine: boolean;
  // The User may change it from the Assistant: theirs, shared with nobody (no other Holder, and no invited Friend who has
  // not declined), for no Global Event, no seat, and not under way.
  changeable: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const NAME = { select: { name: true } } as const;

const KEPT_INCLUDE = {
  subQuests: { orderBy: [{ startsAt: 'asc' }, { id: 'asc' }] },
  holders: { include: { user: NAME }, orderBy: [{ joinedAt: 'asc' }, { id: 'asc' }] },
  invitations: { include: { user: NAME }, orderBy: [{ sentAt: 'asc' }, { id: 'asc' }] },
  declines: { include: { user: NAME }, orderBy: [{ declinedAt: 'asc' }, { id: 'asc' }] },
} satisfies Prisma.QuestInclude;

type Stored = Prisma.QuestGetPayload<{ include: typeof KEPT_INCLUDE }>;

function kindOf({ meal, meet, globalEventId, seatStay }: Stored): KeptKind {
  if (meal === 'lunch' || meal === 'dinner') {
    return `meal-${meal}`;
  }
  if (meet) {
    return 'meet';
  }
  if (globalEventId !== null) {
    return 'event';
  }
  return seatStay ? 'seat' : 'other';
}

function peopleOf({ leaderId, holders, invitations, declines }: Stored, userId: string): KeptQuest['people'] {
  const leader = holders.find((holder) => holder.userId === leaderId);
  const answered = [
    ...(leader === undefined ? [] : [{ userId: leaderId, name: leader.user.name, answer: 'leads' as const }]),
    ...holders
      .filter((holder) => holder.userId !== leaderId)
      .map(({ userId: id, user }) => ({ userId: id, name: user.name, answer: 'accepted' as const })),
    ...invitations.map(({ userId: id, user }) => ({ userId: id, name: user.name, answer: 'waiting' as const })),
    ...declines.map(({ userId: id, user }) => ({ userId: id, name: user.name, answer: 'declined' as const })),
  ];
  const holds = holders.some((holder) => holder.userId === userId);
  return answered.filter(
    (person) => person.userId !== userId && (holds || person.answer === 'leads' || person.answer === 'accepted'),
  );
}

function keptOf(quest: Stored, userId: string, now: Date): KeptQuest | null {
  const [first] = quest.subQuests;
  const start = first?.startsAt ?? null;
  if (start === null) {
    return null;
  }
  const end = quest.subQuests.at(-1)?.endsAt ?? null;
  const mine = quest.leaderId === userId;
  const underWay = start <= now && (end === null || now < end);
  const people = peopleOf(quest, userId);
  const shared = people.some(({ answer }) => answer !== 'declined');
  return {
    kind: kindOf(quest),
    questId: quest.id,
    title: quest.title,
    start,
    end,
    placeId: first?.placeId ?? null,
    placeLabel: first?.placeLabel ?? null,
    people,
    mine,
    changeable: mine && !shared && quest.globalEventId === null && !quest.seatStay && !underWay,
  };
}

// In the order they start: those of `date`, or of `days` days from it.
export async function keptQuestsOf(
  db: Pick<Prisma.TransactionClient, 'quest'>,
  userId: string,
  { date, now, days = 1 }: { date: string; now: Date; days?: number },
): Promise<KeptQuest[]> {
  const dayStart = new Date(`${date}T00:00:00+09:00`);
  const quests = await db.quest.findMany({
    where: {
      OR: [{ holders: { some: { userId } } }, { invitations: { some: { userId } } }],
      subQuests: { some: { startsAt: { gte: dayStart, lt: new Date(dayStart.getTime() + days * DAY_MS) } } },
    },
    include: KEPT_INCLUDE,
  });
  return quests
    .flatMap((quest) => {
      const kept = keptOf(quest, userId, now);
      return kept === null || kept.start < dayStart ? [] : [kept];
    })
    .toSorted((one, other) => one.start.getTime() - other.start.getTime());
}
