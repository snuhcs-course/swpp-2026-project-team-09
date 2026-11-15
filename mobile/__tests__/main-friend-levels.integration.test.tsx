/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import type { Friend, FriendLevel, Position } from '@/api/types';
import type * as MarkerImages from '@/map/marker-images';
import { useMarkerImages } from '@/map/marker-images';
import { lookName } from '@/map/marker-looks';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { askOnMap } from './support/answer-map';
import { JIEUN_ID, MINSU_ID } from './support/answer-marks';
import type { FakeServer } from './support/fake-server';
import { type FakeSocket, sockets } from './support/fake-socket';
import { openLive, socketServer, theSocket } from './support/live';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { lookOf } from './support/markers';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// Board a0 of the design's row 6 on the everyday map, against the fake main server and the fake socket: 김민수, seen
// at the building he is in, 박지은, seen at the exact level, and 최서준, seen through the Timetable only, whom no
// position shows. The green dot is a look of the switch of the answer on the map: with the switch off every face is
// as before.

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

const MINUTE = 60_000;
const MEASURED = PHONE_NOW.toISOString();

function friend(id: string, name: string, department: string, seen: FriendLevel): Friend {
  const visible = seen !== 'timetable';
  return { id, name, department, level: 'exact', seen, sharing: true, visible, askedOff: false, askedPlan: false };
}

const MIN_SU = friend(MINSU_ID, '김민수', '컴퓨터공학부', 'building');
const JI_EUN = friend(JIEUN_ID, '박지은', '국어국문학과', 'exact');
const SEO_JUN = friend('6d1c3f5e-6666-4a5b-8c9d-000000000006', '최서준', '전기정보공학부', 'timetable');

// 민수 at the point of 302동 (the stored answers' Place), as the main server shows a Friend at the building level.
const MIN_SU_AT_302: Position = {
  userId: MIN_SU.id,
  latitude: 37.44887,
  longitude: 126.95265,
  measuredAt: MEASURED,
  level: 'building',
  placeId: 'fba342e9-4edb-560d-9ac4-2a4d2454f9d3',
};
const JI_EUN_MEASURED: Position = {
  userId: JI_EUN.id,
  latitude: 37.4602,
  longitude: 126.9519,
  measuredAt: MEASURED,
  level: 'exact',
};

// A live position without a level.
function live({ userId, latitude, longitude }: Position): Omit<Position, 'level' | 'placeId'> {
  return { userId, latitude: latitude + 0.0001, longitude, measuredAt: new Date(Date.now()).toISOString() };
}

function dotted(name: string): boolean {
  return String(lookOf(name)).split(':').includes('exact');
}

// The main screen with the switch of the answer on the map on, and its connection open.
async function openLiveOnMap(): Promise<FakeSocket> {
  await openMain({ answerOnMap: true });
  await socketServer((socket) => {
    socket.accept();
  });
  return theSocket();
}

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  server.on('GET /friends', { status: 200, body: [MIN_SU, JI_EUN, SEO_JUN] });
  server.on('GET /positions', { status: 200, body: [MIN_SU_AT_302, JI_EUN_MEASURED] });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// Partitions: the switch off and on. Expected values: P02 ticket 20's decision that the dot is a look of the switch
// on, and rule 3 of the package, nothing changes with the switch off.
describe("a Friend's green dot and the switch of the answer on the map", () => {
  it.each([
    ['off', false],
    ['on', true],
  ] as const)('with the switch %s, the Friend at the exact level carries the dot: %s', async (switched, dot) => {
    await (switched === 'on' ? openLiveOnMap() : openLive());

    expect(dotted(JI_EUN.name)).toBe(dot);
    expect(dotted(MIN_SU.name)).toBe(false);
  });
});

// Partitions: a Friend at the exact level, one at the building level, and one at the Timetable only; a fresh
// position, one dimmed after two minutes, and a fresh one after it; a live position without a level; all with the
// switch on. Expected values: P02 ticket 20, boards a0, a4, and a13, and row 6's decision D10.
describe("a Friend's face on the everyday map", () => {
  it('carries the green dot at the exact level, none at the building level, and is not drawn from the Timetable', async () => {
    await openLiveOnMap();

    expect(dotted(JI_EUN.name)).toBe(true);
    expect(dotted(MIN_SU.name)).toBe(false);
    expect(screen.queryByRole('button', { name: SEO_JUN.name })).toBeNull();
  });

  it('loses the dot while dimmed, and has it again with a fresh position', async () => {
    const socket = await openLiveOnMap();

    await pass(2 * MINUTE);
    expect(String(lookOf(JI_EUN.name))).toContain('stale');
    expect(dotted(JI_EUN.name)).toBe(false);

    await socketServer(() => {
      socket.send('position', live(JI_EUN_MEASURED));
    });
    expect(String(lookOf(JI_EUN.name))).not.toContain('stale');
    expect(dotted(JI_EUN.name)).toBe(true);
  });

  it('keeps the level GET /positions gave when a live position comes without one', async () => {
    const socket = await openLiveOnMap();

    await socketServer(() => {
      socket.send('position', live(JI_EUN_MEASURED));
      socket.send('position', live(MIN_SU_AT_302));
    });

    expect(dotted(JI_EUN.name)).toBe(true);
    expect(dotted(MIN_SU.name)).toBe(false);
  });
});

// Partitions: a live position whose level is not the one before, from the exact level to the building level and back;
// the switch on. Expected values: P02 ticket 20's decision 6, the level a live position carries wins.
describe("a Friend's face when a live position carries its level", () => {
  it('loses the dot with the building level, and has it again with the exact level', async () => {
    const socket = await openLiveOnMap();

    // At the building level the main server sends the Place's point and id: 302동's here.
    const { latitude, longitude, placeId } = MIN_SU_AT_302;
    await socketServer(() => {
      socket.send('position', { ...live(JI_EUN_MEASURED), latitude, longitude, level: 'building', placeId });
    });
    expect(dotted(JI_EUN.name)).toBe(false);

    await socketServer(() => {
      socket.send('position', { ...live(JI_EUN_MEASURED), level: 'exact' });
    });
    expect(dotted(JI_EUN.name)).toBe(true);
  });
});

// Partitions: a Friend at the exact level whom the answer on screen does not hold, with the "+". Expected values: P02
// ticket 20, the dot on every look of that face, each asked for before a press needs it.
describe("a Friend's face while an answer is on screen", () => {
  it('keeps the dot beside the "+", and its selected look with the dot is asked for ahead', async () => {
    await askOnMap(server, MEAL_ANSWER_REPLY);

    const face = String(lookOf(JI_EUN.name));
    expect(face).toMatch(/:exact:addable$/u);
    const asked = jest.mocked(useMarkerImages).mock.calls.flatMap(([looks]) => looks.map((look) => lookName(look)));
    expect(asked).toContain(face.replace(/:addable$/u, ':selected'));
  });
});
