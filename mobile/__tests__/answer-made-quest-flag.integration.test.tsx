/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { act, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { GROUP_ROOM } from '@/api/mock/data/library';
import { MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import { PLAN_QUEST } from '@/api/mock/data/plan-quest';
import { CAREER_GATHERING } from '@/api/mock/data/quests';
import * as projection from '@/map/projection';
import { readKeptAfterChanges } from '@/storage/kept';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen, startApp } from './support/app';
import { askOnMap, card, mapThings } from './support/answer-map';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import {
  answerMadeQuest,
  FLAG,
  KEPT_MADE,
  MADE,
  madeLine,
  OWN_MARKER,
  signal,
  signInAsAsker,
} from './support/made-quest';
import { givePhone, ON_CAMPUS, openMain, placeOf } from './support/main';
import { DINNER } from './support/markers';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, DINNER as DINNER_QUEST, PHONE_NOW } from './support/server';

// The flag of a Quest made from a Plan on the everyday map (P02 ticket 07), against the fake main server. The User's
// Quests hold the dinner, which was not made from a Plan, and the stored reply's Quest of POST /plans, which the User
// leads with 민수 invited.

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

// "이대로 초대" on the answer, the main server then listing the Quest it made among the User's.
async function inviteAndClose(): Promise<void> {
  server.on('POST /plans', { status: 201, body: PLAN_QUEST });
  const user = await askOnMap(server, MEAL_ANSWER_REPLY);
  await user.press(card().getByRole('button', { name: '이대로 초대' }));
  await pass(500);
  await user.press(card().getByRole('button', { name: '닫기' }));
  await pass(500);
}

// Partitions: a Quest made from a Plan on this phone, and one that was not; made now, and after a restart of the app;
// the words its name says and those its look draws. Expected values: the ticket's "12:33 점심 · 수락 1/2" with the
// stored Quest's day and start, its meal, and 민수 invited, and its decision 18: the look draws them in two lines.
describe('the flag of a made Quest', () => {
  it("stands on the everyday map in place of the Quest's own marker, and the dinner keeps its own", async () => {
    await openMain(KEPT_MADE);

    expect(mapThings()).toContain(FLAG);
    expect(mapThings()).not.toContain(OWN_MARKER);
    expect(mapThings()).toContain(DINNER);
  });

  it('draws its start and meal over its day and count, which its name says whole', async () => {
    await openMain(KEPT_MADE);

    const flag = within(within(screen.getByTestId('main-map-touches')).getByRole('button', { name: FLAG }));
    expect(flag.getByText('12:15 점심', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(flag.getByText('11월 17일 (화) · 수락 0/1', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('stands where the answer was after "이대로 초대" and "닫기", the phone keeping the Quest\'s id', async () => {
    await inviteAndClose();

    expect(mapThings()).toContain(FLAG);
    expect(madeLine()).toHaveTextContent(FLAG);
    expect((await readKeptAfterChanges()).madeQuests).toEqual([MADE.id]);
  });

  it('stands again after a restart of the app', async () => {
    await inviteAndClose();

    await screen.unmount();
    await startApp();
    await pass(1000);
    await pass(500);

    expect(mapThings()).toContain(FLAG);
    expect(madeLine()).toHaveTextContent(FLAG);
  });
});

// Partitions: Closed Quests the User leads with someone invited that POST /plans did not make on this phone: a Shared
// Quest of a Global Event, which matching makes, and a library booking's Quest. Neither has a stored reply: each is the
// stored Quest of POST /plans with the one field changed that says what it is.
describe('a Quest the User leads that was not made from a Plan on this phone', () => {
  it('keeps its own marker when it is a Shared Quest of a Global Event', async () => {
    // Changed for the boundary: matching makes a Shared Quest of the Global Event, Closed and led by a matched User.
    answerMadeQuest(server, { ...MADE, globalEvent: CAREER_GATHERING.globalEvent });

    await openMain();

    expect(mapThings()).toContain(OWN_MARKER);
    expect(mapThings()).not.toContain(FLAG);
    expect(madeLine()).toBeNull();
  });

  it("keeps its own marker when it is a library booking's Quest", async () => {
    // Changed for the boundary: a booking with Friends makes the Closed Quest "관정 <space> 예약" its requester leads.
    const booking = { ...MADE, title: `관정 ${GROUP_ROOM.name} 예약` };
    answerMadeQuest(server, booking);

    await openMain();

    expect(mapThings()).toContain(`퀘스트 · ${booking.title}`);
    expect(mapThings()).not.toContain(FLAG);
    expect(madeLine()).toBeNull();
  });
});

// Partitions: the address of the Quest's own card, as a push, a Notification's row, and the leave-by Notification give
// it, for the User who leads the Quest. Expected values: the main screen's card of a Quest, with its
// "길찾기", as before ticket 07, and the camera's one move to it.
describe("the address of a made Quest's own card", () => {
  it('opens the own card with "길찾기", not the card after inviting, in one move of the camera', async () => {
    await openMain(KEPT_MADE);
    const before = placeOf(FLAG);
    const fit = jest.spyOn(projection, 'fit');

    await act(() => {
      router.navigate(`/main?card=party:${MADE.id}`);
    });
    await pass(500);

    expect(screen.getByRole('header', { name: MADE.title })).toBeVisible();
    expect(within(screen.getByTestId('map-card')).getByRole('button', { name: '길찾기' })).toBeEnabled();
    expect(screen.queryByTestId('made-quest-frame')).toBeNull();
    expect(placeOf(FLAG)).not.toEqual(before);
    expect(fit).not.toHaveBeenCalled();
  });
});

// Partitions: the Quests read again without a Quest whose id the phone kept.
describe("the kept id of a made Quest that is gone from the User's Quests", () => {
  it('is dropped when the Quests are read again', async () => {
    await openMain(KEPT_MADE);
    server.on('GET /quests', { status: 200, body: [DINNER_QUEST] });

    await signal('quests-changed');

    expect((await readKeptAfterChanges()).madeQuests).toEqual([]);
  });
});
