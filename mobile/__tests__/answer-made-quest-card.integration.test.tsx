/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import * as projection from '@/map/projection';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { mapLines, mapThings } from './support/answer-map';
import { holdBackButton } from './support/back';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { AI_INPUT } from './support/lists';
import {
  answerMadeQuest,
  FLAG,
  KEPT_MADE,
  MADE,
  MADE_ACCEPTED,
  madeCard,
  madeLine,
  OWN_MARKER,
  pressMarker,
  signal,
  signInAsAsker,
} from './support/made-quest';
import { givePhone, NEAR_LIBRARY, ON_CAMPUS, openMain, placeOf } from './support/main';
import { DINNER } from './support/markers';
import { startFresh } from './support/mocks';
import { MINSU } from './support/plan-invitation';
import { answerMainScreen, askMainServer, DINNER as DINNER_QUEST, PHONE_NOW } from './support/server';

// The card after inviting of a Quest made from a Plan, opened again from its flag or its line on the everyday map
// (P02 ticket 07), and the flag and the line following the Quest, against the fake main server. The User leads the
// stored reply's Quest of POST /plans, made from a Plan on this phone: 302동식당 at 제2공학관 from 12:15, with 민수
// invited.

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

// The destination's mark while the card is open: its Place, with its day, start, and meal.
const DESTINATION = '제2공학관 · 11월 17일 (화) 12:15 점심';
const ACCEPTED = '11월 17일 (화) 12:15 점심 · 수락 1/1';
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
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// Partitions: a press on the flag; a press on the line. Expected values: the P02 spec, "After inviting" and "How each
// Friend stands", with the stored Quest's step and 민수 invited.
describe("a made Quest's card, opened again", () => {
  beforeEach(() => {
    givePhone({ permission: 'granted', position: ON_CAMPUS });
  });

  it("shows the card after inviting on a press of the flag, with 민수 waiting and the Quest's step", async () => {
    const user = await openMain(KEPT_MADE);

    await pressMarker(user, FLAG);

    expect(madeCard().getByText('민수 · 아직 안 봄')).toBeVisible();
    expect(madeCard().getByText('민수에게 점심 초대를 보냈어요')).toBeVisible();
    expect(madeCard().getByText('11/17(화) 12:15 302동식당 · 수락하면 알려 드려요')).toBeVisible();
    expect(madeCard().getByText('302동식당에서 식사')).toBeVisible();
    expect(madeCard().getByRole('button', { name: '답 닫기' })).toBeEnabled();
    expect(screen.queryByLabelText(AI_INPUT)).toBeNull();
    expect(screen.queryByRole('tab', { name: '지도' })).toBeNull();
  });

  it('shows the same card on a press of the line', async () => {
    const user = await openMain(KEPT_MADE);
    const line = madeLine();
    if (line === null) {
      throw new Error('No line of the made Quest');
    }

    await user.press(line);

    expect(madeCard().getByText('민수 · 아직 안 봄')).toBeVisible();
    expect(mapThings()).toEqual(['나', DESTINATION]);
  });
});

// Partitions: ✕; Android's back button.
describe("a made Quest's card, closed", () => {
  beforeEach(() => {
    givePhone({ permission: 'granted', position: ON_CAMPUS });
  });

  it('closes with ✕ to the everyday map, the flag and the line back', async () => {
    const user = await openMain(KEPT_MADE);
    await pressMarker(user, FLAG);

    await user.press(madeCard().getByRole('button', { name: '답 닫기' }));
    await pass(500);

    expect(screen.queryByTestId('made-quest-frame')).toBeNull();
    expect(mapThings()).toEqual(expect.arrayContaining([FLAG, DINNER]));
    expect(madeLine()).toHaveTextContent(FLAG);
  });

  it("closes with Android's back button as with ✕", async () => {
    const back = holdBackButton();
    const user = await openMain(KEPT_MADE);
    await pressMarker(user, FLAG);

    await expect(back()).resolves.toBe(true);

    expect(screen.queryByTestId('made-quest-frame')).toBeNull();
    expect(mapThings()).toEqual(expect.arrayContaining([FLAG, DINNER]));
  });
});

// Partitions: the phone's position known when the card opens; not yet known, then measured, then moved; a signal and a
// read of the Quests while the card is open.
describe("the map under a made Quest's card", () => {
  it("draws the Quest's Place and the User, and nobody's location, in place of the everyday map", async () => {
    givePhone({ permission: 'granted', position: ON_CAMPUS });
    const user = await openMain(KEPT_MADE);

    await pressMarker(user, FLAG);

    expect(mapThings()).toEqual(['나', DESTINATION]);
    expect(mapLines()).toEqual([]);
  });

  it('draws the User where the phone is first measured after a cold start, and keeps the User there', async () => {
    const phone = givePhone({ permission: 'granted' });
    const user = await openMain(KEPT_MADE);
    await pressMarker(user, FLAG);
    expect(mapThings()).toEqual([DESTINATION]);

    await phone.moveTo(ON_CAMPUS);
    expect(mapThings()).toEqual(['나', DESTINATION]);
    const first = placeOf('나');

    await phone.moveTo(NEAR_LIBRARY);
    expect(placeOf('나')).toEqual(first);
  });

  it("moves no camera on a signal and a read of the Quests, and changes 민수's chip", async () => {
    givePhone({ permission: 'granted', position: ON_CAMPUS });
    const user = await openMain(KEPT_MADE);
    const fit = jest.spyOn(projection, 'fit');
    await pressMarker(user, FLAG);
    const fits = fit.mock.calls.length;
    answerMadeQuest(server, MADE_ACCEPTED);

    await signal('invitation-accepted', { questId: MADE.id, userId: MINSU });

    expect(madeCard().getByText('민수 · 수락')).toBeVisible();
    expect(server.received('GET /quests').length).toBeGreaterThan(1);
    expect(fit).toHaveBeenCalledTimes(fits);
  });
});

// Partitions: the signal of 민수's acceptance before the Quests are read again, on the everyday map and in the card
// opened then; the Quests read again without the Quest (left or deleted); the Quests read again with its meal ended;
// the Quest going while its card is open.
describe('the flag and the line follow the Quest', () => {
  beforeEach(() => {
    givePhone({ permission: 'granted', position: ON_CAMPUS });
  });

  it('count 민수 in at once on the signal of his acceptance, before the Quests are read again', async () => {
    const user = await openMain(KEPT_MADE);
    // The read the signal asks for, held back.
    server.on('GET /quests', { status: 200, body: [DINNER_QUEST, MADE_ACCEPTED], afterMs: 5000 });

    await signal('invitation-accepted', { questId: MADE.id, userId: MINSU });

    expect(mapThings()).toContain(ACCEPTED);
    expect(madeLine()).toHaveTextContent(ACCEPTED);
    await pressMarker(user, ACCEPTED);
    expect(madeCard().getByText('민수 · 수락')).toBeVisible();
  });

  it('go when the Quests are read again without it, as after it was left or deleted', async () => {
    await openMain(KEPT_MADE);
    server.on('GET /quests', { status: 200, body: [DINNER_QUEST] });

    await signal('quests-changed');

    expect(mapThings()).not.toContain(FLAG);
    expect(madeLine()).toBeNull();
  });

  it('go when the Quests are read again with its meal ended', async () => {
    await openMain(KEPT_MADE);
    // Changed for the boundary: the main server says the stored Quest's one step has ended.
    answerMadeQuest(server, { ...MADE, subQuests: MEAL === undefined ? [] : [{ ...MEAL, ended: true }] });

    await signal('quests-changed');

    expect(mapThings()).not.toContain(FLAG);
    expect(mapThings()).not.toContain(OWN_MARKER);
    expect(madeLine()).toBeNull();
  });

  it('close its open card when it goes', async () => {
    const user = await openMain(KEPT_MADE);
    await pressMarker(user, FLAG);
    server.on('GET /quests', { status: 200, body: [] });

    await signal('quests-changed');

    expect(screen.queryByTestId('made-quest-frame')).toBeNull();
  });
});
