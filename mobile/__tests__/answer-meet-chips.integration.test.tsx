/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { screen } from '@testing-library/react-native';
import type { ConditionChip } from '@/api/assistant-types';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass } from './support/app';
import { card } from './support/answer-map';
import { recalculations } from './support/answer-correct';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { press } from './support/markers';
import { answerFriendsWithMinSu, friendCard, meetFromCard, MET_MIN_SU, MIN_SU, row } from './support/meet';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, JI_WOO, ME_ID, MIN_JUN, PHONE_NOW } from './support/server';

// The person chips of a meet's answer (P02 ticket 24), over the fake main server: in a meet with 민수 alone, "민수 ✕"
// goes back to 민수's card, since a meet without its Friend has nothing to plan (board a5's chip); a Friend added by
// "＋ 같이" or a face is planned with (P02 ticket 09), and in a meet with two Friends each ✕ recalculates as a meal's.
// The meet is asked from 민수's card, opened from the friend list.

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
const JI_WOO_CELL = '서지우, 경영학과, 자리 모름, 추가';
// "＋ 같이" read aloud on a meet.
const ADD = '같이 만날 친구 추가';

// The stored answer given to a meet with 민수 and 김민준: it holds those conditions, and a person chip for 김민준 after
// 민수's, as the main server writes one for each Friend. Changed for the boundary of a meet with two Friends, which no
// stored answer has.
const MIN_JUN_CHIP: ConditionChip = { kind: 'person', text: '김민준', userId: MIN_JUN.id };
const MET_BOTH = {
  ...MET_MIN_SU,
  input: { ...MET_MIN_SU.input, people: [ASKER, WITH_MIN_SU, WITH_MIN_JUN] },
  chips: [...MET_MIN_SU.chips, MIN_JUN_CHIP],
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
  await press(user, row(MIN_SU));
  await meetFromCard(user);
  return user;
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

    await user.press(card().getByRole('button', { name: '민수 빼기' }));
    await pass(500);

    expect(recalculations(server)).toHaveLength(1);
    expect(screen.queryByTestId('answer-pill')).toBeNull();
    expect(friendCard().getByRole('header', { name: MIN_SU.name })).toBeVisible();
  });

  it('recalculates without an added Friend when two are in the meet', async () => {
    server.on('POST /assistant/answers', { status: 200, body: MET_BOTH });
    const user = await meetMinSu();
    server.on('POST /assistant/answers', { status: 200, body: MET_MIN_SU });

    await user.press(card().getByRole('button', { name: '김민준 빼기' }));
    await pass(500);

    expect(peopleAsked().at(-1)).toEqual({ ...MET_MIN_SU.input, people: [ASKER, WITH_MIN_SU] });
    expect(card().queryByRole('button', { name: '김민준 빼기' })).toBeNull();
    expect(screen.getByTestId('answer-pill')).toBeVisible();
  });

  it('recalculates without 민수, too, when another Friend stays', async () => {
    server.on('POST /assistant/answers', { status: 200, body: MET_BOTH });
    const user = await meetMinSu();

    await user.press(card().getByRole('button', { name: '민수 빼기' }));
    await pass(500);

    expect(peopleAsked().at(-1)).toEqual({ ...MET_MIN_SU.input, people: [ASKER, WITH_MIN_JUN] });
    expect(screen.queryByTestId('map-card')).toBeNull();
  });
});

// Partitions: the words of "＋ 같이" and of the list it opens, a Friend chosen in that list, and a face pressed on the
// map.
describe('a Friend added to a meet', () => {
  it('is asked for in words of a meet, not of a meal', async () => {
    const user = await meetMinSu();

    await user.press(card().getByRole('button', { name: ADD }));

    expect(card().getByText('누구와 같이 만날까요?')).toBeVisible();
    expect(card().queryByText('누구와 같이 먹을까요?')).toBeNull();
  });

  it('is asked last, without constraints, when chosen in the list', async () => {
    const user = await meetMinSu();
    await user.press(card().getByRole('button', { name: ADD }));

    await user.press(card().getByRole('button', { name: JI_WOO_CELL }));
    await pass(500);

    expect(peopleAsked().at(-1)).toEqual({
      ...MET_MIN_SU.input,
      people: [ASKER, WITH_MIN_SU, { userId: JI_WOO.id, constraints: [] }],
    });
  });

  it('is asked the same when their face is pressed on the map', async () => {
    const user = await meetMinSu();

    await press(user, MIN_JUN.name);
    await pass(500);

    expect(peopleAsked().at(-1)).toEqual({ ...MET_MIN_SU.input, people: [ASKER, WITH_MIN_SU, WITH_MIN_JUN] });
  });
});
