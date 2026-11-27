/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Inject, Injectable } from '@nestjs/common';
import { type StudyInput } from '../assistant/dto/answer.dto.js';
import { studyInputSchema } from '../assistant/dto/plan-input.dto.js';
import { type Catalogue } from '../assistant/library/catalogue.js';
import { StudyGroupService } from '../assistant/lookup/study-group.service.js';
import { withRequest } from '../assistant/lookup/study-group-locked.js';
import { PrismaService } from '../common/prisma.service.js';
import { type RoomRequest, RoomRequestStatus } from '../generated/prisma/client.js';
import { CLOCK, type Clock } from '../quests/clock.js';
import { type RoomRequestAnswerDto } from './dto/room-request.dto.js';
import {
  ACTIVE,
  countsOf,
  type HeldRequest,
  isIn,
  moreNeededOf,
  notRequester,
  requestNotFound,
} from './room-request-parts.js';
import { ROOM_CATALOGUE, RoomRequestSync } from './room-request-sync.service.js';

// The study answer of a room request sent from one (P10 ticket 08), rebuilt for the requester's card: at the request's
// room kind, day, start and length, for its people, from the study input it kept or from the request alone.

const LAST = Number.MAX_SAFE_INTEGER;

// The companions in the order the kept input lists them, the others after them.
function inOrder(ids: readonly string[], kept: StudyInput | null): string[] {
  const rank = (id: string): number => {
    const index = kept?.people.findIndex(({ userId }) => userId === id) ?? -1;
    return index === -1 ? LAST : index;
  };
  return ids.toSorted((a, b) => rank(a) - rank(b));
}

// The kept input, or one made from the request, at the request's day, length and room kind, for its people.
function lockedInputOf(request: RoomRequest, kept: StudyInput | null, people: readonly string[]): StudyInput {
  const constraintsOf = (id: string): StudyInput['people'][number]['constraints'] =>
    kept?.people.find(({ userId }) => userId === id)?.constraints ?? [];
  return {
    kind: 'study',
    date: request.date,
    what: kept?.what ?? 'any',
    people: people.map((userId) => ({ userId, constraints: constraintsOf(userId) })),
    together: true,
    window: kept?.window ?? { from: null, until: null },
    area: null,
    minutes: request.minutes,
    chosen: { seatSpaceId: kept?.chosen.seatSpaceId ?? null, roomSpaceId: request.spaceId },
  };
}

@Injectable()
export class RoomAnswersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sync: RoomRequestSync,
    private readonly groups: StudyGroupService,
    @Inject(ROOM_CATALOGUE) private readonly catalogue: Catalogue,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  // The requester's only, as the companions' details are; read after the expiries and deadlines, as GET …/:id is.
  async answer(userId: string, requestId: string): Promise<RoomRequestAnswerDto> {
    const now = this.clock.now();
    await this.sync.expireDue(now);
    const request = await this.prisma.roomRequest.findUnique({
      where: { id: requestId },
      include: { consents: { orderBy: [{ askedAt: 'asc' }, { userId: 'asc' }] } },
    });
    if (request === null) {
      return requestNotFound();
    }
    if (request.requesterId !== userId) {
      throw notRequester();
    }
    const parsed = studyInputSchema.safeParse(request.studyInput);
    const kept = parsed.success ? parsed.data : null;
    const companionIds = inOrder(await this.companionsOf(request), kept);
    const users = await this.prisma.user.findMany({
      where: { id: { in: companionIds } },
      select: { id: true, name: true },
    });
    const nameOf = (id: string): string => users.find((user) => user.id === id)?.name ?? '';
    const { id, status, spaceId, date, start, minutes, consents } = request;
    const moreNeeded = ACTIVE.includes(status)
      ? moreNeededOf(this.catalogue.byId.get(spaceId), consents.filter((consent) => isIn(consent)).length)
      : 0;
    const input = lockedInputOf(request, kept, [userId, ...companionIds]);
    const sent = {
      spaceId,
      date,
      start,
      minutes,
      moreNeeded,
      names: companionIds.map((companion) => nameOf(companion)),
    };
    const answer = await this.groups.locked(userId, input, sent, now);
    const waiting = companionIds.filter((companion) =>
      consents.some((consent) => consent.userId === companion && consent.consented === null),
    );
    return withRequest(answer, {
      id,
      status,
      ...countsOf(status, consents, companionIds.length),
      waiting: waiting.map((companion) => nameOf(companion)),
      moreNeeded,
    });
  }

  // The companions still in while it gathers or is ready; once booked, its Quest's other Holders, since the consents go
  // at booked; none once it ended.
  private async companionsOf(request: HeldRequest): Promise<string[]> {
    if (ACTIVE.includes(request.status)) {
      return request.consents.filter((consent) => isIn(consent)).map(({ userId }) => userId);
    }
    if (request.status !== RoomRequestStatus.booked) {
      return [];
    }
    const holders = await this.prisma.questHolder.findMany({
      where: { questId: request.questId, userId: { not: request.requesterId } },
      orderBy: [{ joinedAt: 'asc' }, { id: 'asc' }],
      select: { userId: true },
    });
    return holders.map(({ userId }) => userId);
  }
}
