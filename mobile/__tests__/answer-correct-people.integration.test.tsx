/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { screen, within } from '@testing-library/react-native';
import { MEAL_ANSWER, MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import { MEAL_ANSWER_ALONE, MEAL_ANSWER_THREE } from '@/api/mock/data/meal-answers';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass } from './support/app';
import { askOnMap, card, mapThings } from './support/answer-map';
import { recalculations } from './support/answer-correct';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { layStage } from './support/lists';
import { givePhone, ON_CAMPUS } from './support/main';
import { pressMarker } from './support/made-quest';
import { press } from './support/markers';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, JI_WOO, MIN_JUN, PHONE_NOW } from './support/server';

// Correcting who eats together (P02 ticket 03, "Taking a Friend out" and "Adding a Friend"), over the stored answer
// to "배고파, 민수랑 같이" and the fake main server's Friends, 김민준, whom the User sees on the map, and 서지우, whom
// the User cannot see. The list says each by the full name with the department (ticket 18) and the distance from their
// position to the picked Restaurant, 302동식당: 김민준's at 37.4598, 126.9521 is 1217.7 metres from it by the spec's
// flat map, "1.2km"; 서지우 has no position, "위치 모름". A person is taken out from their face on the map (P04 ticket
// 03), and the Plan's place and people are read on the map.

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

const ASKER = MEAL_ANSWER.input.people[0];
const ADD = '같이 먹을 친구 추가';
const MIN_JUN_CELL = '김민준, 컴퓨터공학부, 1.2km, 추가';
const JI_WOO_CELL = '서지우, 경영학과, 위치 모름, 추가';
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
        clientCapabilities: ['library', 'answer', 'area', 'meet', 'events', 'plan-set', 'quest-cancel'],
      },
    ]);
    // Who eats changed, so the first Plan of the answer for the User alone is shown, which the User takes alone.
    expect(mapThings()).toContain(ALONE_PICK);
    expect(mapThings()).not.toContain('민수');
    const beside = within(screen.getByTestId('ai-input-beside'));
    expect(beside.getByRole('button', { name: '일정에 넣기' })).toBeVisible();
  });
});

// Partitions: the list opened and closed; a Friend already in the Plan.
describe('adding a Friend', () => {
  it("lists the User's Friends nearest first, the one without a position last, and 그대로 closes the list", async () => {
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);

    await user.press(card().getByRole('button', { name: ADD }));

    const cells = within(card().getByTestId('choice-grid'))
      .getAllByRole('button')
      .map(({ props }): unknown => props.accessibilityLabel);
    // Each cell is followed by the mark at its end that opens the Friend's profile (ticket 18).
    expect(cells).toEqual([MIN_JUN_CELL, '김민준 프로필', JI_WOO_CELL, '서지우 프로필']);
    expect(card().getByRole('button', { name: MIN_JUN_CELL })).toHaveTextContent('김민준컴퓨터공학부1.2km');
    await user.press(card().getByRole('button', { name: '그대로' }));
    expect(card().queryByRole('button', { name: MIN_JUN_CELL })).toBeNull();
  });

  it('leaves out a Friend who is in the Plan', async () => {
    // The stored answer with its second person's user id changed to 김민준's, a Friend of the fake server.
    const input = { ...MEAL_ANSWER.input, people: [ASKER, { userId: MIN_JUN.id, constraints: [] }] };
    const user = await askOnMap(server, { ...MEAL_ANSWER_REPLY, answer: { ...MEAL_ANSWER, input } });

    await user.press(card().getByRole('button', { name: ADD }));

    expect(card().queryByRole('button', { name: MIN_JUN_CELL })).toBeNull();
    expect(card().getByRole('button', { name: JI_WOO_CELL })).toBeVisible();
  });
});

// Partitions: a Friend chosen from the list and from the map; the Avatar of a Friend whom the conditions hold.
describe('adding a Friend chosen', () => {
  it('sends the conditions with the Friend chosen, without constraints, and draws the answer for three', async () => {
    server.on('POST /assistant/answers', { status: 200, body: MEAL_ANSWER_THREE });
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);
    await user.press(card().getByRole('button', { name: ADD }));

    await user.press(card().getByRole('button', { name: JI_WOO_CELL }));
    await pass(500);

    expect(recalculations(server)).toEqual([
      {
        input: { ...MEAL_ANSWER.input, people: [...MEAL_ANSWER.input.people, { userId: JI_WOO.id, constraints: [] }] },
        location: ON_CAMPUS,
        clientCapabilities: ['library', 'answer', 'area', 'meet', 'events', 'plan-set', 'quest-cancel'],
      },
    ]);
    expect(mapThings()).toEqual(expect.arrayContaining([THREE_PICK, '민수 · 18분', '지은 · 5분']));
  });

  it("sends the same for a press on the Friend's Avatar on the map", async () => {
    server.on('POST /assistant/answers', { status: 200, body: MEAL_ANSWER_THREE });
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);

    await press(user, MIN_JUN.name);
    await pass(500);

    expect(recalculations(server)).toEqual([
      {
        input: { ...MEAL_ANSWER.input, people: [...MEAL_ANSWER.input.people, { userId: MIN_JUN.id, constraints: [] }] },
        location: ON_CAMPUS,
        clientCapabilities: ['library', 'answer', 'area', 'meet', 'events', 'plan-set', 'quest-cancel'],
      },
    ]);
    expect(mapThings()).toContain(THREE_PICK);
  });

  it('takes no press on the Avatar of a Friend whom the conditions hold', async () => {
    server.on('POST /assistant/answers', { status: 200, body: MEAL_ANSWER_THREE });
    // The stored answer with its second person's user id changed to 김민준's, whose Avatar the scene does not hide.
    const input = { ...MEAL_ANSWER.input, people: [ASKER, { userId: MIN_JUN.id, constraints: [] }] };
    const user = await askOnMap(server, { ...MEAL_ANSWER_REPLY, answer: { ...MEAL_ANSWER, input } });

    await press(user, MIN_JUN.name);
    await pass(500);

    expect(recalculations(server)).toEqual([]);
    expect(screen.getByTestId('answer-card')).toBeVisible();
  });
});
