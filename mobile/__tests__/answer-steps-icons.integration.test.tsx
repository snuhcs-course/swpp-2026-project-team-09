/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AssistantReply } from '@/api/assistant-types';
import { severalAnswersReplyTo } from '@/api/mock/data/several-answers';
import { stepsReplyOn } from '@/api/mock/data/steps-answer';
import { markLibraryLoggedIn } from '@/library/flag';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { mapThings } from './support/answer-map';
import type { FakeServer } from './support/fake-server';
import { hideKeyboard } from './support/keyboard';
import { inFrame, sendFromBar, startLibraryChat } from './support/library-chat';
import { layStage } from './support/lists';
import { pressMarker } from './support/made-quest';
import { openMain } from './support/main';
import { serveKwanjeong } from './support/top-stops';

// Several requests mark their steps by kind, numbers mean candidates alone (P03 ticket 26, the user's "가안이
// 좋아보여"): the steps card reads each step's icon, word and time; the step shown is drawn as its answer or booking
// alone, its candidates numbered and pressable on the map; the other steps stand as their kinds' marks with their
// flags, and no mark or word carries a step's number. Replies: the stored two steps, ① a seat at 관정 17:30–19:00 and
// ② dinner at 학생회관식당 with two Plans with menus; and three steps, 공부 → 밥 → 공부, from two of the main server's
// replies (`several-answers.ts`): a study place from 07:00 and lunch, then the seat at 관정 from 17:30.

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

const DAY = '2026-11-02';

let server: FakeServer;

beforeEach(async () => {
  ({ server } = await startLibraryChat());
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

function withMenus(reply: AssistantReply): AssistantReply {
  const { answer } = reply;
  if (answer === null || answer === undefined) {
    return reply;
  }
  const plans = answer.plans.map((plan) => ({
    ...plan,
    menu: { price: null, dishes: [{ name: '돈까스', price: 5500, cuisine: '양식' as const }] },
  }));
  return { ...reply, answer: { ...answer, plans } };
}

// 공부 → 밥 → 공부: the main server's study place and lunch, then its seat card at 관정 from its seat-then-dinner reply.
function threeSteps(): AssistantReply {
  const studyLunch = severalAnswersReplyTo('아침 7시에 도서관 갔다가 점심', DAY);
  const seatDinner = severalAnswersReplyTo('5시 반부터 관정 7층에 있다가 저녁 먹을래', DAY);
  const seat = seatDinner?.steps?.[0];
  if (studyLunch === null || seatDinner === null || seat === undefined) {
    throw new Error('No stored reply of a study place, lunch, and a seat');
  }
  return { ...studyLunch, cards: seatDinner.cards, steps: [...(studyLunch.steps ?? []), seat] };
}

type User = Awaited<ReturnType<typeof openMain>>;

async function ask(reply: AssistantReply): Promise<User> {
  await markLibraryLoggedIn();
  serveKwanjeong(server);
  server.on('POST /assistant/messages', { status: 200, body: reply });
  const user = await openMain();
  await layStage(390, 760);
  await sendFromBar(user, '17시 반에 관정 갔다가 19시쯤 저녁 먹을래');
  await hideKeyboard();
  await pass(50);
  return user;
}

const word = (number: number): ReturnType<typeof screen.getByTestId> =>
  screen.getByTestId(`step-word-${String(number)}`);

async function choose(user: User, number: number): Promise<void> {
  await user.press(word(number));
  await pass(100);
}

// A thing on the map named as a step's number would be ("1 …").
const numbered = (): string[] => mapThings().filter((name) => /^\d+ /u.test(name));

const thing = (start: string): string | undefined => mapThings().find((name) => name.startsWith(start));

// Partitions: the steps card's words; the map with the seat shown, with dinner shown.
describe('Two steps, a seat and dinner', () => {
  it("read each step's word and time on the steps card, with no number", async () => {
    await ask(withMenus(stepsReplyOn(DAY)));

    expect(word(1)).toHaveAccessibleName('공부 17:30–19:00');
    expect(word(2)).toHaveAccessibleName('저녁 19:04–19:30');
    expect(screen.queryByText(/[①②③]/u)).toBeNull();
  });

  it("draw the seat as its booking alone and dinner as its kind's mark, with no step's number", async () => {
    await ask(withMenus(stepsReplyOn(DAY)));

    expect(word(1)).toBeSelected();
    // The booking's own pick, as a seat card alone names it (`answer-booking-on-map`).
    expect(thing('관정 7층 열람실 · 17:30')).toBeDefined();
    expect(thing('학생회관식당 › · 19:04–19:30')).toBeDefined();
    expect(numbered()).toEqual([]);
  });

  it('draw dinner as its answer alone, its candidates numbered and pressable, and the seat beside it', async () => {
    const user = await ask(withMenus(stepsReplyOn(DAY)));
    await choose(user, 2);

    expect(thing('후보 2 · 동원관식당')).toBeDefined();
    expect(thing('관정 7층 열람실 ›')).toBeDefined();
    expect(numbered()).toEqual([]);

    await pressMarker(user, thing('후보 2 · 동원관식당') ?? '');
    await pass(300);
    expect(inFrame().getByTestId('meal-row-2')).toBeSelected();

    await pressMarker(user, thing('관정 7층 열람실 ›') ?? '');
    await pass(100);
    expect(word(1)).toBeSelected();
  });
});

// Partitions: three steps, two of one kind; the study place shown; a press on the other study step's mark.
describe('Three steps, 공부 → 밥 → 공부', () => {
  it('read two 공부 steps by their times, and the study place shown draws its own candidates', async () => {
    const user = await ask(threeSteps());

    expect(word(1)).toHaveAccessibleName('공부 07:00–10:00');
    expect(word(2)).toHaveAccessibleName('점심 11:00–12:00');
    expect(word(3)).toHaveAccessibleName('공부 17:30–19:00');

    await choose(user, 1);
    expect(mapThings().some((name) => name.startsWith('후보 '))).toBe(true);
    expect(thing('학생회관식당 › · 11:00–12:00')).toBeDefined();
    expect(numbered()).toEqual([]);

    await pressMarker(user, thing('관정 7층 열람실 ›') ?? '');
    await pass(100);
    expect(word(3)).toBeSelected();
  });
});
