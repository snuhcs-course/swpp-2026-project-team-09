/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { BadRequestException, ForbiddenException, HttpStatus } from '@nestjs/common';
import { type Refusal } from '../assistant/library/booking-rules.js';
import { type Catalogue } from '../assistant/library/catalogue.js';
import { Prisma, RoomConsent, RoomRequest, RoomRequestStatus } from '../generated/prisma/client.js';
import { conflict, notFound } from '../quests/refusals.js';
import { type PersonDto, type RoomRequestDto } from './dto/room-request.dto.js';
import { type RoomRequestSync } from './room-request-sync.service.js';

// What the room request services share: the statuses, the refusals and the reply.

export const DECLINED = '파티 구성원이 제안을 거절했습니다';

export const ACTIVE: RoomRequestStatus[] = [RoomRequestStatus.gathering, RoomRequestStatus.ready];

export type HeldRequest = RoomRequest & { consents: RoomConsent[] };

// One transaction's settling: whom to tell once it is stored.
export interface Settling {
  tx: Prisma.TransactionClient;
  told: Set<string>;
  questsChanged: Set<string>;
}

// The request was deleted, or never was.
export class RoomRequestGone extends Error {}

export const requestNotFound = (): never => {
  throw notFound('ROOM_REQUEST_NOT_FOUND', 'No such room request concerns this User.');
};

export const refusedWith = (refusals: Refusal[]): BadRequestException =>
  new BadRequestException({
    statusCode: HttpStatus.BAD_REQUEST,
    error: 'Bad Request',
    code: 'ROOM_REQUEST_REFUSED',
    message: refusals.map(({ reason }) => reason).join('\n'),
    refusals,
  });

export const refusedFor = (field: string, reason: string): BadRequestException => refusedWith([{ field, reason }]);

export const notRequester = (): ForbiddenException =>
  new ForbiddenException({
    statusCode: HttpStatus.FORBIDDEN,
    error: 'Forbidden',
    code: 'NOT_ROOM_REQUESTER',
    message: 'Only the User who made the room request does this.',
  });

export const notInStatus = (status: RoomRequestStatus): never => {
  throw conflict('ROOM_REQUEST_STATUS', `The room request is ${status}.`, { status });
};

export function startsAtOf(date: string, start: string): Date {
  return new Date(`${date}T${start}:00+09:00`);
}

// "11월 5일 15:00".
export function whenWords(date: string, start: string): string {
  const [, month = '', day = ''] = date.split('-');
  return `${Number(month)}월 ${Number(day)}일 ${start}`;
}

export function spaceOf(catalogue: Catalogue, spaceId: string): { id: string; name: string } {
  return { id: spaceId, name: catalogue.byId.get(spaceId)?.name ?? spaceId };
}

// The reply, with the Users by their display names.
export async function toRoomRequestDto(
  db: Prisma.TransactionClient,
  catalogue: Catalogue,
  request: HeldRequest,
): Promise<RoomRequestDto> {
  const ids = [request.requesterId, ...request.consents.map(({ userId }) => userId)];
  if (request.failedUserId !== null) {
    ids.push(request.failedUserId);
  }
  const users = await db.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
  const person = (userId: string): PersonDto => ({ userId, name: users.find(({ id }) => id === userId)?.name ?? '' });
  return {
    id: request.id,
    status: request.status,
    questId: request.questId,
    madeForBooking: request.madeForBooking,
    requester: person(request.requesterId),
    space: spaceOf(catalogue, request.spaceId),
    date: request.date,
    start: request.start,
    minutes: request.minutes,
    useDesc: request.useDesc,
    reason: request.reason,
    failed: request.failedUserId === null ? null : person(request.failedUserId),
    consents: request.consents.map(({ userId, consented }) => ({ ...person(userId), consented })),
  };
}

type Change<T> = (settling: Settling, request: HeldRequest) => Promise<T>;

// Settles the request, or answers 404 when there is none.
export async function settleOr404<T>(sync: RoomRequestSync, requestId: string, change: Change<T>): Promise<T> {
  try {
    return await sync.settle(requestId, change);
  } catch (error) {
    if (error instanceof RoomRequestGone) {
      return requestNotFound();
    }
    throw error;
  }
}

// Settles a request this User made.
export function settleOwn<T>(sync: RoomRequestSync, userId: string, requestId: string, change: Change<T>): Promise<T> {
  return settleOr404(sync, requestId, (settling, held) => {
    if (held.requesterId !== userId) {
      throw notRequester();
    }
    return change(settling, held);
  });
}

// Settles a request that asks this User and still gathers.
export function settleAsked(
  sync: RoomRequestSync,
  userId: string,
  requestId: string,
  change: Change<void>,
): Promise<void> {
  return settleOr404(sync, requestId, (settling, held) => {
    if (!held.consents.some((consent) => consent.userId === userId)) {
      return requestNotFound();
    }
    if (!ACTIVE.includes(held.status)) {
      return notInStatus(held.status);
    }
    return change(settling, held);
  });
}
