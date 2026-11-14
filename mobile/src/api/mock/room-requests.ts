/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { ApiError } from '@/api/errors';
import { newIdempotencyKey } from '@/api/idempotency-key';
import type { RoomRequest, RoomRequestsClient } from '@/api/room-requests';

// The mock build's: every companion still asked consents by the second look, with the mock's own names and 학번.
const made = new Map<string, RoomRequest>();

function mockRequest(id: string): RoomRequest {
  const request = made.get(id);
  if (request === undefined) {
    throw new Error(`No mock room request ${id}`);
  }
  return request;
}

// The server's refusals of one more Friend that the mock can tell: it knows no one's Friends.
function mockAskRefusal(request: RoomRequest, friendId: string): ApiError | null {
  if (!request.madeForBooking) {
    return new ApiError(409, 'ROOM_REQUEST_OF_QUEST');
  }
  if (request.status !== 'gathering') {
    return new ApiError(409, 'ROOM_REQUEST_STATUS');
  }
  const asked = (request.companions ?? []).some(
    ({ userId, state }) => userId === friendId && (state === 'asked' || state === 'consented'),
  );
  return asked
    ? new ApiError(400, 'ROOM_REQUEST_REFUSED', {
        code: 'ROOM_REQUEST_REFUSED',
        message: '이미 함께 가자고 한 친구예요',
      })
    : null;
}

export const mockRoomRequests: RoomRequestsClient = {
  make: (making) => {
    const [, spaceId = '', date = '', time = '', minutes = '0'] = making.key.split(':');
    const friendIds = 'friendIds' in making ? making.friendIds : ['mock-holder'];
    const request: RoomRequest = {
      id: newIdempotencyKey(),
      status: 'gathering',
      questId: 'questId' in making ? making.questId : newIdempotencyKey(),
      madeForBooking: 'friendIds' in making,
      requester: { userId: 'me', name: '나' },
      space: { id: spaceId, name: spaceId },
      date,
      start: `${time.slice(0, 2)}:${time.slice(2)}`,
      minutes: Number(minutes),
      useDesc: making.useDesc ?? null,
      reason: null,
      failed: null,
      consents: friendIds.map((userId, index) => ({ userId, name: `친구${index + 1}`, consented: null })),
      companions: friendIds.map((userId, index) => ({ userId, name: `친구${index + 1}`, state: 'asked' })),
      // The mock knows no room's minimum.
      moreNeeded: 0,
    };
    made.set(request.id, request);
    return Promise.resolve(request);
  },
  get: (id) => {
    const request = mockRequest(id);
    const next: RoomRequest =
      request.status === 'gathering'
        ? {
            ...request,
            status: 'ready',
            consents: request.consents.map((each) => ({ ...each, consented: each.consented ?? true })),
            companions: request.companions?.map((each) =>
              each.state === 'asked' ? { ...each, state: 'consented' } : each,
            ),
            moreNeeded: 0,
          }
        : request;
    made.set(id, next);
    return Promise.resolve(request);
  },
  inbox: () => Promise.resolve({ asks: [], notices: [] }),
  consent: (id) => Promise.resolve(mockRequest(id)),
  decline: (id) => {
    made.set(id, { ...mockRequest(id), status: 'dissolved', reason: '파티 구성원이 제안을 거절했습니다' });
    return Promise.resolve();
  },
  companions: (id) =>
    Promise.resolve(
      mockRequest(id).consents.map(({ userId, name }, index) => ({
        userId,
        registeredName: name,
        studentNumber: `2026${String(index + 2).padStart(5, '0')}`,
      })),
    ),
  askOneMore: (id, friendId) => {
    const request = mockRequest(id);
    const companions = request.companions ?? [];
    const refusal = mockAskRefusal(request, friendId);
    if (refusal !== null) {
      return Promise.reject(refusal);
    }
    const name = companions.find(({ userId }) => userId === friendId)?.name ?? `친구${companions.length + 1}`;
    const next: RoomRequest = {
      ...request,
      consents: [
        ...request.consents.filter(({ userId }) => userId !== friendId),
        { userId: friendId, name, consented: null },
      ],
      companions: [
        ...companions.filter(({ userId }) => userId !== friendId),
        { userId: friendId, name, state: 'asked' },
      ],
      moreNeeded: Math.max(0, (request.moreNeeded ?? 0) - 1),
    };
    made.set(id, next);
    return Promise.resolve(next);
  },
  result: (id, { ok }) => {
    if (ok) {
      made.set(id, { ...mockRequest(id), status: 'booked', consents: [] });
    }
    return Promise.resolve();
  },
  cancelled: (id) => {
    made.set(id, { ...mockRequest(id), status: 'cancelled' });
    return Promise.resolve();
  },
  seen: () => Promise.resolve(),
};
