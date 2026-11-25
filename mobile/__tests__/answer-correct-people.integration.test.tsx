/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { screen, within } from '@testing-library/react-native';
import type { AssistantReply } from '@/api/assistant-types';
import { MEAL_ANSWER, MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import { MEAL_ANSWER_ALONE, MEAL_ANSWER_THREE } from '@/api/mock/data/meal-answers';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass } from './support/app';
import { askOnMap, mapThings, timeBar } from './support/answer-map';
import { recalculations } from './support/answer-correct';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { layStage } from './support/lists';
import { givePhone, ON_CAMPUS } from './support/main';
import { pressMarker } from './support/made-quest';
import { press } from './support/markers';
import { startFresh } from './support/mocks';
import { checkedRows, pickDone, pickRow, pickRows } from './support/picking';
import { answerMainScreen, askMainServer, JI_WOO, MIN_JUN, PHONE_NOW } from './support/server';
import { SENT_CAPABILITIES } from './support/capabilities';

// Correcting who eats together (P02 ticket 03; P04 ticket 64, people picked in the time card), over the stored answer
// to "배고파, 민수랑 같이" and the fake main server's Friends, 김민준, whom the User sees on the map, and 서지우, whom
// the User cannot see. The stored band carries no other Friends' lanes, as from a main server before ticket 64, so a
// Friend's row says the phone's guess of their walk to the picked Restaurant, 302동식당: 김민준's position at 37.4598,
// 126.9521 is 1217.7 metres from it, "걸음 16분" at 80 metres a minute; 서지우 has no position, "위치 모름". 민수, in the
// Plan, walks 0 minutes to it. A person is taken out from their face on the map (P04 ticket 03), and the Plan's place
// and people are read on the map.

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

const [ASKER, MIN_SU] = MEAL_ANSWER.input.people;
const ADD = '같이 먹을 친구 추가';
const MIN_SU_ROW = '민수 · 걸음 0분';
const MIN_JUN_ROW = '김민준 · 걸음 16분';
const JI_WOO_ROW = '서지우 · 위치 모름';
// The pick's flag of the first Plan of the stored answers for the User alone and for three.
const ALONE_PICK = '301동식당 · 11:50 점심';
const THREE_PICK = '학생회관식당 · 12:33 점심';

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

// The body of a recalculation with `people` after the asker.
function askedWith(...people: string[]): object {
  return {
    input: { ...MEAL_ANSWER.input, people: [ASKER, ...people.map((userId) => ({ userId, constraints: [] }))] },
    location: ON_CAMPUS,
    clientCapabilities: SENT_CAPABILITIES,
  };
}

function swapped<T extends { userId: string; name: string }>(person: T): T {
  return person.userId === MIN_SU?.userId ? { ...person, userId: MIN_JUN.id, name: MIN_JUN.name } : person;
}

// The stored reply with 민수 changed to 김민준, a Friend of the fake server, in the conditions, in each Plan's people,
// and in its band's lanes, but not in its faces, so that the scene does not hide his Avatar.
function replyWithMinJun(): AssistantReply {
  const plans = MEAL_ANSWER.plans.map((plan) => ({
    ...plan,
    parts: plan.parts.map(swapped),
    band: { ...plan.band, lanes: plan.band.lanes.map(swapped) },
  }));
  const input = { ...MEAL_ANSWER.input, people: [ASKER, { userId: MIN_JUN.id, constraints: [] }] };
  return { ...MEAL_ANSWER_REPLY, answer: { ...MEAL_ANSWER, input, plans } };
}

// Partitions: 빼기 on a person's face.
describe('taking a Friend out', () => {
  it('sends the conditions without 민수 and draws the answer that comes back', async () => {
    server.on('POST /assistant/answers', { status: 200, body: MEAL_ANSWER_ALONE });
    const user = await askOnMap(server, MEAL_ANSWER_REPLY, () => layStage(390, 760));

    await pressMarker(user, '민수');
    await user.press(within(screen.getByTestId('mark-card')).getByRole('button', { name: '민수 빼기' }));
    await pass(500);

    expect(recalculations(server)).toEqual([
      {
        input: { ...MEAL_ANSWER.input, people: [ASKER] },
        location: ON_CAMPUS,
        clientCapabilities: SENT_CAPABILITIES,
      },
    ]);
    // Who eats changed, so the first Plan of the answer for the User alone is shown, which the User takes alone.
    expect(mapThings()).toContain(ALONE_PICK);
    expect(mapThings()).not.toContain('민수');
    const beside = within(screen.getByTestId('ai-input-beside'));
    expect(beside.getByRole('button', { name: '일정에 넣기' })).toBeVisible();
  });
});

// Partitions: picking opened from "＋ 같이"; rows checked after it opened; opened from the face of a Friend already in
// the Plan.
describe('picking Friends in the time card', () => {
  it("has the Plan's 민수 checked first, then the nearest Friend, the one without a position last, and no bars", async () => {
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);

    await user.press(timeBar().getByRole('button', { name: ADD }));

    expect(within(screen.getByTestId('time-card-rows')).queryAllByText(/^나$/u)).toHaveLength(0);
    expect(within(screen.getByTestId('time-card-rows')).queryAllByTestId('time-card-busy')).toHaveLength(0);
    expect(pickRows()).toEqual([MIN_SU_ROW, MIN_JUN_ROW, JI_WOO_ROW]);
    expect(checkedRows()).toEqual([MIN_SU_ROW]);
    expect(pickDone()).toHaveTextContent('완료 · 1명');
    expect(recalculations(server)).toEqual([]);
  });

  it('keeps every row where it stood when picking opened, however the rows are checked', async () => {
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);
    await user.press(timeBar().getByRole('button', { name: ADD }));

    await user.press(pickRow(JI_WOO.name));
    await user.press(pickRow('민수'));

    expect(pickRows()).toEqual([MIN_SU_ROW, MIN_JUN_ROW, JI_WOO_ROW]);
    expect(checkedRows()).toEqual([JI_WOO_ROW]);
  });

  it('lists a Friend in the Plan once, checked, by the Plan’s walk, when their Avatar opens picking', async () => {
    const user = await askOnMap(server, replyWithMinJun());

    await press(user, MIN_JUN.name);

    expect(pickRows()).toEqual([`${MIN_JUN.name} · 걸음 0분`, JI_WOO_ROW]);
    expect(checkedRows()).toEqual([`${MIN_JUN.name} · 걸음 0분`]);
    expect(recalculations(server)).toEqual([]);
  });
});

// Partitions: two Friends checked from the rows; one from a face on the map.
describe('완료 with Friends checked', () => {
  it('asks once with every Friend checked, in the order checked, and draws the answer for three', async () => {
    server.on('POST /assistant/answers', { status: 200, body: MEAL_ANSWER_THREE });
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);
    await user.press(timeBar().getByRole('button', { name: ADD }));

    await user.press(pickRow(JI_WOO.name));
    await user.press(pickRow(MIN_JUN.name));
    expect(recalculations(server)).toEqual([]);
    expect(pickDone()).toHaveTextContent('완료 · 3명');
    await user.press(pickDone());
    await pass(500);

    expect(recalculations(server)).toEqual([askedWith(MIN_SU?.userId ?? '', JI_WOO.id, MIN_JUN.id)]);
    expect(mapThings()).toEqual(expect.arrayContaining([THREE_PICK, '민수 · 18분', '지은 · 5분']));
  });

  it("asks the same for a Friend's Avatar pressed on the map", async () => {
    server.on('POST /assistant/answers', { status: 200, body: MEAL_ANSWER_THREE });
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);

    await press(user, MIN_JUN.name);
    expect(checkedRows()).toEqual([MIN_SU_ROW, MIN_JUN_ROW]);
    await user.press(pickDone());
    await pass(500);

    expect(recalculations(server)).toEqual([askedWith(MIN_SU?.userId ?? '', MIN_JUN.id)]);
    expect(mapThings()).toContain(THREE_PICK);
  });
});

// Partitions: 민수 unchecked; the checks back to the Plan's people.
describe('완료 without a Friend added', () => {
  it('asks without 민수 when 민수 is unchecked', async () => {
    server.on('POST /assistant/answers', { status: 200, body: MEAL_ANSWER_ALONE });
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);
    await user.press(timeBar().getByRole('button', { name: ADD }));

    await user.press(pickRow('민수'));
    expect(pickDone()).toHaveTextContent(/^완료$/u);
    await user.press(pickDone());
    await pass(500);

    expect(recalculations(server)).toEqual([askedWith()]);
    expect(mapThings()).toContain(ALONE_PICK);
  });

  it('asks nothing when the checks are the Plan’s people again, and ends picking', async () => {
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);
    await user.press(timeBar().getByRole('button', { name: ADD }));

    await user.press(pickRow(MIN_JUN.name));
    await user.press(pickRow(MIN_JUN.name));
    await user.press(pickDone());
    await pass(500);

    expect(recalculations(server)).toEqual([]);
    expect(screen.queryByTestId('time-card-pick-done')).toBeNull();
    expect(timeBar().getByRole('button', { name: ADD })).toHaveTextContent('같이 1 ›');
  });
});
