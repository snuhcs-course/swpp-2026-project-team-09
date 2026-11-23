/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type Meal, type Prisma } from '../generated/prisma/client.js';

// The meal a User already holds for a day: a Quest made from a meal's Plan for that meal (`meal`), whose first Sub
// Quest starts that day in Korea. A new Plan for the same meal sets it aside, and making that Plan replaces it.
export interface HeldMeal {
  id: string;
  title: string;
  startsAt: Date;
  // Its Sub Quests, which the new Plan leaves out of everyone's day.
  subQuestIds: string[];
  // The other Holders, then the invited, by name: a meal with any is shared, and never replaced from a new Plan.
  others: string[];
  // The same people, by id, in the same order, and those of them whose invitation waits.
  otherIds: string[];
  invitedIds: string[];
  // The meal's own step, its last: where and when they eat, which adding a Friend keeps.
  meal: { placeId: string | null; startsAt: Date };
}

// A meal the User was invited to and does not hold: its start, and its Holders, the Leader first, by name, as the
// invitation card shows them.
export interface InvitedMeal {
  id: string;
  startsAt: Date;
  holders: string[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

const NAME = { include: { user: { select: { name: true } } } } as const;

const onDay = (date: string): { gte: Date; lt: Date } => {
  const dayStart = new Date(`${date}T00:00:00+09:00`);
  return { gte: dayStart, lt: new Date(dayStart.getTime() + DAY_MS) };
};

export async function heldMealOf(
  db: Pick<Prisma.TransactionClient, 'quest'>,
  userId: string,
  { date, meal }: { date: string; meal: Meal },
): Promise<HeldMeal | null> {
  const dayStart = new Date(`${date}T00:00:00+09:00`);
  const quest = await db.quest.findFirst({
    where: { meal, holders: { some: { userId } }, subQuests: { some: { startsAt: onDay(date) } } },
    include: {
      subQuests: { orderBy: [{ startsAt: 'asc' }, { id: 'asc' }] },
      holders: { ...NAME, orderBy: [{ joinedAt: 'asc' }, { id: 'asc' }] },
      invitations: { ...NAME, orderBy: [{ sentAt: 'asc' }, { id: 'asc' }] },
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
  });
  if (quest === null) {
    return null;
  }
  const others = [...quest.holders.filter((holder) => holder.userId !== userId), ...quest.invitations];
  const last = quest.subQuests.at(-1);
  return {
    id: quest.id,
    title: quest.title,
    startsAt: quest.subQuests[0]?.startsAt ?? dayStart,
    subQuestIds: quest.subQuests.map(({ id }) => id),
    others: others.map(({ user }) => user.name),
    otherIds: others.map((other) => other.userId),
    invitedIds: quest.invitations.map((invitation) => invitation.userId),
    meal: { placeId: last?.placeId ?? null, startsAt: last?.startsAt ?? dayStart },
  };
}

// The meal of that day the User holds only an invitation to, the latest made; null when none.
export async function invitedMealOf(
  db: Pick<Prisma.TransactionClient, 'quest'>,
  userId: string,
  { date, meal }: { date: string; meal: Meal },
): Promise<InvitedMeal | null> {
  const quest = await db.quest.findFirst({
    where: {
      meal,
      invitations: { some: { userId } },
      holders: { none: { userId } },
      subQuests: { some: { startsAt: onDay(date) } },
    },
    include: {
      subQuests: { orderBy: [{ startsAt: 'asc' }, { id: 'asc' }] },
      holders: { ...NAME, orderBy: [{ joinedAt: 'asc' }, { id: 'asc' }] },
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
  });
  if (quest === null) {
    return null;
  }
  const leader = quest.holders.filter((holder) => holder.userId === quest.leaderId);
  const rest = quest.holders.filter((holder) => holder.userId !== quest.leaderId);
  return {
    id: quest.id,
    startsAt: quest.subQuests.at(-1)?.startsAt ?? new Date(`${date}T00:00:00+09:00`),
    holders: [...leader, ...rest].map(({ user }) => user.name),
  };
}
