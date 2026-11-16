/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { screen, within } from '@testing-library/react-native';
import type { Friend, LatLng, MyParty, Place } from '@/api/types';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass } from './support/app';
import { givePhone, ME, NEAR_LIBRARY, ON_CAMPUS, openMain } from './support/main';
import { press } from './support/markers';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, JI_WOO, LOBBY, ME_ID, MIN_JUN, PHONE_NOW } from './support/server';

// A press on the User's own dot (P02 ticket 19, board a11): the card of what each Friend sees of the User now, over
// the fake main server.

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

const HEAD = '지금 친구에게 보이는 나';

// Board a11's three Friends, the fake main server's own with what the two see of each other changed to the board's:
// 민수 the building, 지은 the exact position, and 서준 the Timetable only. They are sent in the board's order, which
// is not the order of their names.
const MIN_SU: Friend = { ...MIN_JUN, level: 'building', seen: 'building' };
const JI_EUN: Friend = { ...JI_WOO, seen: 'exact' };
const SEO_JUN: Friend = {
  ...JI_WOO,
  id: '6d1c3f5e-5555-4a5b-8c9d-000000000005',
  name: '박서준',
  level: 'timetable',
  seen: 'timetable',
  sharing: false,
};

const ENGINEERING: Place = { id: 'p301', number: '301', name: '제1공학관', latitude: 37.45016, longitude: 126.95259 };

// North of ON_CAMPUS by about 22 m, then by about 44 m: each step under 30 m, the two together over it.
const A_FEW_STEPS: LatLng = { latitude: 37.45925, longitude: ON_CAMPUS.longitude };
const A_FEW_MORE: LatLng = { latitude: 37.45945, longitude: ON_CAMPUS.longitude };

// The User's Party with 김민준, the User's own switch for it on.
const LUNCH: MyParty = {
  id: 'p1',
  title: '점심 같이',
  capacity: 4,
  joinPolicy: 'open',
  quest: null,
  sharing: true,
  members: [
    { id: ME_ID, name: '홍길동', department: '컴퓨터공학부', leader: true, visible: true },
    { id: MIN_JUN.id, name: MIN_JUN.name, department: MIN_JUN.department, leader: false, visible: true },
  ],
};

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  server.on('POST /lobby', { status: 200, body: { ...LOBBY, masterSwitch: true } });
  server.on('GET /friends', { status: 200, body: [MIN_SU, JI_EUN, SEO_JUN] });
  server.on('GET /places/at', { status: 200, body: { place: ENGINEERING, relation: 'inside' } });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

function myCard(): ReturnType<typeof within> {
  return within(screen.getByTestId('map-card'));
}

// What a screen reader says of each row, top to bottom.
function rows(): unknown[] {
  return myCard()
    .queryAllByTestId('seen-row')
    .map((row): unknown => row.props.accessibilityLabel);
}

async function openMyCard(): Promise<void> {
  const user = await openMain();
  await press(user, ME);
}

// Partitions: the dot alone; a Friend's face where the dot is.
describe("the User's own dot", () => {
  it('opens the card of what each Friend sees of the User', async () => {
    await openMyCard();

    expect(myCard().getByRole('header', { name: HEAD })).toBeVisible();
  });

  it("lies under a Friend's face where both are, which keeps its own press", async () => {
    givePhone({ permission: 'granted', position: NEAR_LIBRARY });
    const user = await openMain();
    const drawn = within(screen.getByTestId('main-map-touches'))
      .getAllByRole('button')
      .map((thing): unknown => thing.props.accessibilityLabel);

    await press(user, MIN_JUN.name);

    expect(drawn).toContain(ME);
    expect(drawn.indexOf(ME)).toBeLessThan(drawn.indexOf(MIN_JUN.name));
    expect(myCard().getByRole('header', { name: MIN_JUN.name })).toBeVisible();
    expect(screen.queryByRole('header', { name: HEAD })).toBeNull();
  });
});

// Partitions: each of the three levels (board a11); no Friends.
describe("the card's rows", () => {
  it("are board a11's: each Friend by full name in GET /friends's order, with what the two see", async () => {
    await openMyCard();

    expect(rows()).toEqual(['김민준, 지금 있는 건물', '서지우, 정확한 위치', '박서준, 시간표만']);
  });

  it('are none without Friends, and the card says so', async () => {
    server.on('GET /friends', { status: 200, body: [] });

    await openMyCard();

    expect(rows()).toEqual([]);
    expect(myCard().getByText('아직 친구가 없어요')).toBeVisible();
  });
});

// Partitions: the User's Master Switch off; a Friend in the User's Party, with the User's switch for the Party on and
// off.
describe('the rows of the switches', () => {
  it('read the Timetable only in every row while the User’s Master Switch is off, a Party member too', async () => {
    // What the main server sends while either Master Switch is off: the Timetable for every Friend.
    const timetableOnly: Friend[] = [
      { ...MIN_SU, seen: 'timetable' },
      { ...JI_EUN, seen: 'timetable' },
      { ...SEO_JUN, seen: 'timetable' },
    ];
    server.on('POST /lobby', { status: 200, body: { ...LOBBY, masterSwitch: false } });
    server.on('GET /friends', { status: 200, body: timetableOnly });
    server.on('GET /parties/mine', { status: 200, body: LUNCH });

    await openMyCard();

    expect(rows()).toEqual(['김민준, 시간표만', '서지우, 시간표만', '박서준, 시간표만']);
  });

  it("read the exact position for a Friend in the User's Party, the others as they were", async () => {
    server.on('GET /parties/mine', { status: 200, body: LUNCH });

    await openMyCard();

    expect(rows()).toEqual(['김민준, 정확한 위치 · 파티 중', '서지우, 정확한 위치', '박서준, 시간표만']);
  });

  it("read what the friendship gives while the User's own switch for the Party is off", async () => {
    server.on('GET /parties/mine', { status: 200, body: { ...LUNCH, sharing: false } });

    await openMyCard();

    expect(rows()).toEqual(['김민준, 지금 있는 건물', '서지우, 정확한 위치', '박서준, 시간표만']);
  });
});

// Partitions: GET /parties/mine still on its way, then answered; and failed. The rule: no row says a level before the
// Party is known, since a Friend in it sees more than `seen`.
describe("the rows while the User's Party is not known", () => {
  it('are none until the Party is read, and then say the Party', async () => {
    server.on('GET /parties/mine', { status: 200, body: LUNCH, afterMs: 10_000 });

    await openMyCard();
    expect(myCard().getByRole('header', { name: HEAD })).toBeVisible();
    expect(rows()).toEqual([]);
    await pass(10_000);

    expect(rows()).toEqual(['김민준, 정확한 위치 · 파티 중', '서지우, 정확한 위치', '박서준, 시간표만']);
  });

  it('are none once the Party cannot be read', async () => {
    server.on('GET /parties/mine', { status: 500, body: { statusCode: 500, message: 'Internal Server Error' } });

    await openMyCard();
    // Past the one retry of a failed read.
    await pass(3000);

    expect(myCard().getByRole('header', { name: HEAD })).toBeVisible();
    expect(rows()).toEqual([]);
  });
});

// Partitions: GET /places/at answers a Place the User is inside, one they are near, and none; the User moves less
// than 30 m from where it was asked, and then more (the boundary of decision 10).
describe('the line under the head', () => {
  it.each([['inside'], ['near']])('is the Place the User is %s, by its number', async (relation) => {
    server.on('GET /places/at', { status: 200, body: { place: ENGINEERING, relation } });

    await openMyCard();

    expect(myCard().getByTestId('my-place')).toHaveTextContent('301동');
    const [{ query }] = server.received('GET /places/at');
    expect(query).toEqual({ latitude: String(ON_CAMPUS.latitude), longitude: String(ON_CAMPUS.longitude) });
  });

  it('is left out when the User is in no Place', async () => {
    server.on('GET /places/at', { status: 200, body: { place: null, relation: 'none' } });

    await openMyCard();

    expect(myCard().getByRole('header', { name: HEAD })).toBeVisible();
    expect(myCard().queryByTestId('my-place')).toBeNull();
  });

  it('is asked again only once the User is more than 30 m from where it was asked', async () => {
    const phone = givePhone({ permission: 'granted', position: ON_CAMPUS });
    await openMyCard();

    await phone.moveTo(A_FEW_STEPS);
    await pass(500);
    const afterSteps = server.received('GET /places/at').length;
    await phone.moveTo(A_FEW_MORE);
    await pass(500);

    expect(afterSteps).toBe(1);
    expect(server.received('GET /places/at').map(({ query }) => query)).toEqual([
      { latitude: String(ON_CAMPUS.latitude), longitude: String(ON_CAMPUS.longitude) },
      { latitude: String(A_FEW_MORE.latitude), longitude: String(A_FEW_MORE.longitude) },
    ]);
    expect(myCard().getByTestId('my-place')).toHaveTextContent('301동');
  });
});
