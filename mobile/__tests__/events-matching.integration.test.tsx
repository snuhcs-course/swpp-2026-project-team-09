/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-11-03  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen, shownAddress } from './support/app';
import { answerEvents, card, CAREER, MY_CAREER, openEvents, waiting } from './support/events';
import { openLive, socketServer } from './support/live';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { toast } from './support/room';
import { askMainServer, DINNER, PHONE_NOW } from './support/server';

// AI 매칭 on the 행사 tab in the HE build, where Matching was dropped: each press that would open it says 준비 중이에요
// and opens nothing. A match that arrives over the connection is still told. Against the fake main server.

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

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// The press said 준비 중이에요, and the 행사 tab is still all there is: no AI 매칭 sheet, no list, nothing asked.
function saidNotReady(): void {
  expect(toast()).toHaveTextContent('준비 중이에요');
  expect(shownAddress()).toBe('/events');
  expect(screen.queryByRole('header', { name: 'AI 매칭' })).toBeNull();
  expect(server.received('POST /matching-requests')).toHaveLength(0);
}

describe('AI 매칭 in the HE build', () => {
  it("says 준비 중이에요 on a card's AI 매칭", async () => {
    answerEvents(server);
    const user = await openEvents();

    await user.press(card(CAREER).getByRole('button', { name: 'AI 매칭' }));
    await pass(500);

    saidNotReady();
    expect(card(CAREER).getByRole('button', { name: 'AI 매칭' })).toBeVisible();
  });

  it("says 준비 중이에요 on a card's 매칭 중", async () => {
    answerEvents(server, { matching: [waiting(CAREER.id)] });
    const user = await openEvents();

    await user.press(card(CAREER).getByRole('button', { name: '매칭 중' }));
    await pass(500);

    saidNotReady();
    expect(card(CAREER).getByRole('button', { name: '매칭 중' })).toBeVisible();
  });

  it("says 준비 중이에요 on the bar's AI 매칭 신청 내역, which still counts the waiting requests", async () => {
    answerEvents(server, { matching: [waiting(CAREER.id)] });
    const user = await openEvents();

    await user.press(screen.getByRole('button', { name: 'AI 매칭 신청 내역 1건' }));
    await pass(500);

    saidNotReady();
    expect(screen.queryByText('신청한 매칭이 없어요')).toBeNull();
  });
});

describe('a match', () => {
  it('arrives over the connection: a toast, and its Quest in the Quest list', async () => {
    answerEvents(server, { matching: [waiting(CAREER.id)] });
    const socket = await openLive();
    expect(screen.getByTestId('quest-count')).toHaveTextContent('1');
    server.on('GET /matching-requests', { status: 200, body: [] });
    server.on(`GET /matching-requests/${CAREER.id}`, {
      status: 200,
      body: { ...waiting(CAREER.id), state: 'matched', questId: MY_CAREER.id },
    });
    server.on('GET /quests', { status: 200, body: [DINNER, MY_CAREER] });

    await socketServer(() => {
      socket.send('matching-changed');
    });
    await pass(500);

    expect(toast()).toHaveTextContent('AI 커리어 설명회 파티가 만들어졌어요');
    expect(screen.getByTestId('quest-count')).toHaveTextContent('2');
    expect(within(screen.getByTestId('quest-rows')).getByText(CAREER.title)).toBeVisible();
  });
});
