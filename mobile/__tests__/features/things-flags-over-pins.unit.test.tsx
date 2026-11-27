/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { renderHook } from '@testing-library/react-native';
import type { Quest } from '@/api/types';
import { type CardView, toCards } from '@/features/map/adapter';
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
