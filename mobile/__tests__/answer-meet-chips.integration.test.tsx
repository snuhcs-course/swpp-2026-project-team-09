/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { screen, within } from '@testing-library/react-native';
import type { ConditionChip, Plan } from '@/api/assistant-types';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass } from './support/app';
import { mapThings, timeBar } from './support/answer-map';
import { recalculations } from './support/answer-correct';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { layStage } from './support/lists';
import { pressMarker } from './support/made-quest';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { press } from './support/markers';
import { answerFriendsWithMinSu, friendCard, meetFromCard, MET_MIN_SU, MIN_SU, row } from './support/meet';
import { startFresh } from './support/mocks';
import { checkedRows, pickDone, pickRow } from './support/picking';
import { answerMainScreen, askMainServer, JI_WOO, ME_ID, MIN_JUN, PHONE_NOW } from './support/server';

// The people of a meet's answer (P02 ticket 24), over the fake main server: in a meet with 민수 alone, "민수 ✕" goes
// back to 민수's card, since a meet without its Friend has nothing to plan (board a5's chip), and so does 민수
// unchecked at 완료; a Friend picked in the time card or by a face is planned with (P04 ticket 64), and in a meet with
// two Friends each ✕ recalculates as a meal's. The meet is asked from 민수's card, opened from the friend list. A
// person's ✕ is "빼기" in the card of their face on the map (P04 ticket 03).

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

const ASKER = { userId: ME_ID, constraints: [] };
const WITH_MIN_SU = { userId: MIN_SU.id, constraints: [] };
const WITH_MIN_JUN = { userId: MIN_JUN.id, constraints: [] };
// 민수's row in the time card, by the band's name for 민수 and the Plan's walk.
const MIN_SU_ROW = '민수 · 걸음 0분';
// "＋ 같이" read aloud on a meet.
const ADD = '같이 만날 친구 추가';

// The stored answer given to a meet with 민수 and 김민준: it holds those conditions, and a person chip for 김민준 after
// 민수's, as the main server writes one for each Friend. Changed for the boundary of a meet with two Friends, which no
// stored answer has.
// Its Plans draw 김민준's face as "민준", at 민수's place, so that it is not taken for his everyday Avatar.
const MIN_JUN_CHIP: ConditionChip = { kind: 'person', text: '김민준', userId: MIN_JUN.id };
function withMinJun(plan: Plan): Plan {
  const [, minSu] = plan.parts;
  const [, face] = plan.scene.people;
  if (minSu === undefined || face === undefined) {
    return plan;
  }
  return {
    ...plan,
    parts: [...plan.parts, { ...minSu, userId: MIN_JUN.id, name: '민준' }],
    scene: {
      ...plan.scene,
      people: [...plan.scene.people, { ...face, userId: MIN_JUN.id, name: '민준', tag: '민준' }],
    },
  };
}
const MET_BOTH = {
  ...MET_MIN_SU,
  input: { ...MET_MIN_SU.input, people: [ASKER, WITH_MIN_SU, WITH_MIN_JUN] },
  chips: [...MET_MIN_SU.chips, MIN_JUN_CHIP],
  plans: MET_MIN_SU.plans.map(withMinJun),
};

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  answerFriendsWithMinSu(server);
  server.on('POST /assistant/answers', { status: 200, body: MET_MIN_SU });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

type User = Awaited<ReturnType<typeof openMain>>;

async function meetMinSu(): Promise<User> {
  const user = await openMain();
  await layStage(390, 760);
  await press(user, row(MIN_SU));
  await meetFromCard(user);
  return user;
}

// A press on a face of the Plan's people, then 빼기 in its card.
async function takeOut(user: User, face: string, name: string): Promise<void> {
  await pressMarker(user, face);
  await user.press(within(screen.getByTestId('mark-card')).getByRole('button', { name: `${name} 빼기` }));
  await pass(500);
}

function peopleAsked(): unknown[] {
  return recalculations(server).map((body) =>
    typeof body === 'object' && body !== null && 'input' in body ? body.input : null,
  );
}

// Partitions: the ✕ of the only Friend, and of each of two Friends.
describe("a Friend's ✕ in a meet", () => {
  it("closes the answer and brings back 민수's card when 민수 is the only Friend, asking nothing", async () => {
    const user = await meetMinSu();

    await takeOut(user, '민수', '민수');

    expect(recalculations(server)).toHaveLength(1);
    expect(screen.queryByTestId('answer-caption')).toBeNull();
    expect(friendCard().getByRole('header', { name: MIN_SU.name })).toBeVisible();
  });

  it('recalculates without an added Friend when two are in the meet', async () => {
    server.on('POST /assistant/answers', { status: 200, body: MET_BOTH });
    const user = await meetMinSu();
    server.on('POST /assistant/answers', { status: 200, body: MET_MIN_SU });

    await takeOut(user, '민준', '민준');

    expect(peopleAsked().at(-1)).toEqual({ ...MET_MIN_SU.input, people: [ASKER, WITH_MIN_SU] });
    expect(mapThings()).not.toContain('민준');
    expect(screen.getByTestId('answer-caption')).toBeVisible();
  });

  it('recalculates without 민수, too, when another Friend stays', async () => {
    server.on('POST /assistant/answers', { status: 200, body: MET_BOTH });
    const user = await meetMinSu();

    await takeOut(user, '민수', '민수');

    expect(peopleAsked().at(-1)).toEqual({ ...MET_MIN_SU.input, people: [ASKER, WITH_MIN_JUN] });
    expect(screen.queryByTestId('map-card')).toBeNull();
  });
});

// Partitions: picking opened by the meet's "＋ 같이"; a Friend checked in its rows; a face pressed on the map; the only
// Friend, 민수, unchecked at 완료.
describe('Friends picked in a meet', () => {
  it('opens picking from "＋ 같이" read in words of a meet, with 민수 checked', async () => {
    const user = await meetMinSu();

    await user.press(timeBar().getByRole('button', { name: ADD }));

    expect(checkedRows()).toEqual([MIN_SU_ROW]);
    expect(pickDone()).toHaveTextContent('완료 · 1명');
    expect(timeBar().queryByRole('button', { name: '같이 먹을 친구 추가' })).toBeNull();
  });

  it('asks a Friend checked in the rows last, without constraints, once, at 완료', async () => {
    const user = await meetMinSu();
    await user.press(timeBar().getByRole('button', { name: ADD }));

    await user.press(pickRow(JI_WOO.name));
    await user.press(pickDone());
    await pass(500);

    expect(peopleAsked()).toHaveLength(2);
    expect(peopleAsked().at(-1)).toEqual({
      ...MET_MIN_SU.input,
      people: [ASKER, WITH_MIN_SU, { userId: JI_WOO.id, constraints: [] }],
    });
  });

  it('asks the same for a Friend whose face is pressed on the map', async () => {
    const user = await meetMinSu();

    await press(user, MIN_JUN.name);
    await user.press(pickDone());
    await pass(500);

    expect(peopleAsked().at(-1)).toEqual({ ...MET_MIN_SU.input, people: [ASKER, WITH_MIN_SU, WITH_MIN_JUN] });
  });

  it("closes the answer and brings back 민수's card when 민수, the only Friend, is unchecked, asking nothing", async () => {
    const user = await meetMinSu();
    await user.press(timeBar().getByRole('button', { name: ADD }));

    await user.press(pickRow('민수'));
    expect(pickDone()).toHaveTextContent(/^완료$/u);
    await user.press(pickDone());
    await pass(500);

    expect(recalculations(server)).toHaveLength(1);
    expect(screen.queryByTestId('answer-caption')).toBeNull();
    expect(friendCard().getByRole('header', { name: MIN_SU.name })).toBeVisible();
  });
});
