/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { screen, within } from '@testing-library/react-native';
import { FRIEND_LOOKUP } from '@/api/mock/data/friend-lookup';
import { WAY_LOOKUP_REPLY } from '@/api/mock/data/way-lookup';
import late from '@/api/mock/data/way-lookups/late.json';
import leave from '@/api/mock/data/way-lookups/leave.json';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass } from './support/app';
import { askOnMap, card, mapThings } from './support/answer-map';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { AI_INPUT } from './support/lists';
import { givePhone, ME, ON_CAMPUS } from './support/main';
import { lookOf, press } from './support/markers';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, MIN_JUN, PHONE_NOW } from './support/server';

// A Lookup in the answer frame (P01 ticket 11) against the fake main server, which replies with the main server's
// real Lookups of boards q3 (late), q2 (on time, with a leave-by notification), and q1, and has the Friend 김민준 on
// the map.

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

// Two replies in one test.
jest.setTimeout(150000);

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

function replyOf(lookup: object): object {
  return { text: '24동까지 걸어서 15분이에요.', mapButtons: [], cards: [], proposal: null, answer: null, lookup };
}

function beside(): ReturnType<typeof within> {
  return within(screen.getByTestId('ai-input-beside'));
}

type User = Awaited<ReturnType<typeof askOnMap>>;

// A way docks with nothing to read (P04 ticket 05), asked after a first way.
async function askAfterWay(lookup: object): Promise<User> {
  const user = await askOnMap(server, WAY_LOOKUP_REPLY);
  server.on('POST /assistant/messages', { status: 200, body: replyOf(lookup) });
  await user.type(screen.getByLabelText(AI_INPUT), '24동 수업 늦나?');
  await user.press(screen.getByRole('button', { name: '보내기' }));
  await pass(500);
  return user;
}

// Partitions: a late way and one on time, docked. Expected values: the copies of boards q3 and q2. A way with nothing
// to read stays docked, with no handle to raise it (board 10, P04 ticket 10); its basis is reached by its flag.
describe('the basis of a way', () => {
  it('docks a way that is late with the lateness on the map, its basis folded', async () => {
    await askAfterWay(late);

    expect(mapThings()).toContain('13:05 도착 · 5분 늦어요');
    expect(card().queryByText('걸어서 15분 · 지금 12:50')).toBeNull();
  });

  it('docks a way on time, whose main button is "길 안내" until the leave-by notification is drawn', async () => {
    await askAfterWay(leave);

    expect(beside().getByRole('button', { name: '길 안내' })).toBeVisible();
    expect(mapThings()).toContain('12:45 나서기');
    expect(card().queryByText('301동 → 24동 걸어서 15분')).toBeNull();
  });
});

// Partitions: a Friend's face selected before asking, and a press on it under the Lookup. Expected values: the looks
// of B's faces under a Plan (P02 ticket 09) without the "+": a Lookup is not recalculated.
describe("a Friend's face under a Lookup", () => {
  it('is drawn unselected with no "+", and a press on it does nothing', async () => {
    const user = await askOnMap(server, WAY_LOOKUP_REPLY, async (opened) => {
      await press(opened, MIN_JUN.name);
      expect(lookOf(MIN_JUN.name)).toMatch(/:selected$/u);
    });
    expect(lookOf(MIN_JUN.name)).toMatch(/^person:/u);
    expect(lookOf(MIN_JUN.name)).not.toMatch(/selected|addable/u);

    await press(user, MIN_JUN.name);
    await pass(500);

    expect(lookOf(MIN_JUN.name)).not.toMatch(/selected|addable/u);
    expect(server.received('POST /assistant/answers')).toEqual([]);
    expect(mapThings()).toContain('문화관(73동) · 걸어서 18분');
  });
});

// The main server's Lookup of 민수 at the Timetable level outside a Class (`friend-lookup.ts`, `byTimetable`), which
// draws nothing: changed from the stored copy at the building level by hand, with the words the server writes.
const TIMETABLE_ONLY = {
  ...FRIEND_LOOKUP,
  lines: [
    [
      { text: '민수', strong: true },
      { text: ' · 공강 · 14:00까지', strong: false },
    ],
  ],
  basis: ['민수는 내게 시간표만 보여요', '민수에게 묻거나 알리지 않아요'],
  scene: { people: [], places: [], routes: [], flags: [] },
};

// Partitions: a Lookup whose scene is empty. Expected values: the everyday map's things, the User's own Avatar among
// them, under the dock that says the line: the Lookup's own, as the model said nothing (P04 ticket 18).
describe('a Lookup that draws nothing', () => {
  it('leaves the everyday map under its dock', async () => {
    await askOnMap(server, { ...replyOf(TIMETABLE_ONLY), text: '' });

    expect(card().getByText('민수 · 공강 · 14:00까지')).toBeVisible();
    expect(beside().getByRole('button', { name: '만나고 싶다' })).toBeVisible();
    expect(screen.getByTestId('answer-pill')).toBeVisible();
    expect(mapThings()).toEqual(expect.arrayContaining([MIN_JUN.name, ME]));
  });
});
