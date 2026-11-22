/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import type { AssistantReply, KeptQuest } from '@/api/assistant-types';
import { MEAL_ANSWER_MENUS, MEAL_ANSWER_MENUS_REPLY } from '@/api/mock/data/meal-answer-menus';
import { PLAN_QUEST } from '@/api/mock/data/plan-quest';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { askOnMap, card } from './support/answer-map';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// P04 ticket 21: a meal answer beside a Quest already set keeps its kinds of food and 메뉴 보기. The dock has two rows:
// the line alone on top, and under it 그대로 두기 first, the kind chips, and 메뉴 보기 at the right. Expected values: the
// shape agreed on 2026-11-22 and the kinds of the stored answer (P04 ticket 16).

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

const LINE = '이미 12:16 302동식당 점심이 있어요. 바꿀까요?';
const KOREAN = '한식 4곳';
const MENUS = '메뉴 보기';
const KEEP = '그대로 두기';
const LUNCH: KeptQuest = {
  kind: 'meal-lunch',
  questId: 'q-lunch',
  title: '302동식당에서 점심',
  startAt: '2026-11-17T12:16:00+09:00',
  endAt: null,
  place: '302동식당',
  point: null,
  people: [],
  mine: true,
  changeable: true,
};
const REPLY: AssistantReply = {
  ...MEAL_ANSWER_MENUS_REPLY,
  text: LINE,
  answer: { ...MEAL_ANSWER_MENUS, planSet: LUNCH },
};

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

function dock(): ReturnType<typeof within> {
  return within(screen.getByTestId('dock-row'));
}

function beside(): ReturnType<typeof within> {
  return within(screen.getByTestId('ai-input-beside'));
}

function buttonNames(): string[] {
  return dock()
    .getAllByRole('button')
    .map((button) => String(button.props.accessibilityLabel ?? ''));
}

// Partitions: the dock at first, a kind pressed, 바꾸기 on its way, and 그대로 두기 pressed.
describe('a meal answer beside a lunch already set', () => {
  it('has the line on top and 그대로 두기, the kinds, and 메뉴 보기 under it, in that order', async () => {
    await askOnMap(server, REPLY);

    expect(dock().getByTestId('dock-line')).toHaveTextContent(LINE, { exact: false });
    const names = buttonNames();
    expect(names.indexOf(KEEP)).toBeGreaterThanOrEqual(0);
    expect(names.indexOf(KEEP)).toBeLessThan(names.indexOf(KOREAN));
    expect(names.at(-1)).toBe(MENUS);
    expect(beside().getByRole('button', { name: '바꾸기' })).toBeEnabled();
  });

  it('chooses a kind as an ordinary meal answer does', async () => {
    const user = await askOnMap(server, REPLY);

    await user.press(dock().getByRole('button', { name: KOREAN }));
    await pass(300);

    expect(dock().getByRole('button', { name: KOREAN })).toHaveProp(
      'accessibilityState',
      expect.objectContaining({ selected: true }),
    );
  });

  it('holds the kinds and 그대로 두기 while 바꾸기 is on its way', async () => {
    server.on('POST /plans', { status: 201, body: PLAN_QUEST, afterMs: 3000 });
    const user = await askOnMap(server, REPLY);

    await user.press(beside().getByRole('button', { name: '바꾸기' }));
    await pass(300);

    expect(dock().getByRole('button', { name: KOREAN })).toBeDisabled();
    expect(dock().getByRole('button', { name: KEEP })).toBeDisabled();
  });

  it('keeps only the line after 그대로 두기', async () => {
    const user = await askOnMap(server, REPLY);

    await user.press(dock().getByRole('button', { name: KEEP }));
    await pass(300);

    expect(card().queryByRole('button', { name: KOREAN })).toBeNull();
    expect(card().queryByRole('button', { name: MENUS })).toBeNull();
    expect(dock().getByTestId('dock-line')).toBeVisible();
  });
});
