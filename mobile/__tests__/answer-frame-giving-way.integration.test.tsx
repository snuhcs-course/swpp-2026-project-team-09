/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { fireEvent, within } from '@testing-library/react-native';
import { Keyboard } from 'react-native';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { answerEvents, MAJOR } from './support/events';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { hideKeyboard, KEYBOARD, showKeyboard } from './support/keyboard';
import { AI_INPUT, button } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { DINNER, press } from './support/markers';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';
import { answerShuttle, toggleShuttle } from './support/shuttle';

// What else gives way to the answer frame (P02 ticket 01, "What gives way" and "The input") against the fake main
// server: the shuttle's notice, a selected thing's card, the tab bar, which stays on the other tabs, the map's credit,
// and the keyboard after a send.

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

const REPLY = '셔틀은 월요일에 다녀요.';
const ANSWERED = { status: 200, body: { text: REPLY, mapButtons: [], cards: [], proposal: null } };
// A Saturday at noon, outside the shuttle's service hours, as shuttle-layer.integration.test.tsx has it.
const SATURDAY_NOON = new Date('2026-10-10T12:00:00+09:00');

let server: FakeServer;

async function start(now: Date = PHONE_NOW): Promise<void> {
  jest.useFakeTimers({ now });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  server.on('POST /assistant/messages', ANSWERED);
  givePhone({ permission: 'granted', position: ON_CAMPUS });
}

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

type User = Awaited<ReturnType<typeof openMain>>;

async function ask(user: User): Promise<void> {
  await user.type(screen.getByLabelText(AI_INPUT), '셔틀 언제 다녀?');
  await user.press(screen.getByRole('button', { name: '보내기' }));
  await pass(500);
}

async function closeFrame(user: User): Promise<void> {
  await user.press(within(screen.getByTestId('answer-pill')).getByRole('button', { name: '답 닫기' }));
}

// Partitions: the shuttle's notice outside the service hours; a thing selected before asking.
describe('what gives way to the frame and comes back after ✕', () => {
  it("hides the shuttle's notice", async () => {
    await start(SATURDAY_NOON);
    answerShuttle(server);
    const user = await openMain({ answerOnMap: true });
    await toggleShuttle(user);
    expect(screen.getByTestId('shuttle-notice')).toBeVisible();

    await ask(user);
    expect(screen.queryByTestId('shuttle-notice')).toBeNull();

    await closeFrame(user);
    expect(screen.getByTestId('shuttle-notice')).toBeVisible();
  });

  it('hides the card of a thing selected before asking, which stays selected', async () => {
    await start();
    const user = await openMain({ answerOnMap: true });
    await press(user, DINNER);
    expect(screen.getByTestId('map-card')).toBeVisible();

    await ask(user);
    expect(screen.queryByTestId('map-card')).toBeNull();

    await closeFrame(user);
    expect(screen.getByTestId('map-card')).toBeVisible();
  });
});

// Partitions: the main tab in front with the frame shown; another tab in front; the main tab again.
describe('the tab bar while the frame is shown', () => {
  it('is shown on the tab an event card opens, and gives way again on 지도, where the frame still is', async () => {
    await start();
    answerEvents(server);
    server.on('POST /assistant/messages', {
      status: 200,
      body: {
        text: '설명회가 있어요.',
        mapButtons: [],
        cards: [{ kind: 'globalEvent', globalEvent: MAJOR }],
        proposal: null,
      },
    });
    const user = await openMain({ answerOnMap: true });
    await ask(user);
    expect(screen.queryByRole('tab', { name: '지도' })).toBeNull();

    await user.press(within(screen.getByTestId('answer-card')).getByRole('link', { name: MAJOR.title }));
    await pass(500);
    expect(screen.getByRole('tab', { name: '행사' })).toBeSelected();
    expect(screen.getByRole('tab', { name: '지도' })).toBeVisible();

    await user.press(screen.getByRole('tab', { name: '지도' }));
    await pass(500);
    expect(screen.getByTestId('answer-pill')).toBeVisible();
    expect(screen.queryByRole('tab', { name: '행사' })).toBeNull();
  });
});

// Partitions: the frame's card laid out; the frame closed.
describe("the map's credit while the frame is shown", () => {
  it("sits above the frame's card, and back above the row of buttons after ✕", async () => {
    await start();
    const user = await openMain({ answerOnMap: true });
    await ask(user);

    await fireEvent(screen.getByTestId('answer-card'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 400, width: 390, height: 300 } },
    });

    // The card's 300 from the stage's bottom, which the hidden tab bar leaves at the screen's, and the map's own 8.
    expect(button('지도 데이터 출처 보기')).toHaveStyle({ left: 16, bottom: 308 });
    await closeFrame(user);
    // As main-controls.integration.test.tsx has it with nothing open.
    expect(button('지도 데이터 출처 보기')).toHaveStyle({ left: 16, bottom: 134 });
  });
});

// Partitions: a send with the switch on while the keyboard is up.
describe('a send from the bar with the switch on', () => {
  it('puts the keyboard down, so that the card shows 보는 중이에요 and then the reply', async () => {
    await start();
    server.on('POST /assistant/messages', { ...ANSWERED, afterMs: 1000 });
    const dismiss = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => {
      // The tests' phone has no keyboard to put down; hideKeyboard tells of it going.
    });
    const user = await openMain({ answerOnMap: true });
    await showKeyboard(KEYBOARD);

    await user.type(screen.getByLabelText(AI_INPUT), '셔틀 언제 다녀?');
    await user.press(screen.getByRole('button', { name: '보내기' }));

    expect(dismiss).toHaveBeenCalled();
    await hideKeyboard();
    expect(within(screen.getByTestId('answer-card')).getByText('보는 중이에요')).toBeVisible();
    await pass(1000);
    expect(within(screen.getByTestId('answer-card')).getByText(REPLY)).toBeVisible();
  });
});
