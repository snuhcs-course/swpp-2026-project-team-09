/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply } from '@/api/assistant-types';
import { MEAL_ANSWER, MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import { MEAL_ANSWER_THREE } from '@/api/mock/data/meal-answers';
import { PLAN_QUEST } from '@/api/mock/data/plan-quest';
import type * as MarkerImages from '@/map/marker-images';
import { useMarkerImages } from '@/map/marker-images';
import { lookName } from '@/map/marker-looks';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass } from './support/app';
import { askOnMap, card } from './support/answer-map';
import { recalculations } from './support/answer-correct';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { givePhone, ON_CAMPUS } from './support/main';
import { lookOf, press } from './support/markers';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, MIN_JUN, PHONE_NOW } from './support/server';

// The "+" on the face of a Friend who can be added (P02 ticket 09), and a wrong add undone by the ✕ of that person's
// chip, over the stored answer to "배고파, 민수랑 같이" and the fake main server's Friend 김민준, whose face is on the
// map and who is not in its conditions.

jest.mock('expo-location');
jest.mock('@/map/marker-images', () => {
  const actual = jest.requireActual<typeof MarkerImages>('@/map/marker-images');
  return { ...actual, useMarkerImages: jest.fn(actual.useMarkerImages) };
});
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
const ADDABLE = /^person:.+:addable$/u;

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

// Partitions: a Friend not in the conditions; a Friend in them whose face the Plan does not draw; after "이대로 초대".
describe('the + on a face', () => {
  it('is on the face of a Friend whom the conditions do not hold', async () => {
    await askOnMap(server, MEAL_ANSWER_REPLY);

    expect(lookOf(MIN_JUN.name)).toMatch(ADDABLE);
  });

  it('is asked for with the selected look of the same face before any press, so that neither waits for a picture', async () => {
    await askOnMap(server, MEAL_ANSWER_REPLY);

    const plus = String(lookOf(MIN_JUN.name));
    expect(plus).toMatch(ADDABLE);
    const asked = jest.mocked(useMarkerImages).mock.calls.flatMap(([looks]) => looks.map((look) => lookName(look)));
    expect(asked).toContain(plus);
    expect(asked).toContain(plus.replace(/:addable$/u, ':selected'));
  });

  it('is not on the face of a Friend whom the conditions hold', async () => {
    // The stored answer with its second person's user id changed to 김민준's, whose Avatar the scene does not hide.
    const input = { ...MEAL_ANSWER.input, people: [ASKER, { userId: MIN_JUN.id, constraints: [] }] };
    await askOnMap(server, { ...MEAL_ANSWER_REPLY, answer: { ...MEAL_ANSWER, input } });

    expect(lookOf(MIN_JUN.name)).toMatch(/^person:/u);
    expect(lookOf(MIN_JUN.name)).not.toMatch(/addable/u);
  });

  it('is on no face after "이대로 초대"', async () => {
    server.on('POST /plans', { status: 201, body: PLAN_QUEST });
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);

    await user.press(card().getByRole('button', { name: '이대로 초대' }));
    await pass(500);

    expect(card().getByText('파티를 만들고 초대를 보냈어요')).toBeVisible();
    expect(lookOf(MIN_JUN.name)).toMatch(/^person:/u);
    expect(lookOf(MIN_JUN.name)).not.toMatch(/addable/u);
  });
});

// Partitions: a Friend selected on the everyday map before asking, whose card the answer frame hides.
describe('a face selected before asking', () => {
  it('carries the + and is not lit: only the add on its way lights a face', async () => {
    await askOnMap(server, MEAL_ANSWER_REPLY, async (opened) => {
      await press(opened, MIN_JUN.name);
      expect(lookOf(MIN_JUN.name)).toMatch(/:selected$/u);
    });

    expect(lookOf(MIN_JUN.name)).toMatch(ADDABLE);
    expect(lookOf(MIN_JUN.name)).not.toMatch(/selected/u);
  });
});

// The stored answer for three with its third person's user id changed to 김민준's, in the conditions and on the chip
// "지은": the answer to adding him.
function threeWithMinJun(): AnswerReply {
  const [asker, minsu, jieun] = MEAL_ANSWER_THREE.input.people;
  if (asker === undefined || minsu === undefined || jieun === undefined) {
    throw new Error('The stored answer for three has no third person');
  }
  const people = [asker, minsu, { ...jieun, userId: MIN_JUN.id }];
  const chips = MEAL_ANSWER_THREE.chips.map((chip) =>
    chip.userId === jieun.userId ? { ...chip, userId: MIN_JUN.id } : chip,
  );
  return { ...MEAL_ANSWER_THREE, input: { ...MEAL_ANSWER_THREE.input, people }, chips };
}

// Partitions: the ✕ of the person added.
describe('a wrong add', () => {
  it("is undone by that person's ✕, which brings back the Plan without him and the + on his face", async () => {
    const three = threeWithMinJun();
    server.on('POST /assistant/answers', { status: 200, body: three });
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);
    await press(user, MIN_JUN.name);
    await pass(500);
    expect(card().getByText('12:33 학생회관식당')).toBeVisible();
    server.on('POST /assistant/answers', { status: 200, body: MEAL_ANSWER });

    await user.press(card().getByRole('button', { name: '지은 빼기' }));
    await pass(500);

    expect(recalculations(server).at(-1)).toEqual({
      input: { ...three.input, people: three.input.people.slice(0, 2) },
      location: ON_CAMPUS,
    });
    expect(card().getByText('12:15 302동식당')).toBeVisible();
    expect(card().queryByRole('button', { name: '지은 빼기' })).toBeNull();
    expect(lookOf(MIN_JUN.name)).toMatch(ADDABLE);
  });
});
