/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { QuestMember } from '@/api/types';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { mapLines, mapThings } from './support/answer-map';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { AI_INPUT } from './support/lists';
import {
  answerMadeQuest,
  FLAG,
  MADE,
  madeCard,
  madeLine,
  MINSU,
  OWN_MARKER,
  pressFlag,
  signal,
  signInAsAsker,
} from './support/made-quest';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { DINNER } from './support/markers';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, DINNER as DINNER_QUEST, PHONE_NOW } from './support/server';

// The card after inviting of a Quest made from a Plan, opened again from its flag or its line on the everyday map
// (P02 ticket 07), and the flag and the line following the Quest, against the fake main server. The User leads the
// stored reply's Quest of POST /plans, 302동식당 at 제2공학관 from 12:15, with 민수 invited.

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

// The destination's mark while the card is open: its Place, with the flag's words.
const DESTINATION = `제2공학관 · ${FLAG}`;
const ACCEPTED = '12:15 점심 · 수락 1/1';
const [MEAL] = MADE.subQuests;

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  await signInAsAsker();
  answerMainScreen(server);
  answerMadeQuest(server);
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// Partitions: a press on the flag; a press on the line; "닫기". Expected values: the P02 spec, "After inviting" and
// "How each Friend stands", with the stored Quest's step and 민수 invited.
describe("a made Quest's card, opened again", () => {
  it("shows the card after inviting on a press of the flag, with 민수 waiting and the Quest's step", async () => {
    const user = await openMain({ answerOnMap: true });

    await pressFlag(user, FLAG);

    expect(madeCard().getByText('민수 · 아직 안 봄')).toBeVisible();
    expect(madeCard().getByText('파티를 만들고 초대를 보냈어요')).toBeVisible();
    expect(madeCard().getByText('답이 없어도 12:15에 가면 돼요')).toBeVisible();
    expect(madeCard().getByText('302동식당에서 식사')).toBeVisible();
    expect(madeCard().getByRole('button', { name: '닫기' })).toBeEnabled();
    expect(screen.queryByLabelText(AI_INPUT)).toBeNull();
    expect(screen.queryByRole('tab', { name: '지도' })).toBeNull();
  });

  it("draws the Quest's Place and the User, and nobody's location, in place of the everyday map", async () => {
    const user = await openMain({ answerOnMap: true });

    await pressFlag(user, FLAG);

    expect(mapThings()).toEqual(['나', DESTINATION]);
    expect(mapLines()).toEqual([]);
  });

  it('shows the same card on a press of the line', async () => {
    const user = await openMain({ answerOnMap: true });
    const line = madeLine();
    if (line === null) {
      throw new Error('No line of the made Quest');
    }

    await user.press(line);

    expect(madeCard().getByText('민수 · 아직 안 봄')).toBeVisible();
    expect(mapThings()).toEqual(['나', DESTINATION]);
  });

  it('closes with "닫기" to the everyday map, the flag and the line back', async () => {
    const user = await openMain({ answerOnMap: true });
    await pressFlag(user, FLAG);

    await user.press(madeCard().getByRole('button', { name: '닫기' }));
    await pass(500);

    expect(screen.queryByTestId('made-quest-frame')).toBeNull();
    expect(mapThings()).toEqual(expect.arrayContaining([FLAG, DINNER]));
    expect(madeLine()).toHaveTextContent(FLAG);
  });
});

// Partitions: the signal of 민수's acceptance before the Quests are read again, on the everyday map and in the card
// opened then; the Quests read again without the Quest (left or deleted); the Quests read again with its meal ended;
// the Quest going while its card is open.
describe('the flag and the line follow the Quest', () => {
  it('count 민수 in at once on the signal of his acceptance, before the Quests are read again', async () => {
    const user = await openMain({ answerOnMap: true });
    // The read the signal asks for, held back: the stored Quest with 민수 accepted, as the main server holds it then.
    const accepted = MADE.members?.map((member): QuestMember =>
      member.user.id === MINSU ? { ...member, state: 'accepted' } : member,
    );
    server.on('GET /quests', { status: 200, body: [DINNER_QUEST, { ...MADE, members: accepted }], afterMs: 5000 });

    await signal('invitation-accepted', { questId: MADE.id, userId: MINSU });

    expect(mapThings()).toContain(ACCEPTED);
    expect(madeLine()).toHaveTextContent(ACCEPTED);
    await pressFlag(user, ACCEPTED);
    expect(madeCard().getByText('민수 · 수락')).toBeVisible();
  });

  it('go when the Quests are read again without it, as after it was left or deleted', async () => {
    await openMain({ answerOnMap: true });
    server.on('GET /quests', { status: 200, body: [] });

    await signal('quests-changed');

    expect(mapThings()).not.toContain(FLAG);
    expect(madeLine()).toBeNull();
  });

  it('go when the Quests are read again with its meal ended', async () => {
    await openMain({ answerOnMap: true });
    // Changed for the boundary: the main server says the stored Quest's one step has ended.
    answerMadeQuest(server, { ...MADE, subQuests: MEAL === undefined ? [] : [{ ...MEAL, ended: true }] });

    await signal('quests-changed');

    expect(mapThings()).not.toContain(FLAG);
    expect(mapThings()).not.toContain(OWN_MARKER);
    expect(madeLine()).toBeNull();
  });

  it('close its open card when it goes', async () => {
    const user = await openMain({ answerOnMap: true });
    await pressFlag(user, FLAG);
    server.on('GET /quests', { status: 200, body: [] });

    await signal('quests-changed');

    expect(screen.queryByTestId('made-quest-frame')).toBeNull();
  });
});
