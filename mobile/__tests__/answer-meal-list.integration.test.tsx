/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { screen, within } from '@testing-library/react-native';
import type { AnswerReply } from '@/api/assistant-types';
import { crowdedMealReply } from '@/api/mock/data/crowded-meal';
import { MEAL_ANSWER_MENUS_REPLY } from '@/api/mock/data/meal-answer-menus';
import { koreaDateKey, koreaNextDay } from '@/korea-time';
import { LATE_HEADING } from '@/screens/main/answer/meal-list';
import { PLAN_QUEST } from '@/api/mock/data/plan-quest';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { askOnMap, card } from './support/answer-map';
import type { FakeServer } from './support/fake-server';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { pass } from './support/app';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';
import { sockets } from './support/fake-socket';

// A meal answer's card (boards E1, E3, E4): docked, the Assistant's sentence with no chips; raised, every candidate as a
// row, the nearest first, with the kinds over them; a press on a row chooses that place and opens its menu.

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

const SENTENCE = '12:15에 302동식당에서 민수와 만나 먹어요.';

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

function list(): ReturnType<typeof within> {
  return within(screen.getByTestId('meal-list'));
}

// The stored answer with its first four Plans, so that four candidates have menus.
function fourOf(reply: typeof MEAL_ANSWER_MENUS_REPLY): typeof MEAL_ANSWER_MENUS_REPLY {
  const answer: AnswerReply = { ...reply.answer, plans: reply.answer.plans.slice(0, 4) };
  return { ...reply, answer };
}

type User = Awaited<ReturnType<typeof askOnMap>>;

async function raise(user: User): Promise<void> {
  await user.press(screen.getByText(/^올리면 \d+곳 목록$/u));
}

// Partitions: docked; raised by the caption.
describe('a meal answer with four candidates', () => {
  it('docks with the sentence alone: no kind chips and no 메뉴 보기', async () => {
    await askOnMap(server, fourOf(MEAL_ANSWER_MENUS_REPLY));

    expect(screen.getByTestId('dock-line-words')).toHaveTextContent(SENTENCE);
    expect(screen.queryByRole('button', { name: '메뉴 보기' })).toBeNull();
    expect(screen.queryByTestId('kind-chips')).toBeNull();
  });

  it('lists every candidate when raised, the least walking first, the chosen one marked, under the kinds', async () => {
    const user = await askOnMap(server, fourOf(MEAL_ANSWER_MENUS_REPLY));

    await raise(user);

    const rows = ['1', '2', '3', '4'].map((number) => list().getByTestId(`meal-row-${number}`));
    expect(rows.map((row) => String(row.props.accessibilityLabel).split(' · ')[0])).toEqual([
      '1 302동식당',
      '2 301동식당',
      '3 학생회관식당',
      '4 3식당',
    ]);
    const labels = list()
      .getAllByRole('button', { name: /^\d /u })
      .map((row) => String(row.props.accessibilityLabel));
    expect(labels).toHaveLength(4);
    const walks = labels.map((label) => Number(/걸음 (\d+)분/u.exec(label)?.[1] ?? Number.NaN));
    expect(walks.every((walk) => !Number.isNaN(walk))).toBe(true);
    expect(walks).toEqual(walks.toSorted((one, other) => one - other));
    expect(String(rows[0]?.props.accessibilityLabel)).toMatch(/^1 302동식당 · 걸음 \d+분 · .* · 고른 곳$/u);
    expect(within(screen.getByTestId('kind-chips')).getByRole('button', { name: /^전체 4곳$/u })).toBeSelected();
  });
});

// Partitions: a row pressed; ‹ 목록 pressed.
describe('a row of the list pressed', () => {
  it('chooses that place and opens its menu, and ‹ 4곳 목록 returns to the list', async () => {
    const user = await askOnMap(server, fourOf(MEAL_ANSWER_MENUS_REPLY));
    await raise(user);

    await user.press(list().getByTestId('meal-row-2'));

    const menu = within(screen.getByTestId('meal-menu'));
    expect(menu.getByText('301동식당')).toBeVisible();
    expect(menu.getByText(/^12:18 도착/u)).toBeVisible();
    expect(screen.getByRole('button', { name: /^301동식당 · 12:18 /u })).toBeOnTheScreen();

    await user.press(menu.getByRole('button', { name: '‹ 4곳 목록' }));
    expect(screen.queryByTestId('meal-menu')).toBeNull();
    expect(String(list().getByTestId('meal-row-2').props.accessibilityLabel)).toMatch(/ · 고른 곳$/u);
  });
});

const HELD_MS = 3000;

// Partitions: a row pressed while the Plan on screen is being sent (review of PR 440).
describe('the list while the Plan is sent', () => {
  it('chooses nothing while "만들고 초대 보내기" is on its way, and the made card shows for the Plan sent', async () => {
    server.on('POST /plans', { status: 201, body: PLAN_QUEST, afterMs: HELD_MS });
    const user = await askOnMap(server, fourOf(MEAL_ANSWER_MENUS_REPLY));
    await raise(user);

    await user.press(within(screen.getByTestId('ai-input-beside')).getByRole('button', { name: '만들고 초대 보내기' }));
    const third = list().getByTestId('meal-row-3');
    expect(third).toBeDisabled();
    await user.press(third);
    await pass(HELD_MS);

    expect(screen.getByRole('button', { name: /^302동식당 · 12:15 /u })).toBeOnTheScreen();
    expect(card().getByText('김민수에게 점심 초대를 보냈어요')).toBeVisible();
  });
});

// The answer kept one Plan of three: the other two dropped for 김민수's time (the user's phone, 2026-11-22).
function keptOne(text: string): typeof MEAL_ANSWER_MENUS_REPLY {
  const [first, ...rest] = MEAL_ANSWER_MENUS_REPLY.answer.plans.slice(0, 3);
  const dropped = rest.map(({ place }) => ({ place, reason: '김민수는 10분밖에 못 있어요' }));
  const answer: AnswerReply = { ...MEAL_ANSWER_MENUS_REPLY.answer, plans: first === undefined ? [] : [first], dropped };
  return { ...MEAL_ANSWER_MENUS_REPLY, text, answer };
}

// Partitions: one Plan left of many, with the model's words and without; the candidates that cannot be done in time.
describe('a meal answer that kept one Plan of many', () => {
  it('says in the dock that one place alone fits, with no "›", and the caption raises the list', async () => {
    await askOnMap(server, keptOne('아래에서 확인해 보세요.'));

    expect(screen.getByTestId('dock-line-words')).toHaveTextContent(/^김민수와 시간이 맞는 곳은 302동식당뿐이에요 · /u);
    expect(screen.getByTestId('dock-line').props.accessibilityRole).toBeUndefined();
    expect(screen.getByText('올리면 3곳 목록')).toBeOnTheScreen();
  });

  it('lists the Plan, then the places dropped under their reason, faded and not pressable, under the people', async () => {
    const user = await askOnMap(server, keptOne(SENTENCE));

    await raise(user);

    expect(card().getByText('김민수')).toBeOnTheScreen();
    expect(list().getByTestId('meal-row-1')).toBeEnabled();
    expect(list().getByText('김민수와 시간이 맞지 않는 곳')).toBeOnTheScreen();
    const dropped = list().getAllByTestId('meal-dropped-row');
    expect(dropped.map((row) => String(row.props.accessibilityLabel))).toEqual([
      '301동식당 · 김민수는 10분밖에 못 있어요',
      '학생회관식당 · 김민수는 10분밖에 못 있어요',
    ]);
    expect(dropped[0]?.props.accessibilityRole).toBeUndefined();
  });
});

// Partitions: the crowded answer, two of whose restaurants open too late for the Class at 15:30.
describe('the crowded meal answer raised', () => {
  it('lists the candidates that cannot be done in the time last, under one line that says so', async () => {
    const date = koreaDateKey(koreaNextDay(PHONE_NOW));
    const user = await askOnMap(server, crowdedMealReply(date, PHONE_NOW.toISOString()));

    await raise(user);

    const labels = list()
      .getAllByRole('button', { name: /^\d+ /u })
      .map((row) => String(row.props.accessibilityLabel).split(' · ')[0]?.replace(/^\d+ /u, ''));
    expect(labels.slice(-2).toSorted()).toEqual(['감골식당', '기숙사식당 (관악사 919동)']);
    expect(list().getByText(LATE_HEADING)).toBeOnTheScreen();
  });
});

// Partitions: one Plan and nothing dropped (review of PR 483: the dock's line takes no press).
describe('a meal answer of one place', () => {
  it('raises by "올리면 1곳 목록", to the people and the row', async () => {
    const answer: AnswerReply = {
      ...MEAL_ANSWER_MENUS_REPLY.answer,
      plans: MEAL_ANSWER_MENUS_REPLY.answer.plans.slice(0, 1),
    };
    const user = await askOnMap(server, { ...MEAL_ANSWER_MENUS_REPLY, answer });

    await user.press(screen.getByText('올리면 1곳 목록'));

    expect(card().getByText('김민수')).toBeOnTheScreen();
    expect(list().getByTestId('meal-row-1')).toBeEnabled();
  });
});
