/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply } from './assistant-types';
import type { StudyInput } from './study-plan-types';
import { queryOptions } from '@tanstack/react-query';
import { mockRoomRequests } from './mock/room-requests';
import { field, hasTexts, isNothing, isNumber, isText, isTextOrNull, listOf } from './server/answers';
import { call } from './server/http';
import { isAnswerReply } from './server/plan-answers';
import { asksMainServer } from './servers';

// The room requests of a group study room booked with companions (main-server `src/library/`, P06 spec "Group study
// rooms: the room request"). The app's routes, never the Assistant's. Only `companions` holds a 학번 and a registered
// name, and only the requester's phone gets it, to send to the library and nowhere else.

export type RoomRequestStatus = 'gathering' | 'ready' | 'booked' | 'cancelled' | 'dissolved' | 'expired';

export interface RoomPerson {
  userId: string;
  name: string;
}

// `declined` is out by an answer or a change, `unanswered` out at the deadline, 20:00 the day before.
export type CompanionState = 'asked' | 'consented' | 'declined' | 'unanswered';

export interface RoomRequestCompanion extends RoomPerson {
  state: CompanionState;
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
  // Missing from a server older than both: the card then reads `consents` alone.
  companions?: RoomRequestCompanion[];
  // How many more people the room's minimum needs.
  moreNeeded?: number;
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

// From a book card: its key, and the Friends or the Quest whose Holders come along; from a study answer together, also
// the study input it was made from, which the server keeps to give the answer back (P10 ticket 12).
export type RoomRequestMaking = { key: string; useDesc?: string; input?: StudyInput } & (
  { friendIds: string[] } | { questId: string }
);

export interface RoomRequestsClient {
  make: (making: RoomRequestMaking, idempotencyKey: string) => Promise<RoomRequest>;
  get: (id: string) => Promise<RoomRequest>;
  // The study answer the request was sent from, rebuilt by the main server at its room, time and people (P10 ticket 08).
  answer: (id: string) => Promise<AnswerReply>;
  inbox: () => Promise<RoomInbox>;
  consent: (id: string) => Promise<RoomRequest>;
  decline: (id: string) => Promise<void>;
  companions: (id: string) => Promise<RoomCompanion[]>;
  // The booker asks one more Friend into a request made for booking.
  askOneMore: (id: string, friendId: string, idempotencyKey: string) => Promise<RoomRequest>;
  // What the booking came to, with no library data.
  result: (id: string, result: { ok: boolean; failedUserId?: string }) => Promise<void>;
  cancelled: (id: string) => Promise<void>;
  seen: (noticeId: string) => Promise<void>;
}

const STATUSES = new Set(['gathering', 'ready', 'booked', 'cancelled', 'dissolved', 'expired']);

export function isRoomRequestStatus(value: unknown): value is RoomRequestStatus {
  return STATUSES.has(String(value));
}
const COMPANION_STATES = new Set(['asked', 'consented', 'declined', 'unanswered']);

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

const isCompanionStates = listOf(
  (value: unknown): value is RoomRequestCompanion =>
    isPerson(value) && COMPANION_STATES.has(String(field(value, 'state'))),
);

export function isRoomRequest(value: unknown): value is RoomRequest {
  const failed = field(value, 'failed');
  const companions = field(value, 'companions');
  const moreNeeded = field(value, 'moreNeeded');
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
    })(field(value, 'consents')) &&
    (companions === undefined || isCompanionStates(companions)) &&
    (moreNeeded === undefined || isNumber(moreNeeded))
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
  answer: (id) => call('GET', path(id, 'answer'), isAnswerReply),
  inbox: () => call('GET', '/library/room-requests', isInbox),
  consent: (id) => call('POST', path(id, 'consent'), isRoomRequest),
  decline: (id) => send(path(id, 'decline')),
  companions: (id) => call('GET', path(id, 'companions'), isCompanions),
  askOneMore: (id, friendId, idempotencyKey) =>
    call('POST', path(id, 'companions'), isRoomRequest, {
      body: { friendId },
      headers: { 'Idempotency-Key': idempotencyKey },
    }),
  result: (id, result) => send(path(id, 'result'), result),
  cancelled: (id) => send(path(id, 'cancelled')),
  seen: (noticeId) => send(`/library/room-notices/${encodeURIComponent(noticeId)}/seen`),
};

// Chosen at each call, as the app's client is.
function chosen(): RoomRequestsClient {
  return asksMainServer() ? serverRoomRequests : mockRoomRequests;
}

export const roomRequests: RoomRequestsClient = {
  make: (making, key) => chosen().make(making, key),
  get: (id) => chosen().get(id),
  answer: (id) => chosen().answer(id),
  inbox: () => chosen().inbox(),
  consent: (id) => chosen().consent(id),
  decline: (id) => chosen().decline(id),
  companions: (id) => chosen().companions(id),
  askOneMore: (id, friendId, key) => chosen().askOneMore(id, friendId, key),
  result: (id, result) => chosen().result(id, result),
  cancelled: (id) => chosen().cancelled(id),
  seen: (noticeId) => chosen().seen(noticeId),
};

export const ROOM_INBOX_KEY = ['room-inbox'] as const;
export const ROOM_REQUEST_KEY = ['room-request'] as const;

// The main screen's: what asks the User, and the one-time notices. Asked again on `room-requests-changed` and when
// the live connection opens again (`live-updates.tsx`), not on a timer, which would keep the screen's tests' timers
// from ever running out.
export const roomInboxQuery = queryOptions({
  queryKey: ROOM_INBOX_KEY,
  queryFn: () => roomRequests.inbox(),
});
