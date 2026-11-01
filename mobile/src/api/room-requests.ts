/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { queryOptions } from '@tanstack/react-query';
import { newIdempotencyKey } from './idempotency-key';
import { field, hasTexts, isNothing, isNumber, isText, isTextOrNull, listOf } from './server/answers';
import { call } from './server/http';
import { asksMainServer } from './servers';

// The room requests of a group study room booked with companions (main-server `src/library/`, P06 spec "Group study
// rooms: the room request"). The app's routes, never the Assistant's. Only `companions` holds a 학번 and a registered
// name, and only the requester's phone gets it, to send to the library and nowhere else.

export type RoomRequestStatus = 'gathering' | 'ready' | 'booked' | 'cancelled' | 'dissolved' | 'expired';

export interface RoomPerson {
  userId: string;
  name: string;
}

export interface RoomRequest {
  id: string;
  status: RoomRequestStatus;
  questId: string;
  madeForBooking: boolean;
  requester: RoomPerson;
  space: { id: string; name: string };
  date: string;
  start: string;
  minutes: number;
  useDesc: string | null;
  // Why it was dissolved.
  reason: string | null;
  // The companion the library did not recognise.
  failed: RoomPerson | null;
  consents: (RoomPerson & { consented: boolean | null })[];
}

// A request that asks the User, for the consent dialog on the main screen.
export interface RoomAsk {
  requestId: string;
  requester: RoomPerson;
  space: { id: string; name: string };
  date: string;
  start: string;
  minutes: number;
  consented: boolean | null;
  // The library did not recognise the User's 학적상 이름 or 학번.
  recheck: boolean;
}

export interface RoomNotice {
  id: string;
  requestId: string;
  text: string;
}

export interface RoomInbox {
  asks: RoomAsk[];
  notices: RoomNotice[];
}

export interface RoomCompanion {
  userId: string;
  registeredName: string;
  studentNumber: string | null;
}

// From a book card: its key, and the Friends or the Quest whose Holders come along.
export type RoomRequestMaking = { key: string; useDesc?: string } & ({ friendIds: string[] } | { questId: string });

export interface RoomRequestsClient {
  make: (making: RoomRequestMaking, idempotencyKey: string) => Promise<RoomRequest>;
  get: (id: string) => Promise<RoomRequest>;
  inbox: () => Promise<RoomInbox>;
  consent: (id: string) => Promise<RoomRequest>;
  decline: (id: string) => Promise<void>;
  companions: (id: string) => Promise<RoomCompanion[]>;
  // What the booking came to, with no library data.
  result: (id: string, result: { ok: boolean; failedUserId?: string }) => Promise<void>;
  cancelled: (id: string) => Promise<void>;
  seen: (noticeId: string) => Promise<void>;
}

const STATUSES = new Set(['gathering', 'ready', 'booked', 'cancelled', 'dissolved', 'expired']);

function isPerson(value: unknown): value is RoomPerson {
  return hasTexts(value, ['userId', 'name']);
}

function isSpace(value: unknown): value is { id: string; name: string } {
  return hasTexts(value, ['id', 'name']);
}

function isAnswer(value: unknown): value is boolean | null {
  return value === null || typeof value === 'boolean';
}

function isSlot(value: unknown): boolean {
  return hasTexts(value, ['date', 'start']) && isNumber(field(value, 'minutes')) && isSpace(field(value, 'space'));
}

export function isRoomRequest(value: unknown): value is RoomRequest {
  const failed = field(value, 'failed');
  return (
    hasTexts(value, ['id', 'questId']) &&
    STATUSES.has(String(field(value, 'status'))) &&
    typeof field(value, 'madeForBooking') === 'boolean' &&
    isPerson(field(value, 'requester')) &&
    isSlot(value) &&
    isTextOrNull(field(value, 'useDesc')) &&
    isTextOrNull(field(value, 'reason')) &&
    (failed === null || isPerson(failed)) &&
    listOf((each: unknown): each is RoomPerson & { consented: boolean | null } => {
      return isPerson(each) && isAnswer(field(each, 'consented'));
    })(field(value, 'consents'))
  );
}

function isAsk(value: unknown): value is RoomAsk {
  return (
    isText(field(value, 'requestId')) &&
    isPerson(field(value, 'requester')) &&
    isSlot(value) &&
    isAnswer(field(value, 'consented')) &&
    typeof field(value, 'recheck') === 'boolean'
  );
}

function isInbox(value: unknown): value is RoomInbox {
  return (
    listOf(isAsk)(field(value, 'asks')) &&
    listOf((notice: unknown): notice is RoomNotice => hasTexts(notice, ['id', 'requestId', 'text']))(
      field(value, 'notices'),
    )
  );
}

const isCompanions = listOf(
  (value: unknown): value is RoomCompanion =>
    hasTexts(value, ['userId', 'registeredName']) && isTextOrNull(field(value, 'studentNumber')),
);

// A route that answers 204.
async function send(route: string, body?: object): Promise<void> {
  await call('POST', route, isNothing, body === undefined ? {} : { body });
}

const path = (id: string, action = ''): string =>
  `/library/room-requests/${encodeURIComponent(id)}${action === '' ? '' : `/${action}`}`;

export const serverRoomRequests: RoomRequestsClient = {
  make: (making, idempotencyKey) =>
    call('POST', '/library/room-requests', isRoomRequest, {
      body: making,
      headers: { 'Idempotency-Key': idempotencyKey },
    }),
  get: (id) => call('GET', path(id), isRoomRequest),
  inbox: () => call('GET', '/library/room-requests', isInbox),
  consent: (id) => call('POST', path(id, 'consent'), isRoomRequest),
  decline: (id) => send(path(id, 'decline')),
  companions: (id) => call('GET', path(id, 'companions'), isCompanions),
  result: (id, result) => send(path(id, 'result'), result),
  cancelled: (id) => send(path(id, 'cancelled')),
  seen: (noticeId) => send(`/library/room-notices/${encodeURIComponent(noticeId)}/seen`),
};

// The mock build's: every companion consents by the second look, with the mock's own names and 학번.
const made = new Map<string, RoomRequest>();

function mockRequest(id: string): RoomRequest {
  const request = made.get(id);
  if (request === undefined) {
    throw new Error(`No mock room request ${id}`);
  }
  return request;
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
    };
    made.set(request.id, request);
    return Promise.resolve(request);
  },
  get: (id) => {
    const request = mockRequest(id);
    const next: RoomRequest =
      request.status === 'gathering'
        ? { ...request, status: 'ready', consents: request.consents.map((each) => ({ ...each, consented: true })) }
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

// Chosen at each call, as the app's client is.
function chosen(): RoomRequestsClient {
  return asksMainServer() ? serverRoomRequests : mockRoomRequests;
}

export const roomRequests: RoomRequestsClient = {
  make: (making, key) => chosen().make(making, key),
  get: (id) => chosen().get(id),
  inbox: () => chosen().inbox(),
  consent: (id) => chosen().consent(id),
  decline: (id) => chosen().decline(id),
  companions: (id) => chosen().companions(id),
  result: (id, result) => chosen().result(id, result),
  cancelled: (id) => chosen().cancelled(id),
  seen: (noticeId) => chosen().seen(noticeId),
};

export const ROOM_INBOX_KEY = ['room-inbox'] as const;
export const ROOM_REQUEST_KEY = ['room-request'] as const;

// The main screen's: what asks the User, and the one-time notices.
export const roomInboxQuery = queryOptions({
  queryKey: ROOM_INBOX_KEY,
  queryFn: () => roomRequests.inbox(),
  refetchInterval: 15_000,
});
