/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import { EVENTS_ANSWER } from '@/api/mock/data/events-answer';
import { field } from '@/api/server/answers';
import type { ListedGlobalEvent } from '@/api/types';
import type { KeptNotification } from '@/api/waiting-types';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { socketServer } from './support/live';
import { lookOf } from './support/markers';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, LOBBY, PHONE_NOW } from './support/server';

// The marks of the watched interests on the everyday map (P05 ticket 13), against the fake main server at 13:00 on
// 6 October 2026: the job fair and the company session share 문화관, the concert and the lecture stand elsewhere.
// The User watches "채용" and has the hashtag 러닝; the job fair matches the watched interest, the company session a
// hashtag only, and the job fair's interest-new Notification is kept.

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));
jest.mock('@/auth/google', () => ({
  googleAvailable: jest.fn<boolean, []>(),
  askGoogle: jest.fn(),
  forgetGoogle: jest.fn(),
}));
jest.mock('expo-secure-store', () => jest.requireActual<typeof SecureStoreFake>('./support/secure-store'));
jest.mock('socket.io-client', () => jest.requireActual<typeof FakeSocketModule>('./support/fake-socket'));

function eventAt(
  id: string,
  title: string,
  [startsAt, endsAt]: [string, string],
  [latitude, longitude]: [number, number],
): ListedGlobalEvent {
  const event = { id, title, description: '', startsAt, endsAt, place: '문화관', latitude, longitude, sourceUrl: null };
  return { ...event, publishedAt: null, favorite: false };
}

const HALL: [number, number] = [37.46159, 126.95104];
const JOB_FAIR = eventAt(
  '42b86020-4f3a-42e0-9efb-8a60e66a7d0b',
  '채용박람회',
  ['2026-10-06T05:00:00.000Z', '2026-10-06T08:00:00.000Z'],
  HALL,
);
const TALK = eventAt(
  'c750f9a0-887e-4dc1-99d1-34b065ff6257',
  '기업 설명회',
  ['2026-10-06T06:00:00.000Z', '2026-10-06T07:00:00.000Z'],
  HALL,
);
const CONCERT = eventAt(
  '5b1d3a40-1c2e-4f6a-9d7b-0e8f9a1b2c3d',
  '동아리 정기공연',
  ['2026-10-06T09:00:00.000Z', '2026-10-06T11:00:00.000Z'],
  [37.4602, 126.953],
);
const LECTURE = eventAt(
  '7e2f4b51-2d3f-4a7b-8e8c-1f9a0b2c3d4e',
  'AI 특강',
  ['2026-10-06T10:00:00.000Z', '2026-10-06T11:00:00.000Z'],
  [37.4632, 126.9497],
);

const TOLD: KeptNotification = {
  id: 'n1',
  kind: 'interest-new',
  title: '채용박람회가 떴어요',
  ahead: null,
  line: '14:00 문화관',
  at: '2026-10-06T03:30:00.000Z',
  url: `/main?card=event:${JOB_FAIR.id}`,
};

const MARK = '채용박람회 외 1';
const FRESH_MARK = `${MARK} · 새로 올라왔어요`;
// The names the map would give the events today. Without marks the map keeps only the Favorite Events.
const TODAY = ['공식 행사 2개 · 문화관', '공식 행사 · 동아리 정기공연', '공식 행사 · AI 특강'];
const STARRED = '공식 행사 · 동아리 정기공연';

// The concert is a Favorite Event.
function starConcert(): void {
  server.on('GET /global-events', { status: 200, body: [JOB_FAIR, TALK, { ...CONCERT, favorite: true }, LECTURE] });
}

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  server.on('GET /global-events', { status: 200, body: [JOB_FAIR, TALK, CONCERT, LECTURE] });
  server.on('GET /interests', {
    status: 200,
    body: [{ id: 'i1', words: '채용', topics: ['채용'], createdAt: '2026-10-05T03:00:00.000Z' }],
  });
  server.on('GET /interests/matches', {
    status: 200,
    body: {
      globalEvents: [
        { id: JOB_FAIR.id, watched: true },
        { id: TALK.id, watched: false },
      ],
      quests: [],
    },
  });
  server.on('GET /notifications', { status: 200, body: [TOLD] });
  server.on('POST /assistant/answers', ({ body }) => ({
    status: 200,
    body: { ...EVENTS_ANSWER, input: field(body, 'input') },
  }));
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

function drawn(name: string): boolean {
  return screen.queryByRole('button', { name }) !== null;
}

function looks(name: string, part: string): boolean {
  return String(lookOf(name)).split(':').includes(part);
}

// Partitions: matches, a watched match told and a hashtag match; an event that matches nothing. Expected values: the
// design's "Watching interests" and the ticket's "newly posted".
describe('the marks', () => {
  it('draws only the matching events, at one place under one mark named after the first, with "!"', async () => {
    await openMain();

    expect(drawn(FRESH_MARK)).toBe(true);
    expect(looks(FRESH_MARK, 'fresh')).toBe(true);
    for (const name of [...TODAY, '동아리 정기공연', 'AI 특강']) {
      expect(drawn(name)).toBe(false);
    }
  });

  it('opens the answer for the mark\'s events on a tap, as asking does, and the mark loses its "!"', async () => {
    const user = await openMain();

    await user.press(screen.getByRole('button', { name: FRESH_MARK }));
    await pass(500);

    expect(server.received('POST /assistant/answers').map(({ body }) => body)).toEqual([
      {
        input: { kind: 'events', date: '2026-10-06', eventIds: [JOB_FAIR.id, TALK.id] },
        location: ON_CAMPUS,
        clientCapabilities: ['library', 'answer', 'area', 'meet', 'events', 'plan-set'],
      },
    ]);
    expect(within(screen.getByTestId('answer-pill')).getByText(MARK)).toBeVisible();
    expect(screen.getByTestId('answer-card')).toBeVisible();

    await user.press(screen.getByRole('button', { name: '답 닫기' }));
    await pass(500);

    expect(drawn(FRESH_MARK)).toBe(false);
    expect(drawn(MARK)).toBe(true);
    expect(looks(MARK, 'fresh')).toBe(false);
    // An answer may have kept or dropped an interest: the matches are read again.
    expect(server.received('GET /interests/matches').length).toBeGreaterThan(1);
  });

  it('keeps "!" when the answer cannot be had', async () => {
    server.on('POST /assistant/answers', { status: 500, body: { statusCode: 500, message: 'Internal' } });
    const user = await openMain();

    await user.press(screen.getByRole('button', { name: FRESH_MARK }));
    await pass(1500);

    expect(screen.getByText('답을 가져오지 못했어요. 잠시 후 다시 시도해 주세요')).toBeVisible();
    expect(screen.queryByTestId('answer-pill')).toBeNull();
    expect(looks(FRESH_MARK, 'fresh')).toBe(true);
  });
});

// Partitions: a notice of the main server. Expected values: the review of PR 306, a match posted while the app runs
// is drawn without a restart.
describe('the matches read again', () => {
  it('on a notice, drawing a new match', async () => {
    await openMain();
    server.on('GET /interests/matches', {
      status: 200,
      body: { globalEvents: [{ id: CONCERT.id, watched: true }], quests: [] },
    });

    await socketServer((socket) => {
      socket.accept();
    });
    await socketServer((socket) => {
      socket.send('notice');
    });
    await pass(500);

    expect(drawn('동아리 정기공연')).toBe(true);
    expect(drawn(FRESH_MARK)).toBe(false);
  });
});

// Partitions: no hashtag and no watched interest. Expected values: the design's "First run", two or three of today's
// events, faded.
describe('a User who watches nothing', () => {
  it("sees the first three of today's events by their start, faded", async () => {
    server.on('POST /lobby', { status: 200, body: { ...LOBBY, profile: { ...LOBBY.profile, hashtags: [] } } });
    server.on('GET /interests', { status: 200, body: [] });
    server.on('GET /interests/matches', { status: 200, body: { globalEvents: [], quests: [] } });

    await openMain();

    expect(looks(MARK, 'faded')).toBe(true);
    expect(looks('동아리 정기공연', 'faded')).toBe(true);
    expect(drawn('AI 특강')).toBe(false);
  });
});

// Partitions: a Favorite Event that matches no interest, beside the marks the matches give (P06 ticket 01 with the
// marks always on since P02-04). Expected values: the ticket and the app's README, a Favorite Event's pin at every level.
describe('a Favorite Event beside the marks', () => {
  it('keeps its starred pin though it matches nothing, and the marks stay', async () => {
    starConcert();

    await openMain();

    expect(drawn(STARRED)).toBe(true);
    expect(looks(STARRED, 'starred')).toBe(true);
    expect(drawn(FRESH_MARK)).toBe(true);
    expect(drawn('AI 특강')).toBe(false);
  });
});

// Partitions: a main server without the matches. Expected values: the ticket, the map without marks, which keeps only
// the Favorite Events (P06 ticket 01).
describe('the map without marks', () => {
  it('with a main server that answers 404 for the matches draws only the Favorite Event, with its star and no "!"', async () => {
    starConcert();
    server.on('GET /interests/matches', { status: 404, body: { statusCode: 404, message: 'Not Found' } });

    await openMain();

    expect(drawn(STARRED)).toBe(true);
    expect(looks(STARRED, 'starred')).toBe(true);
    expect(looks(STARRED, 'fresh') || looks(STARRED, 'faded')).toBe(false);
    for (const name of TODAY.filter((one) => one !== STARRED)) {
      expect(drawn(name)).toBe(false);
    }
    expect(drawn(MARK)).toBe(false);
  });
});
