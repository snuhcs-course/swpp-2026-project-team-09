/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { fireEvent, within } from '@testing-library/react-native';
import type { AssistantReply } from '@/api/assistant-types';
import { stepsReplyOn } from '@/api/mock/data/steps-answer';
import { markLibraryLoggedIn } from '@/library/flag';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { mapThings } from './support/answer-map';
import { raiseCard } from './support/card-grip';
import type { FakeServer } from './support/fake-server';
import { inFrame, sendFromBar, startLibraryChat } from './support/library-chat';
import { hideKeyboard } from './support/keyboard';
import { layStage } from './support/lists';
import { openMain } from './support/main';
import { pressMarker } from './support/made-quest';
import { serveKwanjeong } from './support/top-stops';

// Several requests on the user's phone (2026-11-28, "관정에서 공부하다가 저녁 먹을래"), P03 ticket 25: the meal's list
// with no pager as a meal alone has, the steps' word "공부" for a seat, each step's flag with "›" whenever a press on it
// does something, and a press on a step's span choosing it as its word does. The reply is the stored one of two steps,
// ① a seat at 관정 17:30–19:00 and ② dinner at 학생회관식당 19:04–19:30, its two Plans with menus, as the main server
// sends them for restaurants whose menus it knows, or as it is stored, without.

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

type User = Awaited<ReturnType<typeof openMain>>;

// The seat's booking stands on the map as on the phone, whose Places hold 관정관.
async function ask(menus = true): Promise<User> {
  await markLibraryLoggedIn();
  serveKwanjeong(server);
  const reply = stepsReplyOn('2026-11-02');
  server.on('POST /assistant/messages', { status: 200, body: menus ? withMenus(reply) : reply });
  const user = await openMain();
  await layStage(390, 760);
  await sendFromBar(user, '17시 반에 관정 갔다가 19시쯤 저녁 먹을래');
  await hideKeyboard();
  await pass(50);
  return user;
}

function flag(number: number): string | undefined {
  return mapThings().find((thing) => thing.startsWith(`${String(number)} `));
}

function word(number: number): ReturnType<typeof screen.getByRole> {
  return screen.getByRole('button', { name: new RegExp(`^${String(number)}번 `, 'u') });
}

// Partitions: the meal's step raised, against a meal alone, which shows its list and no pager.
describe("the meal step's card", () => {
  it('shows its list and no pager, as a meal answer alone does', async () => {
    const user = await ask();
    await user.press(word(2));
    await pass(50);
    await raiseCard();
    await pass(50);

    expect(inFrame().getByTestId('meal-list')).toBeOnTheScreen();
    expect(inFrame().queryByTestId('plan-stepper')).toBeNull();
  });
});

// Partitions: a seat step's word; a meal step's word.
describe("the steps card's words", () => {
  it("say 공부 for the seat, and the title's last word for the meal", async () => {
    await ask();

    expect(word(1)).toHaveAccessibleName(/^1번 공부 /u);
    expect(word(2)).toHaveAccessibleName(/^2번 저녁 /u);
  });
});

// Partitions: each flag with ① chosen, then with ② chosen; a press on the chosen meal step's flag, with menus known and
// without.
describe("the steps' flags", () => {
  it('carry "›" in both choices, and the chosen meal step opens its menu as a meal alone does', async () => {
    const user = await ask();
    expect(flag(1)).toMatch(/›/u);
    expect(flag(2)).toMatch(/›/u);

    await user.press(word(2));
    await pass(50);
    expect(flag(1)).toMatch(/›/u);
    expect(flag(2)).toMatch(/^2 학생회관식당 › /u);

    await pressMarker(user, flag(2) ?? '');
    await pass(100);
    expect(inFrame().getByTestId('meal-menu')).toBeOnTheScreen();
  });

  it('carry "›" on the chosen meal step without menus too, which opens its pick\'s card as a meal alone does', async () => {
    const user = await ask(false);
    await user.press(word(2));
    await pass(50);
    expect(flag(2)).toMatch(/^2 학생회관식당 › /u);

    await pressMarker(user, flag(2) ?? '');
    await pass(100);
    expect(within(screen.getByTestId('mark-card')).getByText('학생회관식당에서 저녁')).toBeOnTheScreen();
  });
});

// Partitions: a press on each span; the span's touch.
describe("the steps card's spans", () => {
  it('choose their step on a press, as the words do, over a touch 44 high', async () => {
    await ask();
    expect(word(1)).toBeSelected();

    await fireEvent.press(screen.getByTestId('step-span-2-touch'));
    await pass(50);
    expect(word(2)).toBeSelected();

    await fireEvent.press(screen.getByTestId('step-span-1-touch'));
    await pass(50);
    expect(word(1)).toBeSelected();
    // Each span's press is a box of its own the spans' full 44 high, as Android sends a child no touch outside its
    // parent: a hit slop past the 24-high track would take none on the phone.
    expect(screen.getByTestId('step-spans')).toHaveStyle({ height: 44 });
    expect(screen.getByTestId('step-span-1-touch')).toHaveStyle({ top: 0, bottom: 0 });
  });
});
