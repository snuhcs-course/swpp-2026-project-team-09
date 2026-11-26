/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { act, renderHook } from '@testing-library/react-native';
import type { AnswerReply } from '@/api/assistant-types';
import { MEAL_ANSWER_MENUS } from '@/api/mock/data/meal-answer-menus';
import type { LatLng } from '@/api/types';
import type { AnswerLabel, AnswerSymbol } from '@/design-system';
import { NO_STANDINGS } from '@/features/assistant/invited-friends';
import type { ShownAnswer } from '@/features/assistant/use-shown-answer';
import { inView, type MapCamera, type MarkerImage, type MarkerLook } from '@/map';
import type * as MarkerImages from '@/map/marker-images';
import type { Room } from '@/screens/main/layout';
import { type AnswerMap, labelArea, useAnswerMap } from '@/screens/main/use-answer-map';
import { cameraPutting, placeMoved, SIZE, withScene } from './support/answer-view';
import { type Asked, mapOf } from './support/main-map-stand-in';
import { NO_ANSWER } from './support/no-answer';

// The pictures the map is given: unmade as in every test without the native module, or, with `mockNative.on`, made
// for the looks in `mockMade` alone, as the native module's stage makes them; the looks in `mockFailed` used up their
// tries. `mockAsked` holds every look asked for.
const mockNative = { on: false };
const mockMade = new Set<string>();
const mockFailed = new Set<string>();
const mockAsked = new Set<string>();
jest.mock('@/map/native-module', () => ({
  ...jest.requireActual<object>('@/map/native-module'),
  hasNativeMap: (): boolean => mockNative.on,
}));
jest.mock('@/map/marker-images', () => {
  const actual = jest.requireActual<typeof MarkerImages>('@/map/marker-images');
  const { lookName: nameOf } = jest.requireActual<{ lookName: (look: MarkerLook) => string }>('@/map/marker-looks');
  return {
    ...actual,
    useMarkerImages: (looks: readonly MarkerLook[]): MarkerImage[] =>
      looks.map((look) => {
        mockAsked.add(nameOf(look));
        const image = actual.unmadeImage(look);
        return mockNative.on && mockMade.has(nameOf(look)) ? { ...image, uri: `file:///${image.look}.png` } : image;
      }),
    useLooksSettled: (looks: readonly MarkerLook[]): boolean =>
      !mockNative.on || looks.every((look) => mockMade.has(nameOf(look)) || mockFailed.has(nameOf(look))),
  };
});
// The walking route service is no part of these hooks' units: an answer's walks keep their straight lines.
jest.mock('@/screens/main/use-answer-walks', () => {
  const none = new Map();
  const ways = { paths: none, legs: [] };
  return {
    useAnswerWalks: (lines: readonly unknown[]): readonly unknown[] => lines,
    useWalkPaths: (): ReadonlyMap<string, unknown> => none,
    useMealWays: (): object => ways,
  };
});
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: (): object => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

// The case from the phone (P04 ticket 69), on the stored meal answer with menus: its pick 302동식당 (1) at the south,
// 학생회관식당 (3) midway, and 301동식당 (2), 3식당 (4), and 자하연식당 2층 (5) moved about 2.2 km north, further than
// the answer's outermost zoom holds with the pick. The camera keeps the pick's side, and 2, 4, and 5 stand behind the
// time card at the top. 3식당 and 자하연식당 2층 are neighbours, 80 metres apart.
const MOVED: readonly [string, LatLng][] = [
  ['301동식당', { latitude: 37.469, longitude: 126.948 }],
  ['학생회관식당', { latitude: 37.456, longitude: 126.95 }],
  ['3식당', { latitude: 37.4685, longitude: 126.954 }],
  ['자하연식당 2층', { latitude: 37.469, longitude: 126.9547 }],
];
const SPREAD: AnswerReply = MOVED.reduce(
  (answer, [label, at]) => withScene(answer, 0, placeMoved(label, at)),
  MEAL_ANSWER_MENUS as AnswerReply,
);
const SHOWN: ShownAnswer = { ...NO_ANSWER, source: SPREAD, answer: SPREAD, plan: SPREAD.plans[0] ?? null, index: 0 };

// The emulator's view of 411 by 914 under the time card of 112, over a card of 274.
const ROOM: Room = {
  stage: SIZE,
  cardHeight: null,
  answerHeight: 274,
  tutorialStart: false,
  interestsHint: false,
  timeBarHeight: 112,
};
const FIT_ZOOM = 15.26;
// The labels' area of a meal answer: under the time card, and over the card and the map's credit of 24.
const WHOLE = labelArea(0, ROOM.answerHeight, SIZE, true, ROOM.timeBarHeight);
const AREA = { ...WHOLE, bottom: WHOLE.bottom - 24 };

const NOT_INVITED = { sending: false, made: null, standings: NO_STANDINGS, changed: null, changing: false, left: null };

const CANDIDATES = ['301동식당', '학생회관식당', '3식당', '자하연식당 2층'] as const;

interface Seen {
  label: AnswerLabel | null;
  symbol: AnswerSymbol | null;
}

function markOf(drawn: AnswerMap | null, label: string): Seen {
  const look = drawn?.contents.markers.find(({ id }) => id === `answer:candidate:${label}`)?.image.view;
  if (look?.kind !== 'answer') {
    throw new Error(`No mark of ${label}`);
  }
  return { label: look.label, symbol: look.symbol };
}

// Whether a candidate carries its minutes: its round has its number whatever room there is, and its minutes stand in
// a capsule of their own beside it, with no number, or are left out (P04 ticket 83).
function tagged(drawn: AnswerMap | null, label: string): boolean {
  const { label: tag, symbol } = markOf(drawn, label);
  expect(tag).toBeNull();
  expect(symbol?.type === 'dot' ? symbol.number : null).not.toBeNull();
  const minutes = drawn?.contents.markers.find(({ id }) => id === `answer:candidate:${label}:minutes`)?.image.view;
  if (minutes === undefined) {
    return false;
  }
  expect(minutes).toMatchObject({ kind: 'answer', symbol: null, label: { tone: 'minutes', number: null } });
  return true;
}

function taggedAll(drawn: AnswerMap | null): boolean[] {
  return CANDIDATES.map((label) => tagged(drawn, label));
}

function inArea(at: LatLng, camera: MapCamera): boolean {
  const { x, y } = inView(at, camera, SIZE);
  return y >= AREA.top && y <= AREA.bottom && x >= AREA.left && x <= AREA.right;
}

function movedTo(label: string): LatLng {
  const moved = MOVED.find(([name]) => name === label);
  if (moved === undefined) {
    throw new Error(`${label} was not moved`);
  }
  return moved[1];
}

interface Rendered {
  drawn: () => AnswerMap | null;
  restAt: (camera: MapCamera) => Promise<void>;
  // Drawn again with the map where it rests, as when a picture is made.
  again: () => Promise<void>;
  first: MapCamera;
  asked: Asked;
}

// The answer drawn, and the map coming to rest at its first camera after the glide there.
async function rendered(): Promise<Rendered> {
  const asked: Asked = { fits: 0, cameras: [] };
  const mapAt = (camera: MapCamera | null): ReturnType<typeof mapOf> => ({ ...mapOf(FIT_ZOOM, asked), camera });
  const { result, rerender } = await renderHook(
    ({ camera }: { camera: MapCamera | null }) =>
      useAnswerMap(SHOWN, mapAt(camera), ROOM, { avatars: [], cards: [] }, NOT_INVITED),
    { initialProps: { camera: null as MapCamera | null } },
  );
  const first = asked.cameras[0];
  if (first === undefined) {
    throw new Error('The answer asked for no camera');
  }
  let resting: MapCamera = first;
  const restAt = async (camera: MapCamera): Promise<void> => {
    resting = { ...camera };
    await rerender({ camera: resting });
  };
  const again = async (): Promise<void> => {
    await rerender({ camera: resting });
  };
  await restAt(first);
  return { drawn: () => result.current, restAt, again, first, asked };
}

// The camera of the same zoom moved north, 2 at 40 points under the area's top.
function northOf(first: MapCamera): MapCamera {
  return cameraPutting(movedTo('301동식당'), { x: 120, y: AREA.top + 40 }, first.zoom);
}

// Zoomed in on 3식당 and 자하연식당 2층, their middle at the area's middle.
function onNeighbours(): MapCamera {
  const [one, other] = [movedTo('3식당'), movedTo('자하연식당 2층')];
  const middle = { latitude: (one.latitude + other.latitude) / 2, longitude: (one.longitude + other.longitude) / 2 };
  return cameraPutting(middle, { x: SIZE.width / 2, y: (AREA.top + AREA.bottom) / 2 }, 17.5);
}

beforeEach(() => {
  mockNative.on = false;
  mockMade.clear();
  mockFailed.clear();
  mockAsked.clear();
});

// Partitions: the answer's first camera (2, 4, and 5 behind the time card, 3 in view); a camera at the same zoom that
// shows them all; one zoomed in on two neighbours, the others out of view. Expected values: from where each stands in
// those views, as the precondition checks say.
describe('the tags of a meal answer where the map comes to rest (P04 ticket 69)', () => {
  it('tags at the first camera only 학생회관식당 (3), in view, with 2, 4, and 5 behind the time card', async () => {
    const { drawn, first } = await rendered();

    expect(CANDIDATES.map((label) => inArea(movedTo(label), first))).toEqual([false, true, false, false]);
    expect(taggedAll(drawn())).toEqual([false, true, false, false]);
  });

  // P04 ticket 83: a capsule runs to the right of its round, or to the left, never above or below. 3식당 (4) stands 14
  // points from 자하연식당 2층's round (5) at its right and has 301동식당's minutes (2) at its left, so 4 and 5 keep their
  // numbered rounds alone, the later ranks giving way as before.
  it('tags 2 and 3 once the map rests where all of them show, and 4 between two neighbours has no room', async () => {
    const { drawn, restAt, first } = await rendered();
    const north = northOf(first);
    expect(CANDIDATES.map((label) => inArea(movedTo(label), north))).toEqual([true, true, true, true]);

    await restAt(north);

    expect(taggedAll(drawn())).toEqual([true, true, false, false]);
  });

  it('tags both neighbours once the map rests zoomed in on them, and the others keep their numbered dots', async () => {
    const { drawn, restAt } = await rendered();
    const close = onNeighbours();
    expect(CANDIDATES.map((label) => inArea(movedTo(label), close))).toEqual([false, false, true, true]);

    await restAt(close);

    expect(taggedAll(drawn())).toEqual([false, false, true, true]);
  });

  it('asks the camera to move no more than once, for the answer itself', async () => {
    const { restAt, first, asked } = await rendered();

    await restAt(northOf(first));
    await restAt(onNeighbours());

    expect(asked.cameras).toHaveLength(1);
  });
});

// The stage makes the picture of every look asked for so far.
function makeAsked(): void {
  for (const name of mockAsked) {
    mockMade.add(name);
  }
}

// Every mark on the map has its picture: none is taken away while its new picture is on its way.
function whole(drawn: AnswerMap | null): boolean {
  return (drawn?.contents.markers ?? []).every(({ image }) => image.uri !== null);
}

// Partitions: the pictures of the new placement not made, made, still on their way after ten seconds, and one whose
// tries were used up. Expected values: the placements above, at the first camera and zoomed in on the neighbours.
function withPictures(): void {
  beforeEach(() => {
    mockNative.on = true;
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });
}

describe('a placement at rest while its pictures are made', () => {
  withPictures();

  it('keeps every mark as placed before until every picture is made, and then changes them together', async () => {
    const { drawn, restAt, again } = await rendered();
    makeAsked();

    await restAt(onNeighbours());
    expect(taggedAll(drawn())).toEqual([false, true, false, false]);
    makeAsked();
    await again();

    expect(taggedAll(drawn())).toEqual([false, false, true, true]);
  });
});

describe('a placement at rest whose pictures are slow or fail', () => {
  withPictures();

  // The phone's case (2026-11-26): after 1.5 seconds the placement at rest was shown with a picture still to come, and
  // that mark left the map for a second.
  it('keeps the board in sight, every mark with its picture, while a new picture is on its way', async () => {
    const { drawn, restAt } = await rendered();
    makeAsked();

    await restAt(onNeighbours());
    await act(async () => {
      await jest.advanceTimersByTimeAsync(10_000);
    });

    expect(taggedAll(drawn())).toEqual([false, true, false, false]);
    expect(whole(drawn())).toBe(true);
  });

  it('changes once the pictures still to come are made or will not be', async () => {
    const { drawn, restAt, again } = await rendered();
    makeAsked();
    const before = new Set(mockAsked);

    await restAt(onNeighbours());
    const [last, ...rest] = [...mockAsked].filter((name) => !before.has(name));
    for (const name of rest) {
      mockMade.add(name);
    }
    if (last !== undefined) {
      mockFailed.add(last);
    }
    await again();

    expect(taggedAll(drawn())).toEqual([false, false, true, true]);
  });
});
