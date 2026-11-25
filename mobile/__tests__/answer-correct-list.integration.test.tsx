/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { screen, within } from '@testing-library/react-native';
import { MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import { MEAL_ANSWER_ALONE } from '@/api/mock/data/meal-answers';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, shownAddress } from './support/app';
import { askOnMap, card, mapThings, timeBar } from './support/answer-map';
import { recalculations } from './support/answer-correct';
import { holdBackButton } from './support/back';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { AI_INPUT } from './support/lists';
import { givePhone, ON_CAMPUS } from './support/main';
import { lookOf } from './support/markers';
import { startFresh } from './support/mocks';
import { pickCancel, pickDone, pickRow } from './support/picking';
import { answerMainScreen, askMainServer, MIN_JUN, PHONE_NOW } from './support/server';

// The time card while people are picked in it (P04 ticket 64), over the stored answer to "배고파, 민수랑 같이":
// "＋ 같이" in the time bar's head opens the card's rows, and "취소" and "완료" take the chip's place. The bottom card
// keeps the answer and the input, its main button waiting for 완료. A way out, "취소" or Android's back, leaves the
// Plan as it was and asks nothing, and the main button stands beside the input again (P04 ticket 04). With 민수 in the
// Plan, the chip reads "같이 1 ›". A User without Friends is led to adding one (board p20).

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

const ADD = '같이 먹을 친구 추가';
const INVITE = '만들고 초대 보내기';
const PICK = '302동식당 · 12:15 점심';
const HINT = '지도의 얼굴을 눌러도 골라져요';

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

// Partitions: picking open; opened the first time and again.
describe('the time card while people are picked', () => {
  it('opens its rows, with 취소 and 완료 in the chip’s place, the answer and the input kept, and no main button', async () => {
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);
    // P04 ticket 14: "＋ 같이" is in the time bar, and the dock holds the input's row alone.
    expect(card().queryByRole('button', { name: ADD })).toBeNull();

    await user.press(timeBar().getByRole('button', { name: ADD }));

    expect(screen.getByTestId('time-card-grip')).toBeExpanded();
    expect(timeBar().queryByRole('button', { name: ADD })).toBeNull();
    expect(pickCancel()).toHaveTextContent('취소');
    expect(pickDone()).toHaveTextContent('완료 · 1명');
    expect(mapThings()).toContain(PICK);
    expect(card().queryByRole('button', { name: '그대로' })).toBeNull();
    expect(screen.getByLabelText(AI_INPUT)).toBeVisible();
    expect(screen.queryByRole('button', { name: INVITE })).toBeNull();
  });

  it('says once, under the card, that a face on the map picks too', async () => {
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);

    await user.press(timeBar().getByRole('button', { name: ADD }));
    expect(screen.getByTestId('pick-hint')).toHaveTextContent(HINT);
    await user.press(pickCancel());
    await user.press(timeBar().getByRole('button', { name: ADD }));

    expect(screen.queryByTestId('pick-hint')).toBeNull();
  });
});

// Partitions: 취소; Android's back. Expected values: the Plan as it was, nothing asked, 김민준 checked and then left
// with the "+" on his face.
describe('leaving the picking', () => {
  it.each([['취소'], ["Android's back"]])(
    'by %s asks nothing, leaves the Plan as it was, and brings back the chip and the main button',
    async (way) => {
      const back = holdBackButton();
      const user = await askOnMap(server, MEAL_ANSWER_REPLY);
      await user.press(timeBar().getByRole('button', { name: ADD }));
      await user.press(pickRow(MIN_JUN.name));
      expect(lookOf(MIN_JUN.name)).toMatch(/^person:.+:selected$/u);

      if (way === '취소') {
        await user.press(pickCancel());
      } else {
        expect(await back()).toBe(true);
      }
      await pass(500);

      expect(recalculations(server)).toEqual([]);
      expect(screen.queryByTestId('time-card-pick-done')).toBeNull();
      expect(timeBar().getByRole('button', { name: ADD })).toHaveTextContent('같이 1 ›');
      expect(lookOf(MIN_JUN.name)).toMatch(/^person:.+:addable$/u);
      expect(mapThings()).toContain(PICK);
      const beside = within(screen.getByTestId('ai-input-beside'));
      expect(beside.getByRole('button', { name: INVITE })).toBeVisible();
    },
  );
});

// Asks with no Friend at all, over the stored answer for the User alone, and opens the picking.
async function openAlone(): Promise<Awaited<ReturnType<typeof askOnMap>>> {
  server.on('GET /friends', { status: 200, body: [] });
  const user = await askOnMap(server, { ...MEAL_ANSWER_REPLY, answer: MEAL_ANSWER_ALONE });
  await user.press(timeBar().getByRole('button', { name: ADD }));
  return user;
}

// Partitions: no Friend at all, over the stored answer for the User alone; its 닫기 and its link. Expected values:
// board p20, one line with "친구 추가 ›" and "닫기" alone in the head.
describe('the picking without Friends', () => {
  it('says there is none yet, and closes by 닫기 alone, asking nothing', async () => {
    const user = await openAlone();

    expect(screen.getByTestId('time-card-no-friends')).toHaveTextContent('아직 친구가 없어요친구 추가 ›');
    expect(screen.queryByTestId('time-card-pick-cancel')).toBeNull();
    expect(screen.queryByTestId('pick-hint')).toBeNull();
    expect(pickDone()).toHaveTextContent('닫기');
    await user.press(pickDone());
    await pass(500);

    expect(screen.queryByTestId('time-card-pick-done')).toBeNull();
    expect(recalculations(server)).toEqual([]);
  });

  it('opens adding a Friend from 친구 추가 ›', async () => {
    const user = await openAlone();

    await user.press(screen.getByRole('link', { name: '친구 추가 ›' }));
    await pass(500);

    expect(shownAddress()).toBe('/me/friends/add');
  });
});
