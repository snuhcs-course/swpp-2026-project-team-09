/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { ApiError } from '@/api/errors';
import { LibraryError, type LibraryFailure } from '@/library/errors';
import { forgetUser, requestFailed, seatBooking, type ServerAction, trackAction } from '@/telemetry';
import type { FakeClient } from '../support/posthog';
import { actionEvents, outsideRegistry, recorded, startUsage } from '../support/usage-actions';

// The usage layer's function for the five actions, against the PostHog stand-in (P08 ticket 13): `_requested`, then
// `_completed` or `_failed` with `reason` and `code` worked out from what the request threw, for an `ApiError` of each
// status, a timer's abort, a caller's abort, UNEXPECTED_ANSWER and each `LibraryError`; and `api_request_failed`.

const JOIN: ServerAction = { action: 'party_join', how: 'joined_directly' };

let client: FakeClient;

beforeEach(() => {
  client = startUsage();
});

afterEach(() => {
  jest.restoreAllMocks();
  expect(outsideRegistry(recorded(client))).toEqual([]);
  forgetUser();
  delete process.env.EXPO_PUBLIC_POSTHOG_TOKEN;
});

// What the action's request threw, after its stages were sent.
async function failing(error: Error, action: ServerAction = JOIN): Promise<unknown> {
  const thrown = await trackAction(action, () => Promise.reject(error)).catch((caught: unknown) => caught);
  expect(thrown).toBe(error);
  return thrown;
}

describe('an action to the main server', () => {
  it('sends _requested before the request and _completed after it, and gives back its answer', async () => {
    let during: string[] = [];
    const answer = await trackAction({ action: 'party_creation', visibility: 'public' }, () => {
      during = actionEvents(client).map(([event]) => event);
      return Promise.resolve({ id: 'q1' });
    });

    expect(answer).toEqual({ id: 'q1' });
    expect(during).toEqual(['party_creation_requested']);
    expect(actionEvents(client)).toEqual([
      ['party_creation_requested', { visibility: 'public' }],
      ['party_creation_completed', { visibility: 'public' }],
    ]);
  });

  it.each<[string, ServerAction, string, Record<string, unknown>]>([
    ['the Assistant', { action: 'assistant_reply' }, 'assistant_reply', {}],
    ['a 비공개 파티', { action: 'party_creation', visibility: 'private' }, 'party_creation', { visibility: 'private' }],
    [
      'an invitation',
      { action: 'party_join', how: 'invitation_accepted' },
      'party_join',
      { how: 'invitation_accepted' },
    ],
    ['a join request', { action: 'party_join', how: 'request_accepted' }, 'party_join', { how: 'request_accepted' }],
    [
      'a Friend Request',
      { action: 'friendship_creation', how: 'request_accepted' },
      'friendship_creation',
      { how: 'request_accepted' },
    ],
    [
      'an Invite Link',
      { action: 'friendship_creation', how: 'invite_link_accepted' },
      'friendship_creation',
      { how: 'invite_link_accepted' },
    ],
  ])('names the stages of %s with its properties', async (_what, action, name, properties) => {
    await trackAction(action, () => Promise.resolve(null));
    await failing(new ApiError(409, 'QUEST_FULL'), action);

    expect(actionEvents(client)).toEqual([
      [`${name}_requested`, properties],
      [`${name}_completed`, properties],
      [`${name}_requested`, properties],
      [`${name}_failed`, { ...properties, reason: 'refused', code: 'QUEST_FULL' }],
    ]);
  });
});

describe("an action's failure", () => {
  it.each<[string, Error, Record<string, unknown>]>([
    ['nothing answering', new ApiError(0), { reason: 'network' }],
    ["the request's own timer", new ApiError(0, null, null, 'timeout'), { reason: 'timeout' }],
    ['an answer of an unknown shape', new ApiError(0, 'UNEXPECTED_ANSWER', { x: 1 }), { reason: 'server_error' }],
    ['a 4xx with the main server code', new ApiError(409, 'QUEST_FULL'), { reason: 'refused', code: 'QUEST_FULL' }],
    ['a 401 with its code', new ApiError(401, 'SESSION_REPLACED'), { reason: 'refused', code: 'SESSION_REPLACED' }],
    ['a 4xx without a code', new ApiError(404), { reason: 'server_error' }],
    ['a 4xx whose code is not one word of capitals', new ApiError(400, 'Bad request'), { reason: 'server_error' }],
    ['a 5xx', new ApiError(500), { reason: 'server_error' }],
    ['a 5xx with a code', new ApiError(503, 'MODEL_UNAVAILABLE'), { reason: 'server_error' }],
    ['something else thrown', new TypeError('x is undefined'), { reason: 'server_error' }],
  ])('gives %s its reason, and throws it on', async (_what, error, failure) => {
    await failing(error);

    expect(actionEvents(client)).toEqual([
      ['party_join_requested', { how: 'joined_directly' }],
      ['party_join_failed', { how: 'joined_directly', ...failure }],
    ]);
  });

  it('sends no failure for a request its caller gave up, and throws it on', async () => {
    await failing(new ApiError(0, null, null, 'caller'));

    expect(actionEvents(client)).toEqual([['party_join_requested', { how: 'joined_directly' }]]);
  });

  it('gives the answer and the error as they are when PostHog throws', async () => {
    jest.spyOn(client, 'capture').mockImplementation(() => {
      throw new Error('PostHog broke');
    });
    const refused = new ApiError(409, 'QUEST_FULL');

    await expect(trackAction(JOIN, () => Promise.resolve('joined'))).resolves.toBe('joined');
    await expect(trackAction(JOIN, () => Promise.reject(refused))).rejects.toBe(refused);
  });

  it('sends nothing for a User who has not chosen usage data', async () => {
    forgetUser();
    const before = recorded(client).length;

    await trackAction(JOIN, () => Promise.resolve(null));
    await failing(new ApiError(0));

    expect(recorded(client)).toHaveLength(before);
  });
});

describe("a seat's booking", () => {
  it('sends _requested at once, then _completed when the library answered with the booking', () => {
    const stages = seatBooking();
    expect(actionEvents(client)).toEqual([['seat_booking_requested', {}]]);
    stages.booked();

    expect(actionEvents(client)).toEqual([
      ['seat_booking_requested', {}],
      ['seat_booking_completed', {}],
    ]);
  });

  it.each<['seat_taken' | 'not_allowed']>([['seat_taken'], ['not_allowed']])(
    'sends refused with %s for an answer without a booking',
    (code) => {
      seatBooking().notBooked(code);

      expect(actionEvents(client)).toEqual([
        ['seat_booking_requested', {}],
        ['seat_booking_failed', { reason: 'refused', code }],
      ]);
    },
  );

  it.each<[LibraryFailure, Record<string, unknown>]>([
    ['network', { reason: 'network' }],
    ['sessionEnded', { reason: 'refused', code: 'session_ended' }],
    ['noSession', { reason: 'refused', code: 'no_session' }],
    ['notAllowed', { reason: 'refused', code: 'not_allowed' }],
  ])('gives a LibraryError %s its reason and code, and nothing of the library', (kind, failure) => {
    seatBooking().threw(new LibraryError(kind, '/libraries/seat'));

    expect(actionEvents(client)).toEqual([
      ['seat_booking_requested', {}],
      ['seat_booking_failed', failure],
    ]);
  });

  it('gives anything else thrown server_error', () => {
    seatBooking().threw(new TypeError('x is undefined'));

    expect(actionEvents(client).at(-1)).toEqual(['seat_booking_failed', { reason: 'server_error' }]);
  });
});

describe('api_request_failed', () => {
  it("sends the request's scrubbed route, its method and the reason", () => {
    requestFailed('POST', '/quests/3f2a9c1e-0000-4000-8000-000000000042/join', new ApiError(409, 'QUEST_FULL'));
    requestFailed('GET', '/friend-ids/K7M3XQ9A', new ApiError(0, null, null, 'timeout'));
    requestFailed('DELETE', '/quests/42', new ApiError(0));
    requestFailed('GET', '/lobby', new ApiError(502));

    expect(actionEvents(client)).toEqual([
      ['api_request_failed', { route: '/quests/:id/join', method: 'POST', reason: 'refused' }],
      ['api_request_failed', { route: '/friend-ids/:id', method: 'GET', reason: 'timeout' }],
      ['api_request_failed', { route: '/quests/:id', method: 'DELETE', reason: 'network' }],
      ['api_request_failed', { route: '/lobby', method: 'GET', reason: 'server_error' }],
    ]);
  });

  it('sends nothing for a request its caller gave up', () => {
    requestFailed('GET', '/positions', new ApiError(0, null, null, 'caller'));

    expect(actionEvents(client)).toEqual([]);
  });
});

// A recorded event with the properties every event carries.
function recordedEvent(name: string, properties: Record<string, unknown>): FakeClient['queue'][number] {
  return { event: name, distinctId: 'u', properties: { source: 'app', platform: 'android', ...properties } };
}

describe('the check of every recorded event against the registry', () => {
  it('lets through what the registry has', () => {
    expect(
      outsideRegistry([
        recordedEvent('party_join_failed', { how: 'joined_directly', reason: 'refused', code: 'QUEST_FULL' }),
        recordedEvent('api_request_failed', { route: '/quests/:id/join', method: 'POST', reason: 'refused' }),
        recordedEvent('seat_booking_failed', { reason: 'refused', code: 'seat_taken' }),
      ]),
    ).toEqual([]);
  });

  it('finds a message, a title, a name, a Place, a coordinate, a free code and an unknown event', () => {
    expect(
      outsideRegistry([
        recordedEvent('assistant_reply_requested', { message: '같이 밥 먹을 사람' }),
        recordedEvent('party_creation_completed', { visibility: 'public', title: '저녁 파티' }),
        recordedEvent('friendship_creation_completed', { how: 'request_accepted', name: '김민준' }),
        recordedEvent('seat_booking_completed', { place: '관정도서관 3층' }),
        recordedEvent('api_request_failed', { route: '/positions/37.45', method: 'GET', reason: 'network' }),
        recordedEvent('party_join_failed', { how: 'joined_directly', reason: 'refused', code: 'Quest is full' }),
        recordedEvent('party_join_failed', { how: 'joined_directly', reason: 'network', code: 'QUEST_FULL' }),
        recordedEvent('quest_viewed', {}),
      ]),
    ).toEqual([
      'assistant_reply_requested: message is not its property',
      'party_creation_completed: title is not its property',
      'friendship_creation_completed: name is not its property',
      'seat_booking_completed: place is not its property',
      'api_request_failed: route holds "/positions/37.45"',
      'party_join_failed: code holds "Quest is full"',
      'party_join_failed: code without refused',
      'quest_viewed: not in the registry',
    ]);
  });
});
