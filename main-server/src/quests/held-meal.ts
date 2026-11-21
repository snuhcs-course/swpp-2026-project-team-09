/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
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
}

const DAY_MS = 24 * 60 * 60 * 1000;

export async function heldMealOf(
  db: Pick<Prisma.TransactionClient, 'quest'>,
  userId: string,
  { date, meal }: { date: string; meal: Meal },
): Promise<HeldMeal | null> {
  const dayStart = new Date(`${date}T00:00:00+09:00`);
  const quest = await db.quest.findFirst({
    where: {
      meal,
      holders: { some: { userId } },
      subQuests: { some: { startsAt: { gte: dayStart, lt: new Date(dayStart.getTime() + DAY_MS) } } },
    },
    include: {
      subQuests: { orderBy: [{ startsAt: 'asc' }, { id: 'asc' }] },
      holders: { include: { user: { select: { name: true } } }, orderBy: [{ joinedAt: 'asc' }, { id: 'asc' }] },
      invitations: { include: { user: { select: { name: true } } }, orderBy: [{ sentAt: 'asc' }, { id: 'asc' }] },
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
  });
  if (quest === null) {
    return null;
  }
  return {
    id: quest.id,
    title: quest.title,
    startsAt: quest.subQuests[0]?.startsAt ?? dayStart,
    subQuestIds: quest.subQuests.map(({ id }) => id),
    others: [
      ...quest.holders.filter((holder) => holder.userId !== userId).map(({ user }) => user.name),
      ...quest.invitations.map(({ user }) => user.name),
    ],
  };
}
