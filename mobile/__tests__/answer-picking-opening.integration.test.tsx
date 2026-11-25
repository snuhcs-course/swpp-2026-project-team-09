/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { screen } from '@testing-library/react-native';
import { MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass } from './support/app';
import { askOnMap, timeBar } from './support/answer-map';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { pickDone } from './support/picking';
import { answerMainScreen, askMainServer, JI_WOO, MIN_JUN, PHONE_NOW } from './support/server';

// P04 ticket 67, from the user's phone (2026-11-26, "김태현이 뜬 뒤에 나중에 안진영 함재현이 떠"): picking's rows
// come all at once and in their order, whenever the User's Friend list arrives. Over the stored answer to "배고파,
// 민수랑 같이", with 민수 in the Plan, and the fake main server's Friends 김민준, nearest, and 서지우, whose position is
// not known.

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
const ROWS = ['민수 · 걸음 0분', '김민준 · 걸음 16분', '서지우 · 위치 모름'];

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

function chip(): ReturnType<typeof screen.getByRole> {
  return timeBar().getByRole('button', { name: ADD });
}

// The rows a screen reader reaches now, in order.
function rowsShown(): string[] {
  return screen
    .queryAllByRole('checkbox')
    .map((row): unknown => row.props.accessibilityLabel)
    .filter((name): name is string => typeof name === 'string');
}

// Partitions: the Friend list still on its way as "＋ 같이" is pressed; the list failed. Expected values: the rows in
// the order of ticket 64, the Plan's 민수 first.
describe('the rows as picking opens', () => {
  it('shows no row while the Friend list is on its way, then all of them in their order', async () => {
    server.on('GET /friends', { status: 200, body: [MIN_JUN, JI_WOO], afterMs: 20_000 });
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);

    await user.press(chip());
    await pass(1000);

    expect(rowsShown()).toEqual([]);

    await pass(20_000);

    expect(rowsShown()).toEqual(ROWS);
  });

  it('opens with the answer’s rows and "완료" when the Friend list fails', async () => {
    server.on('GET /friends', { status: 500, body: {} });
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);
    await pass(10_000);

    await user.press(chip());
    await pass(1000);

    expect(rowsShown()).toEqual([ROWS[0]]);
    expect(pickDone()).toHaveTextContent(/^완료$/u);
  });
});
