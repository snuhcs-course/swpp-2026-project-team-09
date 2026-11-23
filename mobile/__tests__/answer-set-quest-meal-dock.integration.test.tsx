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
import { askOnMap } from './support/answer-map';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// P04 ticket 21: a meal answer beside a Quest already set docks its line; 그대로 두기 stands with 바꾸기 on the row above
// the input (P04 ticket 50). The kinds of food stand over the raised card's list (board E3), not in the dock, and 메뉴 보기 is gone.

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

// Partitions: the dock at first, 바꾸기 on its way, and 그대로 두기 pressed.
describe('a meal answer beside a lunch already set', () => {
  it('has the line in the dock, and 그대로 두기 with 바꾸기 on the row above the input, with no kinds and no 메뉴 보기', async () => {
    await askOnMap(server, REPLY);

    expect(dock().getByTestId('dock-line')).toHaveTextContent(LINE, { exact: false });
    const names = buttonNames();
    expect(names).not.toContain(KEEP);
    expect(names).not.toContain(KOREAN);
    expect(names).not.toContain(MENUS);
    expect(beside().getByRole('button', { name: KEEP })).toBeEnabled();
    expect(beside().getByRole('button', { name: '바꾸기' })).toBeEnabled();
  });

  it('holds 그대로 두기 while 바꾸기 is on its way', async () => {
    // A lunch the User holds changes in place.
    server.on(`PUT /plans/${LUNCH.questId}`, { status: 200, body: PLAN_QUEST, afterMs: 3000 });
    const user = await askOnMap(server, REPLY);

    await user.press(beside().getByRole('button', { name: '바꾸기' }));
    await pass(300);

    expect(beside().getByRole('button', { name: KEEP })).toBeDisabled();
  });

  it('keeps only the line after 그대로 두기', async () => {
    const user = await askOnMap(server, REPLY);

    await user.press(beside().getByRole('button', { name: KEEP }));
    await pass(300);

    expect(screen.queryByRole('button', { name: KEEP })).toBeNull();
    expect(dock().getByTestId('dock-line')).toBeVisible();
  });
});

// Partitions: the list raised once 바꾸기 changed the lunch held (review of PR 477).
describe('the raised list once 바꾸기 changed the lunch held', () => {
  it('chooses nothing again: its rows and kinds take no press, and the changed line stays', async () => {
    server.on(`PUT /plans/${LUNCH.questId}`, { status: 200, body: PLAN_QUEST.quest });
    const user = await askOnMap(server, REPLY);
    await user.press(beside().getByRole('button', { name: '바꾸기' }));
    await pass(500);
    expect(dock().getByText(/바꿨어요/u)).toBeVisible();

    await user.press(screen.getByTestId('dock-line'));
    const row = within(screen.getByTestId('meal-list')).getByTestId('meal-row-2');
    expect(row).toBeDisabled();
    expect(within(screen.getByTestId('kind-chips')).getByRole('button', { name: KOREAN })).toBeDisabled();
    await user.press(row);
    await pass(300);

    expect(screen.queryByTestId('meal-menu')).toBeNull();
    expect(server.received(`PUT /plans/${LUNCH.questId}`)).toHaveLength(1);
    expect(screen.queryByRole('button', { name: '바꾸기' })).toBeNull();
  });
});

// The reply whose plans add 지은 to the lunch held, its start moved to `movesTo` or kept for null (P05 ticket 44).
function adding(movesTo: string | null): AssistantReply {
  return {
    ...REPLY,
    answer: {
      ...MEAL_ANSWER_MENUS,
      planSet: LUNCH,
      adding: { friends: [{ userId: 'u-jieun', name: '지은' }], startAt: LUNCH.startAt, movesTo },
    },
  };
}

// Partitions: the start kept and moved; no Friend added.
describe('a Friend added to the lunch held', () => {
  it('says whom the press invites in place of 바꾸기', async () => {
    await askOnMap(server, adding(null));

    expect(beside().getByRole('button', { name: '지은이 초대 보내기' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: '바꾸기' })).toBeNull();
  });

  it('says the move first when the start moves', async () => {
    await askOnMap(server, adding('2026-11-17T12:58:00+09:00'));

    expect(beside().getByRole('button', { name: '12:58로 옮기고 지은이 초대 보내기' })).toBeEnabled();
  });

  it('says the invitation went once the press changed the lunch, not 바꿨어요', async () => {
    server.on(`PUT /plans/${LUNCH.questId}`, { status: 200, body: PLAN_QUEST.quest });
    const user = await askOnMap(server, adding(null));

    await user.press(beside().getByRole('button', { name: '지은이 초대 보내기' }));
    await pass(500);

    expect(dock().getByText('지은에게 초대를 보냈어요')).toBeVisible();
    expect(screen.queryByText(/바꿨어요/u)).toBeNull();
  });

  it('keeps 바꾸기 without the field', async () => {
    await askOnMap(server, REPLY);

    expect(beside().getByRole('button', { name: '바꾸기' })).toBeEnabled();
  });
});
