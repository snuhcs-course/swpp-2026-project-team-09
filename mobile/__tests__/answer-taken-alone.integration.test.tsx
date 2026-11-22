/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-17  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { screen } from '@testing-library/react-native';
import { EVENTS_ANSWER } from '@/api/mock/data/events-answer';
import { takenAloneOf } from '@/api/mock/data/taken-alone';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass } from './support/app';
import { card, mapThings, timeBar } from './support/answer-map';
import { type FakeServer, refusal } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { socketServer } from './support/live';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answerRecalculations, ASKER, EVENTS_REPLY, firstPlan, JOB_FAIR, sayOnMap } from './support/row-four';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// "여기로" on an events Plan (P03 ticket 15, the design's 6.3 Alone 3), over the fake main server, which answers
// "오늘 볼 만한 거 있어?" with the stored real answer of row 4 and POST /plans with the job fair taken alone: the request,
// the card after it, "닫기", and "다시 고르기". Expected values: the stored answer, and the main server's reply as the
// ticket's contract gives it.

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

const ASKED = '오늘 볼 만한 거 있어?';
const CULTURE_HALL = { latitude: 37.46159, longitude: 126.95104 };
const TAKEN = takenAloneOf(firstPlan(EVENTS_ANSWER), { id: ASKER, name: '유상', department: '컴퓨터공학부' });
const DROP = `DELETE /quests/${TAKEN.quest.id}`;
// The Quest once the party form made it a 파티 for the job fair.
const GATHERING = { ...TAKEN.quest, takenAlone: false, capacity: 4 };
const NOT_DROPPED = '다시 고르지 못했어요. 잠시 후 다시 시도해 주세요';

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  answerRecalculations(server);
  givePhone({ permission: 'granted', position: ON_CAMPUS });
  server.on('POST /plans', { status: 201, body: TAKEN });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function takeJobFair(): Promise<Awaited<ReturnType<typeof sayOnMap>>> {
  const user = await sayOnMap(server, ASKED, EVENTS_REPLY);
  await user.press(card().getByRole('button', { name: '여기로' }));
  await pass(500);
  return user;
}

// The party form made the Quest a 파티, and the main server tells the phone.
async function gathered(): Promise<void> {
  await socketServer((socket) => {
    socket.accept();
  });
  server.on('GET /quests', { status: 200, body: [GATHERING] });
  await socketServer((socket) => {
    socket.send('quests-changed');
  });
  await pass(500);
}

function keysSent(): (string | undefined)[] {
  return server.received('POST /plans').map(({ idempotencyKey }) => idempotencyKey);
}

// Partitions: the request; the card after it.
describe('"여기로" on an events Plan (Alone 3)', () => {
  it('sends the job fair to POST /plans with a key', async () => {
    await takeJobFair();

    const sent = server.received('POST /plans');
    expect(sent.map(({ body }) => body)).toEqual([
      {
        input: EVENTS_ANSWER.input,
        planId: JOB_FAIR,
        startAt: '2026-11-20T13:54:00+09:00',
        location: ON_CAMPUS,
        clientCapabilities: ['library', 'answer', 'area', 'meet', 'events', 'plan-set', 'quest-cancel', 'party-change'],
      },
    ]);
    expect(sent[0]?.idempotencyKey).toMatch(/^[\da-f-]{36}$/u);
  });

  it('says where the User goes and when they will be told to leave, with "다시 고르기" and "닫기"', async () => {
    await takeJobFair();

    expect(card().getByTestId('taken-card')).toBeVisible();
    expect(card().getByText('채용박람회에 가요')).toBeVisible();
    expect(card().getByText('15:12에 나설 시각을 알려 드릴게요')).toBeVisible();
    expect(card().getByRole('button', { name: '다시 고르기' })).toBeEnabled();
    expect(card().getByRole('button', { name: '닫기' })).toBeEnabled();
    expect(card().queryByRole('button', { name: '여기로' })).toBeNull();
    expect(screen.queryByText('파티를 만들고 초대를 보냈어요')).toBeNull();
  });
});

// Partitions: "닫기" with a walk to the Place; "다시 고르기" answered, and refused.
describe('the card of an event taken alone', () => {
  it('"닫기" starts the route guidance to the event\'s Place and returns to the everyday map', async () => {
    server.on('GET /walking-route', {
      status: 200,
      body: { status: 'OK', route: { line: [ON_CAMPUS, CULTURE_HALL], distance: 400, duration: 300 } },
    });
    const user = await takeJobFair();
    const before = server.received('GET /walking-route').length;

    await user.press(card().getByRole('button', { name: '닫기' }));
    await pass(500);

    expect(
      server
        .received('GET /walking-route')
        .slice(before)
        .map(({ query }) => query.endLatitude),
    ).toEqual([String(CULTURE_HALL.latitude)]);
    expect(screen.getByText('문화관까지 길 안내')).toBeVisible();
    expect(screen.queryByTestId('answer-pill')).toBeNull();
  });

  it('"다시 고르기" ends the Quest, shows the Plan again, and "여기로" then makes another', async () => {
    server.on(DROP, { status: 204 });
    const user = await takeJobFair();

    await user.press(card().getByRole('button', { name: '다시 고르기' }));
    await pass(500);

    expect(server.received(DROP)).toHaveLength(1);
    expect(mapThings()).toContain('채용박람회 · 13:54 채용박람회');
    expect(timeBar().getByText('13:54–15:12 · 78분')).toBeVisible();
    await user.press(card().getByRole('button', { name: '여기로' }));
    await pass(500);
    const keys = server.received('POST /plans').map(({ idempotencyKey }) => idempotencyKey);
    expect(keys).toHaveLength(2);
    expect(keys[1]).not.toBe(keys[0]);
  });

  it('keeps the card and says so when "다시 고르기" fails', async () => {
    server.on(DROP, { status: 500, body: { statusCode: 500, message: 'Internal' } });
    const user = await takeJobFair();

    await user.press(card().getByRole('button', { name: '다시 고르기' }));
    await pass(500);

    expect(card().getByTestId('taken-card')).toBeVisible();
    expect(screen.getByText(NOT_DROPPED)).toBeVisible();
  });
});

// Partitions: a Quest already gone at "다시 고르기", and "여기로" refused by the User's own 파티 for the event. Expected
// values: P03 ticket 17's decisions, and the words 파티 has for SHARED_QUEST_HELD.
describe('an event taken alone, refused or gone', () => {
  it('"다시 고르기" on a Quest already gone shows the Plan again', async () => {
    server.on(DROP, refusal(404, 'QUEST_NOT_FOUND'));
    const user = await takeJobFair();

    await user.press(card().getByRole('button', { name: '다시 고르기' }));
    await pass(500);

    expect(card().queryByTestId('taken-card')).toBeNull();
    expect(card().getByRole('button', { name: '여기로' })).toBeEnabled();
    expect(screen.queryByText(NOT_DROPPED)).toBeNull();
  });

  it('"여기로" refused for a 파티 of the User\'s own for the event says so', async () => {
    server.on('POST /plans', refusal(409, 'SHARED_QUEST_HELD'));
    await takeJobFair();

    expect(screen.getByText('이 행사에 함께 가는 파티가 이미 있어요')).toBeVisible();
    expect(card().queryByTestId('taken-card')).toBeNull();
  });
});

// Partitions: a taken card whose Quest the party form made a 파티 since, and "여기로" after it. Expected values: the
// review of PR 338 (B), and the decision on the read of PR 339 (2).
describe('a taken card, later', () => {
  it('goes once its Quest is a 파티, and the 파티 is not dropped', async () => {
    server.on(DROP, { status: 204 });
    await takeJobFair();

    await gathered();

    expect(card().queryByTestId('taken-card')).toBeNull();
    expect(card().getByRole('button', { name: '여기로' })).toBeEnabled();
    expect(server.received(DROP)).toEqual([]);
  });

  it('goes with the key, so "여기로" then asks anew and hears the 파티', async () => {
    const user = await takeJobFair();
    await gathered();
    server.on('POST /plans', refusal(409, 'SHARED_QUEST_HELD'));

    await user.press(card().getByRole('button', { name: '여기로' }));
    await pass(500);

    const keys = keysSent();
    expect(keys).toHaveLength(2);
    expect(keys[1]).not.toBe(keys[0]);
    expect(screen.getByText('이 행사에 함께 가는 파티가 이미 있어요')).toBeVisible();
  });
});

// Partitions: the User's Quests read at "다시 고르기" show the Quest a 파티 the phone was not told of yet, or cannot be
// read. Expected values: the decision on the read of PR 339 (3): the Quests read first, and no DELETE either way.
describe('"다시 고르기" on a taken card', () => {
  it('reads the Quests first, and only clears the card of a Quest that is a 파티 by now', async () => {
    server.on(DROP, { status: 204 });
    const user = await takeJobFair();
    server.on('GET /quests', { status: 200, body: [GATHERING] });

    await user.press(card().getByRole('button', { name: '다시 고르기' }));
    await pass(500);

    expect(server.received(DROP)).toEqual([]);
    expect(card().queryByTestId('taken-card')).toBeNull();
    expect(card().getByRole('button', { name: '여기로' })).toBeEnabled();
  });

  it('drops nothing and says so when the Quests cannot be read', async () => {
    server.on(DROP, { status: 204 });
    const user = await takeJobFair();
    server.on('GET /quests', { status: 500, body: { statusCode: 500, message: 'Internal' } });

    await user.press(card().getByRole('button', { name: '다시 고르기' }));
    await pass(500);

    expect(server.received(DROP)).toEqual([]);
    expect(card().getByTestId('taken-card')).toBeVisible();
    expect(screen.getByText(NOT_DROPPED)).toBeVisible();
  });
});
