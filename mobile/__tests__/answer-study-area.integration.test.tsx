/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { screen, within } from '@testing-library/react-native';
import { apiClient } from '@/api/client';
import { STUDY_LOOKUP } from '@/api/mock/data/study-lookup';
import { STUDY_BUILDINGS } from '@/api/mock/data/study-spaces';
import type { StudyBuilding } from '@/api/study-types';
import type { Viewport } from '@/features/assistant/study-area';
import { markLibraryLoggedIn } from '@/library/flag';
import { CAMPUS_BOUNDS, centreOf, project } from '@/map';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass } from './support/app';
import { askOnMap, card, mapLines, mapThings } from './support/answer-map';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { FakeLibrary } from './support/kwanjeong/fake-library';
import { answerFromFakeLibrary } from './support/library-session';
import { layStage } from './support/lists';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, MIN_JUN, PHONE_NOW } from './support/server';

// "이 근처" (P02 ticket 23) against the fake main server, which replies with the main server's real Lookup of board
// a9: the visible area each request sends, the area outlined, the faded rooms, the flag to 관정 with the free seats the
// phone reads, and the card's two buttons.

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

const REPLY = {
  text: '보이는 범위에선 공대 신양학술정보관 3층 자유열람실에서 12:52까지 34분 있을 수 있어요.',
  mapButtons: [],
  cards: [],
  proposal: null,
  answer: null,
  lookup: STUDY_LOOKUP,
};
const STAGE = { width: 390, height: 780 };
const SHINYANG = { latitude: 37.4552, longitude: 126.95206 };
const KWANJEONG_ID = STUDY_LOOKUP.scene.flags.find(({ role }) => role === 'away')?.placeId ?? '';
// The 공부공간 layer as the main server serves it, 관정관 under its real Place id, which the flag points to.
function atRealId(building: StudyBuilding): StudyBuilding {
  return building.liveSeats === null ? building : { ...building, place: { ...building.place, id: KWANJEONG_ID } };
}
const LAYER = STUDY_BUILDINGS.map((building) => atRealId(building));
// The free seats of the fake library's recorded seat lists of the seven sectors the layer gives, counted by hand
// (STATUS 1 and USECNT 0): 179 + 470 + 110 + 182 + 164 + 512 + 112.
const FREE_SEATS = 1729;

let server: FakeServer;
let findWalkingRoute = jest.spyOn(apiClient, 'findWalkingRoute');

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  findWalkingRoute = jest.spyOn(apiClient, 'findWalkingRoute');
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  server.on('GET /study-spaces', { status: 200, body: LAYER });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

function beside(): ReturnType<typeof within> {
  return within(screen.getByTestId('ai-input-beside'));
}

function contextOf(index: number): unknown {
  const body = server.received('POST /assistant/messages')[index]?.body;
  return typeof body === 'object' && body !== null && 'context' in body ? body.context : undefined;
}

function isViewport(value: unknown): value is Viewport {
  return (
    typeof value === 'object' &&
    value !== null &&
    ['south', 'west', 'north', 'east'].every((side) => side in value && typeof Reflect.get(value, side) === 'number')
  );
}

function viewportOf(index: number): Viewport | null {
  const context = contextOf(index);
  const viewport: unknown = typeof context === 'object' && context !== null ? Reflect.get(context, 'viewport') : null;
  return isViewport(viewport) ? viewport : null;
}

// Partitions: before the stage is laid out, and after. Expected values: the stage's size in points at the camera's
// zoom, and the campus's middle, where the map opens, inside the area.
describe('the visible area in a request', () => {
  it('is null while the view of the map is not known', async () => {
    await askOnMap(server, REPLY);

    expect(contextOf(0)).toEqual(expect.objectContaining({ viewport: null }));
  });

  it('is the view at rest, as wide and as high as the stage, once the stage is laid out', async () => {
    await askOnMap(server, REPLY, async () => {
      await layStage(STAGE.width, STAGE.height);
      await pass(100);
    });

    const area = viewportOf(0);
    expect(area).not.toBeNull();
    const { south, west, north, east } = area ?? { south: 0, west: 0, north: 0, east: 0 };
    const zoom = Math.log2((STAGE.width * 360) / (256 * (east - west)));
    const top = project({ latitude: north, longitude: west }, zoom);
    const bottom = project({ latitude: south, longitude: east }, zoom);
    expect(bottom.x - top.x).toBeCloseTo(STAGE.width, 6);
    expect(bottom.y - top.y).toBeCloseTo(STAGE.height, 6);
    const middle = centreOf(CAMPUS_BOUNDS);
    expect(middle.latitude).toBeGreaterThan(south);
    expect(middle.latitude).toBeLessThan(north);
    expect(middle.longitude).toBeGreaterThan(west);
    expect(middle.longitude).toBeLessThan(east);
  });
});

// Partitions: the dock, the card it raises, and the map with and without a library session. Expected values: the copy
// of board a9, and the seats the fake library holds.
describe("board a9's answer", () => {
  it('docks with the model\'s words, "관정 보기" as a chip, and "가는 길" beside the input (P04 tickets 05, 18)', async () => {
    await askOnMap(server, REPLY);

    expect(card().getByText(REPLY.text)).toBeVisible();
    expect(card().queryByText('빈 자리 수는 관정만 알 수 있어요')).toBeNull();
    expect(within(screen.getByTestId('dock-row')).getByRole('button', { name: '관정 보기' })).toBeVisible();
    expect(beside().getByRole('button', { name: '가는 길' })).toBeVisible();
    expect(screen.queryByRole('button', { name: '길 안내' })).toBeNull();
  });

  it('raises the chips, the two lines, "관정 보기", under the card’s ✕, at a press on the line', async () => {
    const user = await askOnMap(server, REPLY);

    await user.press(card().getByText(REPLY.text));

    expect(card().getByText('보는 범위에선 공대 신양학술정보관')).toBeVisible();
    for (const chip of ['301동에서', '13:00 수업까지', '보는 범위', '조용한 곳']) {
      expect(card().getByText(chip)).toBeVisible();
    }
    expect(card().getByText('빈 자리 수는 관정만 알 수 있어요')).toBeVisible();
    expect(card().getByRole('button', { name: '관정 보기' })).toBeVisible();
    expect(card().getByRole('button', { name: '답 닫기' })).toBeVisible();
    expect(card().queryByRole('button', { name: '가는 길' })).toBeNull();
    expect(beside().getByRole('button', { name: '가는 길' })).toBeVisible();
  });
});

describe("board a9's map", () => {
  it('outlines the area its request sent, with the pick, the faded rooms, the walk, and "↑ 관정"', async () => {
    await askOnMap(server, REPLY, async () => {
      await layStage(STAGE.width, STAGE.height);
      await pass(100);
    });

    expect(mapLines()).toEqual(['answer:area', 'answer:route:0']);
    expect(mapThings()).toEqual([
      '3층 자유열람실 · 학기 중 24시간 · 걸어서 8분 · 12:52까지 34분',
      '↑ 관정',
      MIN_JUN.name,
      '나',
      '해동학술정보실 · 전기·정보공학부·컴퓨터공학부',
      '화생공 해동학술정보실·학생라운지 · 화학생물공학부',
    ]);
  });

  it('adds the free seats of 관정 the phone read from its own library session to the flag', async () => {
    await markLibraryLoggedIn();
    const library = answerFromFakeLibrary(new FakeLibrary());
    await askOnMap(server, REPLY);
    await pass(500);

    expect(mapThings()).toContain(`↑ 관정 · 빈 자리 ${String(FREE_SEATS)}석`);
    expect(library.requestsTo('getSeatBookingList')).toHaveLength(7);
    const asked = JSON.stringify(server.received('POST /assistant/messages'));
    expect(asked).not.toContain(String(FREE_SEATS));
  });
});

// Partitions: each button, and ✕. Expected values: the pick's position, and the words of row 7 board q13.
describe("board a9's buttons", () => {
  it('"가는 길" starts the route guidance to the pick and returns to the everyday map', async () => {
    const user = await askOnMap(server, REPLY);

    await user.press(beside().getByRole('button', { name: '가는 길' }));
    await pass(500);

    expect(findWalkingRoute).toHaveBeenLastCalledWith(ON_CAMPUS, SHINYANG);
    expect(screen.queryByTestId('answer-caption')).toBeNull();
  });

  it('"관정 보기" sends "관정 지금 자리 있어?" as the next words of the User', async () => {
    const user = await askOnMap(server, REPLY);

    await user.press(card().getByRole('button', { name: '관정 보기' }));
    await pass(500);

    const sent = server.received('POST /assistant/messages');
    expect(sent).toHaveLength(2);
    expect(JSON.stringify(sent[1]?.body)).toContain('"role":"user","text":"관정 지금 자리 있어?"');
  });

  it('✕ returns to the everyday map without the area', async () => {
    const user = await askOnMap(server, REPLY, async () => {
      await layStage(STAGE.width, STAGE.height);
      await pass(100);
    });

    await user.press(screen.getByRole('button', { name: '답 닫기' }));

    expect(screen.queryByTestId('answer-card')).toBeNull();
    expect(mapLines()).not.toContain('answer:area');
    expect(mapThings()).not.toContain('↑ 관정');
  });
});
