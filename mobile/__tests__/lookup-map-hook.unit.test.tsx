/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { act, renderHook } from '@testing-library/react-native';
import { createRef } from 'react';
import type { Lookup } from '@/api/lookup-types';
import { FRIEND_LOOKUP } from '@/api/mock/data/friend-lookup';
import { MENU_LOOKUP } from '@/api/mock/data/menu-lookup';
import { WAY_LOOKUP } from '@/api/mock/data/way-lookup';
import type { ChatBubble } from '@/features/assistant/use-chat';
import type { ShownLookup } from '@/features/assistant/use-shown-lookup';
import type { CardView } from '@/features/map/adapter';
import { type MapAvatar, type MapCamera, type MapHandle, unmadeImage } from '@/map';
import type { Room } from '@/screens/main/layout';
import type { MainMap } from '@/screens/main/use-main-map';
import { useLookupMap } from '@/screens/main/use-lookup-map';
import { SELECTED_ORDER } from '@/screens/main/use-things';

// The walking route service is no part of these hooks' units: an answer's walks keep their straight lines (P15
// ticket 56 tests the walks).
jest.mock('@/screens/main/use-answer-walks', () => ({
  useAnswerWalks: (lines: readonly unknown[]): readonly unknown[] => lines,
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: (): object => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

// The emulator's numbers of B's `answer-map-hook.unit.test.tsx`: a stage of 411 by 914 and a card of 274.
const SIZE = { width: 411, height: 914 };
const ROOM: Room = { stage: SIZE, cardHeight: null, answerHeight: 274, tutorialStart: false, interestsHint: false };
const TALLER: Room = { ...ROOM, answerHeight: 380 };
const FIT_ZOOM = 15.26;

function nothing(): void {
  // A part the test does not follow.
}

function mapOf(cameras: MapCamera[]): MainMap {
  return {
    ref: createRef<MapHandle>(),
    onCameraIdle: nothing,
    onFitZoom: nothing,
    camera: null,
    fitZoom: FIT_ZOOM,
    detail: 'overview',
    zoomBy: nothing,
    goTo: nothing,
    showCampus: nothing,
    fitTo: nothing,
    fitAnswer: nothing,
    moveTo: (camera): void => {
      cameras.push(camera);
    },
  };
}

// The conversation's reply of this id: one with a Lookup, or a Plan's, which has none.
function replyOf(id: number, lookup: Lookup | null): ChatBubble {
  return { id, role: 'assistant', text: '', cards: [], mapButtons: [], proposal: null, failure: null, lookup };
}

const NOTHING_SHOWN: ShownLookup = {
  lookup: null,
  reply: null,
  basisOpen: false,
  toggleBasis: nothing,
  guide: nothing,
};

function shownOf(id: number, lookup: Lookup | null): ShownLookup {
  return { ...NOTHING_SHOWN, lookup, reply: replyOf(id, lookup) };
}

const AT_LIBRARY = { latitude: 37.4598, longitude: 126.9521 };

const MIN_JUN_CARD: CardView = {
  id: 'friend:f1',
  kind: 'friend',
  mark: { type: 'person', id: 'f1', name: '김민준', photo: null, presence: 'free', stale: false },
  marker: { name: '김민준', short: '김민준', count: 0, minutesOld: null },
  subLabel: '컴퓨터공학부 22',
  title: '김민준',
  lines: [],
  primary: null,
  secondary: null,
  position: AT_LIBRARY,
};

// 김민준's face as the everyday map draws it once he was selected before asking.
const SELECTED_FACE: MapAvatar = {
  id: MIN_JUN_CARD.id,
  name: '김민준',
  position: AT_LIBRARY,
  image: unmadeImage({ kind: 'person', id: 'f1', tone: 'free', selected: true, name: '김민준', photo: null }),
  glideMs: 0,
  order: SELECTED_ORDER,
};

const MY_AVATAR: MapAvatar = {
  id: 'me',
  name: '내 위치',
  position: AT_LIBRARY,
  image: unmadeImage({ kind: 'me' }),
  glideMs: 0,
  order: 1,
  passive: true,
};

interface Given {
  shown: ShownLookup;
  room: Room;
}

async function render(cameras: MapCamera[], given: Given): Promise<(next: Given) => Promise<void>> {
  const { rerender } = await renderHook(
    ({ shown, room }: Given) => useLookupMap(shown, mapOf(cameras), room, { avatars: [], cards: [] }, []),
    { initialProps: given },
  );
  return async (next): Promise<void> => {
    await rerender(next);
  };
}

async function wait(milliseconds: number): Promise<void> {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(milliseconds);
  });
}

// The camera a Lookup gets when it comes first, under a card of 274: what a waited move must reach.
async function firstCamera(lookup: Lookup): Promise<MapCamera | undefined> {
  const cameras: MapCamera[] = [];
  await render(cameras, { shown: shownOf(9, lookup), room: ROOM });
  return cameras[0];
}

// Partitions: the conversation's first reply, a Lookup that replaces another Lookup, and one that replaces a Plan,
// each with the card laid out again 60 ms after the reply. Expected values: B's rule for an answer that replaced
// another (`useAnswerCamera`): one move, once the drawing and the card have stayed the same for 120 ms.
describe("the Lookup's camera when a reply comes", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('moves at once for the first reply of the conversation', async () => {
    const cameras: MapCamera[] = [];
    const rerender = await render(cameras, { shown: NOTHING_SHOWN, room: TALLER });

    await rerender({ shown: shownOf(1, WAY_LOOKUP), room: TALLER });

    expect(cameras).toHaveLength(1);
  });

  it.each([
    ['a Lookup', WAY_LOOKUP],
    ['a Plan', null],
  ])('moves once for a Lookup that replaces %s, after 120 ms still', async (_, before) => {
    const cameras: MapCamera[] = [];
    const rerender = await render(cameras, { shown: shownOf(1, before), room: TALLER });
    const moved = cameras.length;

    await rerender({ shown: shownOf(2, MENU_LOOKUP), room: TALLER });
    await wait(60);
    await rerender({ shown: shownOf(2, MENU_LOOKUP), room: ROOM });
    await wait(119);
    expect(cameras).toHaveLength(moved);
    await wait(1);

    expect(cameras).toHaveLength(moved + 1);
    expect(cameras.at(-1)).toEqual(await firstCamera(MENU_LOOKUP));
  });
});

// The Avatars drawn under a Lookup over 김민준's face selected before asking and the User's own Avatar.
async function avatarsUnder(lookup: Lookup): Promise<readonly MapAvatar[]> {
  const everyday = { avatars: [SELECTED_FACE], cards: [MIN_JUN_CARD] };
  const { result } = await renderHook(() => useLookupMap(shownOf(1, lookup), mapOf([]), ROOM, everyday, [MY_AVATAR]));
  return result.current?.contents.avatars ?? [];
}

// Partitions: a Friend's face selected before asking; the User's own Avatar under a scene that draws the User and
// under one that does not. Expected values: B's faces under a Plan (`useFaces`), and the decision of 2026-11-15 that
// the User's own Avatar stays when the Lookup does not draw the User (boards q5 to q7).
describe('the Avatars under a Lookup', () => {
  it('draw a face selected before asking unselected, with no "+", in the everyday order', async () => {
    const face = (await avatarsUnder(WAY_LOOKUP)).find(({ id }) => id === MIN_JUN_CARD.id);

    expect(face?.image.view).toEqual(expect.objectContaining({ kind: 'person', selected: false }));
    expect(face?.image.view).not.toEqual(expect.objectContaining({ addable: true }));
    expect(face?.order).toBe(0);
  });

  it("leave out the User's own Avatar when the Lookup draws the User", async () => {
    expect((await avatarsUnder(WAY_LOOKUP)).map(({ id }) => id)).not.toContain('me');
  });

  it("keep the User's own Avatar when the Lookup does not draw the User", async () => {
    expect((await avatarsUnder(FRIEND_LOOKUP)).map(({ id }) => id)).toContain('me');
  });
});
