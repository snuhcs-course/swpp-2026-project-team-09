/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { screen } from '@testing-library/react-native';
import { EVENTS_ANSWER } from '@/api/mock/data/events-answer';
import { takenAloneOf } from '@/api/mock/data/taken-alone';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass } from './support/app';
import { card } from './support/answer-map';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
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

// Partitions: the request; the card after it.
describe('"여기로" on an events Plan (Alone 3)', () => {
  it('sends the job fair to POST /plans with a key', async () => {
    await takeJobFair();

    const sent = server.received('POST /plans');
    expect(sent.map(({ body }) => body)).toEqual([
      { input: EVENTS_ANSWER.input, planId: JOB_FAIR, startAt: '2026-11-20T13:54:00+09:00', location: ON_CAMPUS },
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
    expect(card().getByText('13:54 도착 · 78분 볼 수 있어요')).toBeVisible();
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
    expect(screen.getByText('다시 고르지 못했어요. 잠시 후 다시 시도해 주세요')).toBeVisible();
  });
});
