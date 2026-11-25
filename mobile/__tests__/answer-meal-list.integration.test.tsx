/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { screen, within } from '@testing-library/react-native';
import type { AnswerReply } from '@/api/assistant-types';
import { crowdedMealReply } from '@/api/mock/data/crowded-meal';
import { MEAL_ANSWER_MENUS_REPLY } from '@/api/mock/data/meal-answer-menus';
import { koreaDateKey, koreaNextDay } from '@/korea-time';
import { CLOSED_HEADING } from '@/screens/main/answer/meal-list';
import { PLAN_QUEST } from '@/api/mock/data/plan-quest';
import { raiseCard } from './support/card-grip';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { askOnMap, card, timeBar } from './support/answer-map';
import type { FakeServer } from './support/fake-server';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { pass } from './support/app';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';
import { sockets } from './support/fake-socket';

// A meal answer's card (boards E1, E3, E4, and P04 ticket 61's a1–a5): one sheet that starts with the Assistant's
// sentence, then every candidate as a row, the nearest first, with the kinds over them; a press on a row chooses that
// place and opens its menu.

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

// Partitions: low; raised by the grip.
describe('a meal answer with four candidates', () => {
  it('starts the sheet with the sentence whole, and holds the list under it at low too', async () => {
    await askOnMap(server, fourOf(MEAL_ANSWER_MENUS_REPLY));

    expect(screen.getByTestId('meal-words')).toHaveTextContent(SENTENCE);
    expect(list().getByTestId('meal-row-1')).toBeOnTheScreen();
  });

  it('lists every candidate when raised, the least walking first, the chosen one marked, under the kinds', async () => {
    await askOnMap(server, fourOf(MEAL_ANSWER_MENUS_REPLY));

    await raiseCard();

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
    await raiseCard();

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
    await raiseCard();

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

// Partitions: one Plan left of many; the Restaurants closed for the meal beside the candidates.
describe('a meal answer that kept one Plan of many', () => {
  it('lists the Plan alone: the places dropped for the time are not listed (P04 ticket 67)', async () => {
    await askOnMap(server, keptOne(SENTENCE));

    await raiseCard();

    expect(list().getByTestId('meal-row-1')).toBeEnabled();
    expect(list().getByTestId('meal-list-order')).toHaveTextContent(/^1곳 · /u);
    expect(list().queryByText(/시간이 맞지 않는 곳/u)).toBeNull();
    expect(list().queryByText(/10분밖에 못 있어요/u)).toBeNull();
  });
});

const NOTICE = '공대수시면접으로 인해 휴점합니다';

// The answer with 감골식당 closed for the meal by its menu's notice (P04 ticket 67, board z1).
function withClosed(): typeof MEAL_ANSWER_MENUS_REPLY {
  const [first] = MEAL_ANSWER_MENUS_REPLY.answer.plans;
  const place = { ...(first?.place ?? { placeId: 'p', latitude: 37.46, longitude: 126.95 }), label: '감골식당' };
  return {
    ...MEAL_ANSWER_MENUS_REPLY,
    answer: { ...MEAL_ANSWER_MENUS_REPLY.answer, closed: [{ place, notices: [NOTICE] }] },
  };
}

describe('a meal answer with a Restaurant closed for the meal', () => {
  it('ends the list with it under "쉬는 곳", grey with its notice, not numbered, counted, or pressable', async () => {
    await askOnMap(server, withClosed());

    await raiseCard();

    const plans = MEAL_ANSWER_MENUS_REPLY.answer.plans.length;
    expect(list().getByTestId('meal-list-order')).toHaveTextContent(new RegExp(`^${String(plans)}곳 · `, 'u'));
    expect(list().getByText(CLOSED_HEADING)).toBeOnTheScreen();
    const closed = list().getAllByTestId('meal-closed-row');
    expect(closed.map((row) => String(row.props.accessibilityLabel))).toEqual([`감골식당 · ${NOTICE}`]);
    expect(closed[0]?.props.accessibilityRole).toBeUndefined();
    expect(list().queryByRole('button', { name: /감골식당/u })).toBeNull();
    expect(comesBefore(list().getByTestId(`meal-row-${String(plans)}`), list().getByTestId('meal-closed-row'))).toBe(
      true,
    );
  });
});

// Partitions: the crowded answer, whose 기숙사식당 cannot be done before the Class at 15:30, and whose 감골식당 has at
// least the main server's fifteen minutes.
describe('the crowded meal answer raised', () => {
  it('leaves the candidates that cannot be done in the time out of the list and its count (P04 ticket 67)', async () => {
    const date = koreaDateKey(koreaNextDay(PHONE_NOW));
    const reply = crowdedMealReply(date, PHONE_NOW.toISOString());
    await askOnMap(server, reply);

    await raiseCard();

    const labels = list()
      .getAllByRole('button', { name: /^\d+ /u })
      .map((row) => String(row.props.accessibilityLabel).split(' · ')[0]?.replace(/^\d+ /u, ''));
    expect(labels).not.toContain('기숙사식당 (관악사 919동)');
    expect(labels).toContain('감골식당');
    expect(list().getByTestId('meal-list-order')).toHaveTextContent(new RegExp(`^${String(labels.length)}곳 · `, 'u'));
    expect(list().queryByText('시간 안에 다녀오기 어려운 곳')).toBeNull();
  });
});

type Found = ReturnType<typeof screen.getByTestId>;

// Whether `first` comes before `second` in the card: of the children of the nearest element that holds both, the earlier.
function comesBefore(first: Found, second: Found): boolean {
  const line: Found[] = [];
  for (let at: Found | null = second; at !== null; at = at.parent) {
    line.push(at);
  }
  let child = first;
  for (let at = first.parent; at !== null; child = at, at = at.parent) {
    const index = line.indexOf(at);
    if (index > 0) {
      return at.children.indexOf(child) < at.children.indexOf(line[index - 1]);
    }
  }
  return false;
}

// P04 tickets 54 and 61: the meal sheet starts with the Assistant's words, so that the low sheet shows them. Partitions:
// the words, the person chips, and the list.
describe("the raised meal card's order", () => {
  // The people of the Plan are in the time card's "같이 N ›" since PR 552, no longer chips in the card.
  it('is the words, then the list', async () => {
    await askOnMap(server, MEAL_ANSWER_MENUS_REPLY);

    await raiseCard();

    expect(comesBefore(screen.getByTestId('meal-words'), list().getByTestId('meal-row-1'))).toBe(true);
  });
});

// Partitions: one Plan and nothing dropped.
describe('a meal answer of one place', () => {
  it('shows the row, raised, with its people in the time card', async () => {
    const answer: AnswerReply = {
      ...MEAL_ANSWER_MENUS_REPLY.answer,
      plans: MEAL_ANSWER_MENUS_REPLY.answer.plans.slice(0, 1),
    };
    await askOnMap(server, { ...MEAL_ANSWER_MENUS_REPLY, answer });

    await raiseCard();

    expect(timeBar().getByRole('button', { name: '같이 먹을 친구 추가' })).toHaveTextContent('같이 1 ›');
    expect(list().getByTestId('meal-row-1')).toBeEnabled();
  });
});
