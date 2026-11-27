/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type PrismaService } from '../common/prisma.service.js';
import { RoomRequestStatus } from '../generated/prisma/client.js';
import { countsOf } from '../library/room-request-parts.js';
import { type QuestRooms, type QuestRoomRequestDto, type StoredQuest } from './dto/quest.dto.js';

// The room request each booking party among the Quests was made for (P10), by the Quest's id, for the map's Quest tag.
// A Quest a request only asks the Holders of is no booking party. Once booked, the companions are its other Holders.
export async function roomRequestsOf(
  prisma: PrismaService,
  quests: readonly Pick<StoredQuest, 'id' | 'holders'>[],
): Promise<Map<string, QuestRoomRequestDto>> {
  const requests = await prisma.roomRequest.findMany({
    where: { questId: { in: quests.map(({ id }) => id) }, madeForBooking: true },
    select: { id: true, questId: true, status: true, consents: { select: { consented: true } } },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });
  return new Map(
    requests.map(({ id, questId, status, consents }) => {
      const holders = quests.find((quest) => quest.id === questId)?.holders.length ?? 1;
      return [questId, { id, status, ...countsOf(status, consents, Math.max(0, holders - 1)) }];
    }),
  );
}

// The room each Quest's latest booked room request was booked in, as the library names it (P05 ticket 68): a booking
// party's, or that of a Quest whose Holders were asked. Only Holders are shown a Quest.
export async function bookedRoomsOf(prisma: PrismaService, questIds: readonly string[]): Promise<Map<string, string>> {
  const booked = await prisma.roomRequest.findMany({
    where: { questId: { in: [...questIds] }, status: RoomRequestStatus.booked, bookedRoom: { not: null } },
    select: { questId: true, bookedRoom: true },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });
  return new Map(booked.flatMap(({ questId, bookedRoom }) => (bookedRoom === null ? [] : [[questId, bookedRoom]])));
}

// Each Quest's room request and booked room, by the Quest's id, for QuestDto.
export async function questRoomsOf(
  prisma: PrismaService,
  quests: readonly Pick<StoredQuest, 'id' | 'holders'>[],
): Promise<(questId: string) => QuestRooms> {
  const [requests, booked] = await Promise.all([
    roomRequestsOf(prisma, quests),
    bookedRoomsOf(
      prisma,
      quests.map(({ id }) => id),
    ),
  ]);
  return (questId) => ({ request: requests.get(questId) ?? null, booked: booked.get(questId) ?? null });
}
