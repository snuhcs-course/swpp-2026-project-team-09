/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Prisma, RoomConsent } from '../generated/prisma/client.js';
import { type Told } from '../notifications/notification.js';
import { type HeldRequest, isIn, type Settling } from './room-request-parts.js';

// Companions going out of a room request and what the booker is told (README.md: Group study room requests), for
// RoomRequestSync.

// A companion going out: by an answer or a change (answered), or by not answering in time.
export interface Leaving {
  userId: string;
  answered: boolean;
}

export interface QuestNow {
  holders: Set<string>;
  invited: Set<string>;
}

export async function questNow(tx: Prisma.TransactionClient, questId: string): Promise<QuestNow | null> {
  const quest = await tx.quest.findUnique({
    where: { id: questId },
    select: { holders: { select: { userId: true } }, invitations: { select: { userId: true } } },
  });
  return quest === null
    ? null
    : {
        holders: new Set(quest.holders.map(({ userId }) => userId)),
        invited: new Set(quest.invitations.map(({ userId }) => userId)),
      };
}

async function namesOf(tx: Prisma.TransactionClient, userIds: readonly string[]): Promise<Map<string, string>> {
  if (userIds.length === 0) {
    return new Map();
  }
  const users = await tx.user.findMany({ where: { id: { in: [...userIds] } }, select: { id: true, name: true } });
  return new Map(users.map(({ id, name }) => [id, name]));
}

// What the booker is told of each companion gone, with how many more the room needs now.
export async function declinedTolds(
  tx: Prisma.TransactionClient,
  request: HeldRequest,
  gone: readonly Leaving[],
  roomLabel: string,
  moreNeeded: number,
): Promise<Told[]> {
  const names = await namesOf(
    tx,
    gone.map(({ userId }) => userId),
  );
  return gone.map(({ userId }) => ({
    kind: 'room-declined',
    questId: request.questId,
    roomLabel,
    friendId: userId,
    friendName: names.get(userId) ?? '',
    moreNeeded,
  }));
}

// What the booker is told when every companion in the request agreed.
export async function agreedTold(tx: Prisma.TransactionClient, request: HeldRequest, roomLabel: string): Promise<Told> {
  const companions = request.consents.filter(isIn).map(({ userId }) => userId);
  const names = await namesOf(tx, companions);
  return {
    kind: 'room-agreed',
    questId: request.questId,
    roomLabel,
    date: request.date,
    start: request.start,
    minutes: request.minutes,
    names: companions.map((userId) => names.get(userId) ?? ''),
  };
}

// Those leaving who are still in the request, and the companions no longer in the Quest. One of a booking party who
// has not answered yet waits on their invitation.
export function goingOut(request: HeldRequest, { holders, invited }: QuestNow, leaving: readonly Leaving[]): Leaving[] {
  const asked = (userId: string): boolean =>
    request.consents.some((consent) => consent.userId === userId && isIn(consent));
  const stays = ({ userId, consented }: RoomConsent): boolean =>
    holders.has(userId) || (request.madeForBooking && invited.has(userId) && consented !== true);
  const strayed = request.consents
    .filter((consent) => isIn(consent) && !stays(consent) && !leaving.some(({ userId }) => userId === consent.userId))
    .map(({ userId }) => ({ userId, answered: true }));
  return [...leaving.filter(({ userId }) => asked(userId)), ...strayed];
}

// Sets their consents out and takes them out of a booking party made for the request: their invitation goes, or
// they stop holding it. An existing Quest keeps them. Answers the consents as they are then.
export async function takeOut(
  settling: Settling,
  request: HeldRequest,
  gone: readonly Leaving[],
  now: Date,
): Promise<RoomConsent[]> {
  for (const { userId, answered } of gone) {
    // oxlint-disable-next-line no-await-in-loop -- one companion at a time, in the request's transaction
    await settling.tx.roomConsent.update({
      where: { requestId_userId: { requestId: request.id, userId } },
      data: { consented: false, answeredAt: answered ? now : null },
    });
    if (request.madeForBooking) {
      // oxlint-disable-next-line no-await-in-loop -- as above
      await leaveBookingParty(settling, request, userId);
    }
  }
  return request.consents.map((consent) => {
    const out = gone.find(({ userId }) => userId === consent.userId);
    return out === undefined ? consent : { ...consent, consented: false, answeredAt: out.answered ? now : null };
  });
}

async function leaveBookingParty(settling: Settling, request: HeldRequest, userId: string): Promise<void> {
  const { tx } = settling;
  const where = { questId: request.questId, userId };
  const invitations = await tx.questInvitation.deleteMany({ where });
  const holders = await tx.questHolder.deleteMany({ where });
  if (invitations.count + holders.count === 0) {
    return;
  }
  await tx.quest.updateMany({
    where: { id: request.questId, leaderId: userId },
    data: { leaderId: request.requesterId },
  });
  const left = await tx.questHolder.findMany({ where: { questId: request.questId }, select: { userId: true } });
  for (const id of [userId, ...left.map((holder) => holder.userId)]) {
    settling.questsChanged.add(id);
  }
}
