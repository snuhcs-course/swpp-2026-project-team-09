/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen, startApp } from './support/app';
import {
  answerFirstRun,
  cardsShown,
  finishOnboarding,
  FRIEND,
  type Held,
  HINT,
  interestOf,
  INTERESTS,
  later,
  OPERATING_SYSTEMS,
  TIMETABLE,
} from './support/first-run';
import { AI_INPUT } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, MIN_JUN, PHONE_NOW } from './support/server';

// The first run's three cards on the main screen against the fake main server (P05 ticket 09): their order, who sees
// them, what the phone remembers, and what they give way to. Each card's answer is in
// `main-first-run-answers.integration.test.tsx`.

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

let server: FakeServer;
let held: Held;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  held = answerFirstRun(server);
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function restart(): Promise<void> {
  await screen.unmount();
  await startApp();
  await pass(1000);
  await pass(500);
}

describe('the first run after Onboarding', () => {
  it('asks for the Timetable, then interests, then one Friend, each skipped with 나중에', async () => {
    const user = await finishOnboarding();
    expect(cardsShown()).toEqual([TIMETABLE]);
    expect(screen.getByText('시작하기 · 1/3')).toBeVisible();
    expect(screen.getByText('수업 사이의 빈 시간에 맞춰 짜요')).toBeVisible();
    expect(screen.getByText('친구에게는 수업 건물과 끝나는 시각만 보여요')).toBeVisible();

    await later(user);
    expect(cardsShown()).toEqual([INTERESTS]);

    await later(user);
    expect(cardsShown()).toEqual([FRIEND]);
    expect(screen.getByText('친구에게는 먼저 내가 있는 건물이 보여요')).toBeVisible();

    await later(user);
    expect(cardsShown()).toEqual([]);
    expect(server.received('POST /interests')).toEqual([]);
  });

  it('hides the 편의기능 button while a card is shown', async () => {
    const user = await finishOnboarding();
    expect(screen.queryByRole('button', { name: /^편의기능/u })).toBeNull();

    await later(user);
    await later(user);
    await later(user);

    expect(screen.getByRole('button', { name: /^편의기능/u })).toBeVisible();
  });
});

describe('who sees no card', () => {
  it('a new User who has a Class, an interest, and a Friend', async () => {
    held.classes = [OPERATING_SYSTEMS];
    held.interests = [interestOf('채용', 0)];
    held.friends = [MIN_JUN];
    await finishOnboarding();

    expect(cardsShown()).toEqual([]);
    expect(screen.queryByRole('button', { name: HINT })).toBeNull();
  });

  it('a User who finished Onboarding before this version', async () => {
    held.onboarded = true;
    await openMain();

    expect(cardsShown()).toEqual([]);
    expect(screen.queryByRole('button', { name: HINT })).toBeNull();
    // The everyday map reads the watched interests for its marks since the answer switch went (P02-04), so a request
    // for them no longer tells whether the first run asked.
  });
});

describe('after a restart', () => {
  it('shows nothing again once each card was answered or skipped', async () => {
    const user = await finishOnboarding();
    await later(user);
    await later(user);
    await later(user);

    await restart();

    expect(screen.getByRole('tab', { name: '지도' })).toBeVisible();
    expect(cardsShown()).toEqual([]);
  });

  it('shows the card it left off at', async () => {
    const user = await finishOnboarding();
    await later(user);

    await restart();

    expect(cardsShown()).toEqual([INTERESTS]);
  });
});

describe('giving way', () => {
  it('gives way to the answer frame, and comes back when it closes', async () => {
    server.on('POST /assistant/messages', {
      status: 200,
      body: { text: '오늘 학생회관식당 점심은 제육볶음이에요.', mapButtons: [], cards: [], proposal: null },
    });
    const user = await finishOnboarding();

    await user.type(screen.getByLabelText(AI_INPUT), '오늘 점심 뭐 나와?');
    await user.press(screen.getByRole('button', { name: '보내기' }));
    await pass(500);
    expect(cardsShown()).toEqual([]);

    await user.press(within(screen.getByTestId('answer-pill')).getByRole('button', { name: '답 닫기' }));
    await pass(500);
    expect(cardsShown()).toEqual([TIMETABLE]);
  });

  it('asks nothing about interests of a main server that does not keep them', async () => {
    server.on('GET /interests', { status: 404, body: { statusCode: 404, message: 'Cannot GET /interests' } });
    const user = await finishOnboarding();

    await later(user);

    expect(cardsShown()).toEqual([FRIEND]);
    await later(user);
    expect(screen.queryByRole('button', { name: HINT })).toBeNull();
  });
});
