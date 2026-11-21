/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { screen, within } from '@testing-library/react-native';
import { MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { askOnMap, card } from './support/answer-map';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { AI_INPUT } from './support/lists';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// The open list of Friends to add (fix 2 of the design review of 2026-11-15, as its decision sets it), over the stored
// answer to "배고파, 민수랑 같이": the question becomes the card's two lines, "그대로" stands at the right of the chips'
// first line and closes the list, and the band, the steps, "닫기", and the input give way. Closed, the card says
// nothing the map says, and the main button stands beside the input again (P04 ticket 04).

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
const FIRST_PLAN = '12:15 302동식당';

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

// Partitions: the list open; the list closed by "그대로".
describe('the open list of Friends', () => {
  it("asks in the card's lines, with 그대로 where 근거 stood, and no band, steps, 닫기, or input", async () => {
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);

    await user.press(card().getByRole('button', { name: ADD }));

    const lines = within(card().getByTestId('answer-lines'));
    expect(lines.getByText('누구와 같이 먹을까요?')).toBeVisible();
    expect(lines.getByText('지도의 얼굴을 누르거나 아래에서 골라요')).toBeVisible();
    expect(card().queryByText(FIRST_PLAN)).toBeNull();
    const keep: unknown = card().getByRole('button', { name: '그대로' }).parent?.props.testID;
    expect(keep).toBe('condition-chips');
    expect(card().queryByRole('button', { name: '근거' })).toBeNull();
    expect(card().getByTestId('choice-grid')).toBeVisible();
    expect(card().queryByTestId('time-band-track')).toBeNull();
    expect(card().queryByTestId('plan-steps')).toBeNull();
    expect(card().queryByRole('button', { name: '닫기' })).toBeNull();
    expect(screen.queryByLabelText(AI_INPUT)).toBeNull();
  });

  it('closes with 그대로, and brings back the input with the main button beside it', async () => {
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);
    await user.press(card().getByRole('button', { name: ADD }));

    await user.press(card().getByRole('button', { name: '그대로' }));

    expect(card().queryByTestId('answer-lines')).toBeNull();
    expect(card().queryByText('누구와 같이 먹을까요?')).toBeNull();
    expect(card().queryByTestId('choice-grid')).toBeNull();
    expect(screen.getByLabelText(AI_INPUT)).toBeVisible();
    const beside = within(screen.getByTestId('ai-input-beside'));
    expect(beside.getByRole('button', { name: '만들고 초대 보내기' })).toBeVisible();
  });
});

// Partitions: the list open over an answer without a Plan, which draws nothing, so the map takes no press on a face.
describe('the open list of Friends over an answer without a Plan', () => {
  it('says only that the nearest come first', async () => {
    // No stored reply is without a Plan: the stored one with its Plans emptied, and the lines of a day without a menu.
    const answer = {
      ...MEAL_ANSWER_REPLY.answer,
      plans: [],
      noPlan: { reason: 'no-menu', lines: [[{ text: '오늘은 여는 식당이 없어요', strong: false }]] },
    };
    const user = await askOnMap(server, { ...MEAL_ANSWER_REPLY, answer });

    await user.press(card().getByRole('button', { name: ADD }));

    const lines = within(card().getByTestId('answer-lines'));
    expect(lines.getByText('누구와 같이 먹을까요?')).toBeVisible();
    expect(lines.getByText('가까운 친구부터 보여요')).toBeVisible();
    expect(lines.queryByText('지도의 얼굴을 누르거나 아래에서 골라요')).toBeNull();
  });
});
