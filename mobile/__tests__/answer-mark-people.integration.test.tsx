/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import { MEAL_ANSWER, MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import { MEAL_ANSWER_ALONE } from '@/api/mock/data/meal-answers';
import { PLAN_QUEST } from '@/api/mock/data/plan-quest';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen, shownAddress } from './support/app';
import { askOnMap, mapThings } from './support/answer-map';
import { recalculations } from './support/answer-correct';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { layStage } from './support/lists';
import { pressMarker } from './support/made-quest';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// P04 ticket 03: the faces of the Plan's people and the User's start do what the condition chips do. Over the stored
// answer to "배고파, 민수랑 같이": 민수's face says "민수", the User's start "나 · 3분" from 301동.

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

const ASKER = MEAL_ANSWER.input.people[0];

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

function markCard(): ReturnType<typeof within> {
  return within(screen.getByTestId('mark-card'));
}

describe("a face of the Plan's people", () => {
  it('opens 빼기, which sends the conditions without 민수 as the chip did', async () => {
    server.on('POST /assistant/answers', { status: 200, body: MEAL_ANSWER_ALONE });
    const user = await askOnMap(server, MEAL_ANSWER_REPLY, () => layStage(390, 760));

    await pressMarker(user, '민수');
    expect(markCard().getByText('12:15 302동 수업 끝')).toBeVisible();
    await user.press(markCard().getByRole('button', { name: '민수 빼기' }));
    await pass(500);

    expect(recalculations(server)).toEqual([
      {
        input: { ...MEAL_ANSWER.input, people: [ASKER] },
        location: ON_CAMPUS,
        clientCapabilities: ['library', 'answer', 'area', 'meet', 'events', 'plan-set'],
      },
    ]);
    expect(screen.queryByTestId('mark-card')).toBeNull();
    expect(mapThings()).not.toContain('민수');
  });

  it('takes no press once "만들고 초대 보내기" sent the Plan', async () => {
    server.on('POST /plans', { status: 201, body: PLAN_QUEST });
    const user = await askOnMap(server, MEAL_ANSWER_REPLY, () => layStage(390, 760));
    await user.press(within(screen.getByTestId('ai-input-beside')).getByRole('button', { name: '만들고 초대 보내기' }));
    await pass(500);

    const map = within(screen.getByTestId('main-map-touches'));
    expect(map.getByRole('image', { name: '민수 · 아직 안 봄' })).toBeOnTheScreen();
    expect(map.queryByRole('button', { name: '민수 · 아직 안 봄' })).toBeNull();
  });
});

describe("the User's start", () => {
  it('says where the User sets out from, and opens 장소 선택 as the origin chip did', async () => {
    const user = await askOnMap(server, MEAL_ANSWER_REPLY, () => layStage(390, 760));

    await pressMarker(user, '나 · 3분');

    expect(markCard().getByText('출발 · 301동에서')).toBeVisible();

    await user.press(markCard().getByRole('button', { name: '다른 건물에서 출발' }));
    await pass(500);

    expect(shownAddress()).toBe('/place-map');
  });
});
