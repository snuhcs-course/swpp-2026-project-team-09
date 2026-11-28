/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AssistantReply } from '@/api/assistant-types';
import type { Place } from '@/api/types';
import { MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import { severalAnswersReplyTo } from '@/api/mock/data/several-answers';
import { useMemo } from 'react';
import * as cameraMoves from '@/screens/main/use-camera-moves';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { fireEvent, type userEvent, within } from '@testing-library/react-native';
import { pass, screen } from './support/app';
import { raiseCard } from './support/card-grip';
import { answerDining, PLACES } from './support/dining';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { KEYBOARD, showKeyboard } from './support/keyboard';
import { askForCards, SEAT_CARD, startLibraryChat } from './support/library-chat';
import { layStage, AI_INPUT } from './support/lists';
import { givePhone, NEAR_LIBRARY, ON_CAMPUS, openMain, type Phone } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// The map is framed once for each event that asks for it, a new reply or a press that opens or chooses something,
// and the camera then stays where it rests until the next one (P10 ticket 30, the user's phone, 2026-11-28: "최초 질의
// 혹은 클릭 이후 줌 세팅이 된 이후에는 마음대로 움직일 수 있어야 하는거야"). A pan of the User's own is what the camera
// rests at then; the plain map takes no pan, so each test holds the camera the framing came to rest at, and nothing
// that is no such event may move it: the phone's position, the card's height, the keyboard, a seat's time on the bar.

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

const KWANJEONG: Place = {
  id: 'p62-1',
  number: '62-1',
  name: '중앙도서관 관정관',
  latitude: 37.45903,
  longitude: 126.95247,
};

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const { useCameraMoves } = jest.requireActual<typeof cameraMoves>('@/screens/main/use-camera-moves');

// Counts every move the screen asks of the map's camera: a move, a move to a camera, and a fit.
function countMoves(): () => number {
  let count = 0;
  jest.spyOn(cameraMoves, 'useCameraMoves').mockImplementation((ref) => {
    const { move, place, fit, rested, fitted } = useCameraMoves(ref);
    return useMemo(
      () => ({
        move: (wish: Parameters<typeof move>[0]): void => {
          count += 1;
          move(wish);
        },
        place: (camera: Parameters<typeof place>[0]): void => {
          count += 1;
          place(camera);
        },
        fit: (...args: Parameters<typeof fit>): void => {
          count += 1;
          fit(...args);
        },
        rested,
        fitted,
      }),
      [move, place, fit, rested, fitted],
    );
  });
  return () => count;
}

// What is no framing event: the phone moving, the card dragged up, and the keyboard coming up.
const NOT_EVENTS: [string, (phone: Phone) => Promise<void>][] = [
  [
    "the phone's position",
    async (phone): Promise<void> => {
      await phone.moveTo(NEAR_LIBRARY);
    },
  ],
  [
    'the card raised',
    async (): Promise<void> => {
      await raiseCard();
    },
  ],
  [
    'the keyboard',
    async (): Promise<void> => {
      await showKeyboard(KEYBOARD);
    },
  ],
];

// A seat card's own trigger: its time on the bar, whose end a step earlier changes the flag's words.
const SEAT_NOT_EVENTS: [string, (phone: Phone) => Promise<void>][] = [
  ...NOT_EVENTS,
  [
    'the time on the bar',
    async (): Promise<void> => {
      await fireEvent(
        within(screen.getByTestId('time-bar')).getByRole('adjustable', { name: '끝 시각' }),
        'accessibilityAction',
        {
          nativeEvent: { actionName: 'decrement' },
        },
      );
    },
  ],
];

// Partitions: each trigger that is no framing event, after a seat card's booking was framed. Expected values: the
// camera the framing came to rest at.
describe("A seat card's booking on the map, once framed", () => {
  it.each(SEAT_NOT_EVENTS)('keeps the camera where it rests when %s changes', async (_what, change) => {
    const { server, library } = await startLibraryChat();
    server.on('GET /places', { status: 200, body: [...PLACES, KWANJEONG] });
    const phone = givePhone({ permission: 'granted', position: ON_CAMPUS });
    const moves = countMoves();
    await askForCards({ server, library }, [SEAT_CARD]);
    await layStage(390, 760);
    await pass(1000);
    const framed = moves();
    expect(framed).toBeGreaterThan(0);

    await change(phone);
    await pass(1000);

    expect(moves()).toBe(framed);
  });
});

// Asks from the map's bar, or from the card's input once the answer is shown, and lets the reply come and its framing
// come to rest.
async function ask(user: Awaited<ReturnType<typeof openMain>>, words: string): Promise<void> {
  await user.type(screen.getByLabelText(AI_INPUT), words);
  await user.press(screen.getByRole('button', { name: '보내기' }));
  await layStage(390, 760);
  await pass(1000);
}

// The main server answering every request with `body`, and the phone on campus.
async function answering(body: AssistantReply): Promise<Phone> {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  const server: FakeServer = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  answerDining(server);
  server.on('POST /assistant/messages', { status: 200, body });
  return givePhone({ permission: 'granted', position: ON_CAMPUS });
}

// Partitions: each trigger that is no framing event, after a meal answer was framed; a new reply, which is one.
// Expected values: no move of the camera after the framing came to rest; a move for the new reply.
describe('A meal answer on the map, once framed', () => {
  let phone: Phone;

  beforeEach(async () => {
    phone = await answering(MEAL_ANSWER_REPLY);
  });

  it.each(NOT_EVENTS)('keeps the camera where it rests when %s changes', async (_what, change) => {
    const moves = countMoves();
    await ask(await openMain(), '배고파');
    const framed = moves();
    expect(framed).toBeGreaterThan(0);

    await change(phone);
    await pass(1000);

    expect(moves()).toBe(framed);
  });

  it('frames again for a new reply', async () => {
    const moves = countMoves();
    const user = await openMain();
    await ask(user, '배고파');
    const framed = moves();

    await ask(user, '다른 데 없어?');

    expect(moves()).toBeGreaterThan(framed);
  });
});

// The main server's reply to "점심이랑 저녁 짜줘", moved to the day after the phone's: two steps, each drawn at its own
// answer (P03 ticket 21).
function lunchAndDinner(): AssistantReply {
  const reply = severalAnswersReplyTo('점심이랑 저녁 짜줘', '2026-10-07');
  if (reply === null) {
    throw new Error('No stored reply of lunch and dinner');
  }
  return reply;
}

type User = ReturnType<typeof userEvent.setup>;

// Asks for lunch and dinner, and gives the count of the camera's moves once their framing has come to rest.
async function framedSteps(): Promise<{ user: User; moves: () => number; framed: number }> {
  const moves = countMoves();
  const user = await openMain();
  await ask(user, '점심이랑 저녁 짜줘');
  const framed = moves();
  expect(framed).toBeGreaterThan(0);
  return { user, moves, framed };
}

// Partitions: each trigger that is no framing event, after the steps were framed; another step chosen, and another plan
// of the chosen step's answer, which draws that step at another place, each a press that chooses something. Expected
// values: no move after the framing came to rest; a move for each press.
describe("Several requests' steps on the map, once framed", () => {
  let phone: Phone;

  beforeEach(async () => {
    phone = await answering(lunchAndDinner());
  });

  it.each(NOT_EVENTS)('keep the camera where it rests when %s changes', async (_what, change) => {
    const { moves, framed } = await framedSteps();

    await change(phone);
    await pass(1000);

    expect(moves()).toBe(framed);
  });

  it('are framed again for another step chosen', async () => {
    const { user, moves, framed } = await framedSteps();

    await user.press(screen.getByRole('button', { name: /^2번 /u }));
    await pass(1000);

    expect(moves()).toBeGreaterThan(framed);
  });

  it("are framed again for another plan of the chosen step's answer", async () => {
    const { user, moves, framed } = await framedSteps();

    await user.press(within(screen.getByTestId('plan-stepper')).getByLabelText('다음 후보'));
    await pass(1000);

    expect(screen.getByTestId('plan-count')).toHaveTextContent('2/3');
    expect(moves()).toBeGreaterThan(framed);
  });
});
