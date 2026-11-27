/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { renderHook } from '@testing-library/react-native';
import type { LatLng, Quest } from '@/api/types';
import { type CardView, toCards } from '@/features/map/adapter';
import type { MapAvatar, MapCamera, MarkerImage } from '@/map';
import { ME_AVATAR_ID, pressableMe } from '@/screens/main/use-me';
import { FLAG_ORDER, SELECTED_ORDER, useThings } from '@/screens/main/use-things';
import { friendView, GATE, measured, MIN_JUN, quest, sources } from '../support/map-sources';

// A flag on the everyday map, a Quest made from a Plan's or a booking party's with its room request out (P10 ticket
// 13), stands above the Friends' pins near it, as its two lines are what the flag says: the map draws every Avatar
// above every marker, so a flag is drawn among the Avatars, above them. Partitions: the request's flag, the made
// Quest's flag, a Friend's pin, and a place's marker.

const STEP = {
  id: 'b1-1',
  attending: false,
  title: '관정 그룹스터디룸 6인실 예약',
  startsAt: '2026-10-07T15:00:00+09:00',
  endsAt: '2026-10-07T17:00:00+09:00',
  place: GATE,
  completion: 'by_hand' as const,
  cancelled: false,
  done: false,
  ended: false,
};

const BOOKING: Quest = quest('b1', {
  title: '관정 그룹스터디룸 6인실 예약',
  subQuests: [STEP],
  roomRequest: { id: 'r1', status: 'gathering', consented: 1, asked: 3 },
});

// A Quest made from a Plan, as `madeQuestCards` makes its flag.
const MADE: CardView = {
  id: 'made-quest:q9',
  kind: 'made-quest',
  mark: { type: 'place', place: 'party' },
  marker: { name: '11월 17일 (화) 12:15 점심 · 수락 0/1', short: '점심', count: 0, minutesOld: null },
  flag: { title: '11월 17일 (화) 12:15', line: '점심 · 수락 0/1' },
  subLabel: '비공개 파티',
  title: '302동식당에서 점심',
  lines: [],
  primary: null,
  secondary: null,
  position: { latitude: 37.4488, longitude: 126.9526 },
};

function cards(): CardView[] {
  const everyday = toCards(
    sources({
      quests: [BOOKING, quest('q2', { title: '저녁 약속', subQuests: [{ ...STEP, id: 'q2-1', place: GATE }] })],
      friends: [friendView(MIN_JUN)],
      positions: [measured(MIN_JUN.id, 0)],
    }),
  );
  return [...everyday, MADE];
}

describe('The flags on the everyday map', () => {
  it("stand above the Friends' pins, among the Avatars", async () => {
    const { result } = await renderHook(() => useThings(cards(), 'names', null));
    const { avatars, markers } = result.current;

    const order = (id: string): number | undefined => avatars.find((avatar) => avatar.id === id)?.order;
    expect(order('party:b1')).toBe(FLAG_ORDER);
    expect(order('made-quest:q9')).toBe(FLAG_ORDER);
    expect(FLAG_ORDER).toBeGreaterThan(SELECTED_ORDER);
    expect(order(`friend:${MIN_JUN.id}`)).toBeLessThan(FLAG_ORDER);
    expect(markers.map(({ id }) => id)).not.toContain('party:b1');
    expect(markers.map(({ id }) => id)).not.toContain('made-quest:q9');
  });

  it('leave every other place a marker', async () => {
    const { result } = await renderHook(() => useThings(cards(), 'names', null));

    expect(result.current.markers.map(({ id }) => id)).toContain('party:q2');
  });
});

// The User's own Avatar beside a flag: under the faces, so that a Friend's face over it keeps its press, but above a
// flag whose picture covers its own, so that a flag standing at the User's place does not take the press on it.
// Partitions: a flag covering it, a flag apart from it, the map not laid out or its camera not known yet, and a Friend's face covering it. Expected values: review of
// PR 662, option 1.
const CAMERA: MapCamera = { centre: { latitude: 37.45962, longitude: 126.95168 }, zoom: 17 };
const STAGE = { width: 400, height: 800 };

function picture(width: number, height: number, anchor: { x: number; y: number }): MarkerImage {
  return { look: `test:${String(width)}x${String(height)}`, view: { kind: 'me' }, uri: null, width, height, anchor };
}

const ME: MapAvatar = {
  id: ME_AVATAR_ID,
  name: '내 위치',
  position: CAMERA.centre,
  image: picture(24, 24, { x: 0.5, y: 0.5 }),
  glideMs: 0,
};

function flagAt(position: LatLng): MapAvatar {
  return {
    id: 'party:b1',
    name: '관정 그룹스터디룸 내일 15:00 · 동의 1/3 · 기다리는 중',
    position,
    image: picture(132, 44, { x: 0.5, y: 1 }),
    order: FLAG_ORDER,
    glideMs: 0,
  };
}

describe("The User's own Avatar beside a flag", () => {
  it('stands above a flag whose picture covers its own, and takes its press', () => {
    const [me] = pressableMe([ME], [flagAt(CAMERA.centre)], CAMERA, STAGE);

    expect(me?.order).toBeGreaterThan(FLAG_ORDER);
    expect(me?.passive).toBe(false);
  });

  it('stays under the faces away from every flag', () => {
    const apart = { latitude: CAMERA.centre.latitude + 0.002, longitude: CAMERA.centre.longitude };

    const [me] = pressableMe([ME], [flagAt(apart)], CAMERA, STAGE);

    expect(me?.order).toBeLessThan(0);
  });

  it('stays under the faces until the map is laid out and its camera known', () => {
    const [unlaid] = pressableMe([ME], [flagAt(CAMERA.centre)], CAMERA, null);
    const [unseen] = pressableMe([ME], [flagAt(CAMERA.centre)], null, STAGE);

    expect(unlaid?.order).toBeLessThan(0);
    expect(unseen?.order).toBeLessThan(0);
  });

  it("stays under a Friend's face over it, which is no flag", () => {
    const face: MapAvatar = { ...flagAt(CAMERA.centre), id: `friend:${MIN_JUN.id}`, order: 0 };

    const [me] = pressableMe([ME], [face], CAMERA, STAGE);

    expect(me?.order).toBeLessThan(0);
  });
});
