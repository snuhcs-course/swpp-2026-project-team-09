/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import type { AssistantReply } from '@/api/assistant-types';
import { severalAnswersReplyTo } from '@/api/mock/data/several-answers';
import { stepsReplyOn } from '@/api/mock/data/steps-answer';
import { LEAVE_LOOKUP_REPLY } from '@/api/mock/data/way-lookups';
import { radius } from '@/design-system';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { mapThings } from './support/answer-map';
import type { FakeServer } from './support/fake-server';
import { hideKeyboard } from './support/keyboard';
import { sendFromBar, startLibraryChat } from './support/library-chat';
import { stepGrip } from './support/time-card';
import {
  atStep,
  BEHIND,
  frame,
  pressGrip,
  pull,
  serveKwanjeong,
  shiftOf,
  stepsBottom,
  stepsCard,
  styleOf,
  timeCard,
} from './support/top-stops';

// The chosen step of several requests draws the top card its answer draws alone (P03 ticket 23): the seat's step its
// booking's time card under the steps card, folding in the same stops as a Plan's; a step with none the strip; and a
// Lookup the steps' reply gave takes the map and that place, the steps card staying (rule 7). The reply is "17시 반에
// 관정 갔다가 19시쯤 저녁 먹을래": ① a seat 17:30–19:00, ② dinner.

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
  ({ server } = await startLibraryChat());
  serveKwanjeong(server);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// The same reply with the seat's booking refused: its step not done and without a card, so it has no top card.
function seatRefused(): AssistantReply {
  const reply = stepsReplyOn('2026-11-02');
  const [seat, ...rest] = reply.steps ?? [];
  const refused = seat === undefined ? [] : [{ ...seat, status: 'not-done' as const, shows: null }];
  return { ...reply, cards: [], steps: [...refused, ...rest] };
}

// The main server's reply of a seat and dinner whose steps name their answers by key (`several-answers.ts`), as an
// app that says `answers` gets it.
function keyed(): AssistantReply {
  const reply = severalAnswersReplyTo('관정에 있다가 저녁', '2026-11-02');
  if (reply === null) {
    throw new Error('No stored reply of a seat and dinner');
  }
  return reply;
}

const ALL = { includeHiddenElements: true };

const headWords = (): ReturnType<typeof screen.getByTestId> =>
  within(screen.getByTestId('time-card-head')).getByTestId('time-band-words');

// Partitions: the seat's step, with its booking's card; a step with no top card.
describe("the seat's step at the top", () => {
  it("draws the seat's time card under the steps card, which folds in the same stops", async () => {
    await atStep(server, 1);

    expect(headWords()).toHaveTextContent(/17:30/u);
    expect(screen.queryByTestId('steps-strip')).toBeNull();
    expect(styleOf(frame())).toMatchObject({ top: Number(styleOf(stepsCard()).top) + radius.xl, overflow: 'hidden' });
    await stepGrip('tuck');
    await pass(50);
    expect(shiftOf(timeCard())).toBe(-BEHIND);
    await stepGrip('tuck');
    await pass(50);
    expect(shiftOf(stepsCard())).toBe(-stepsBottom());
    await pressGrip();
    expect(shiftOf(stepsCard())).toBe(0);
  });

  it('keeps a strip of its own under the steps card for a step with no top card, opening nothing downward', async () => {
    await atStep(server, 1, seatRefused());

    expect(timeCard()).toBeUndefined();
    await pressGrip('steps-strip-grip');
    await pull('steps-strip-drag', 200);
    expect(timeCard()).toBeUndefined();
    expect(shiftOf(stepsCard())).toBe(0);
    await pull('steps-strip-drag', -400);
    expect(shiftOf(stepsCard())).toBe(-stepsBottom());
  });
});

// The card under the map shows the chosen step's own answer, as the review of the pictures asked: the seat's ticket
// alone for the seat's step, the meal's list alone for dinner's. Before, the seat's step kept the meal's list, its
// ticket below it. Partitions: the seat chosen, then dinner.
describe("the chosen step's card under the map", () => {
  it("is the seat's ticket for the seat's step and the meal's list for dinner's, never both", async () => {
    const user = await atStep(server, 1);
    const [card] = stepsReplyOn('2026-11-02').cards;
    const ticket = `library-book-${card?.kind === 'library' ? card.library.key : ''}`;
    expect(screen.getByTestId(ticket, ALL)).toBeTruthy();
    expect(screen.queryByTestId('meal-list', ALL)).toBeNull();
    // As a seat answer alone since P10 ticket 27: one time axis, the time card's on the bar; in the card the ticket with
    // no band of its own and no 예약 안 함; 예약하기 beside the input. Before, the card drew a second band.
    expect(screen.queryByTestId('slot-band', ALL)).toBeNull();
    expect(screen.queryByText('예약 안 함', ALL)).toBeNull();
    expect(within(screen.getByTestId('ai-input-beside')).getByRole('button', { name: '예약하기' })).toBeVisible();

    await user.press(screen.getByRole('button', { name: /^2번/u }));
    await pass(50);

    expect(screen.getByTestId('meal-list', ALL)).toBeTruthy();
    expect(screen.queryByTestId(ticket, ALL)).toBeNull();
  });
});

// Rule 7 (the user's choice of 2026-11-28): partitions, a Lookup with the steps; the next reply that draws them.
describe('a Lookup in the turn of several requests', () => {
  it('takes the map and the place under the steps card, which stays, until a reply draws the steps again', async () => {
    const user = await atStep(server, 2, keyed());
    const { steps } = keyed();
    expect(mapThings()).toContainEqual(expect.stringMatching(/^1 /u));

    server.on('POST /assistant/messages', { status: 200, body: { ...LEAVE_LOOKUP_REPLY, steps, answers: [] } });
    await sendFromBar(user, '언제 나서면 돼?');
    await hideKeyboard();
    await pass(50);

    expect(screen.getByTestId('steps-top')).toBeVisible();
    expect(screen.getByRole('button', { name: /^2번/u })).toBeSelected();
    expect(headWords()).toHaveTextContent(/12:45 나서기/u);
    expect(mapThings()).not.toContainEqual(expect.stringMatching(/^1 /u));

    server.on('POST /assistant/messages', { status: 200, body: keyed() });
    await sendFromBar(user, '다시 보여줘');
    await hideKeyboard();
    await pass(50);

    expect(headWords()).not.toHaveTextContent(/나서기/u);
    expect(screen.getByRole('button', { name: /^2번/u })).toBeSelected();
    expect(mapThings()).toContainEqual(expect.stringMatching(/^1 /u));
  });
});
