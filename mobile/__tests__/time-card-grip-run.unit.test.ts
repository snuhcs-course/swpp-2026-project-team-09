/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { act, renderHook } from '@testing-library/react-native';
import type * as ReanimatedModule from 'react-native-reanimated';
import type { SheetLink } from '@/screens/main/answer/sheet-link';
import { type GripPlace, type TimeCardGrip, useTimeCardGrip } from '@/screens/main/answer/time-card-grip';

// The time card's runs between its places with motion on (P04 ticket 67, the user's phone on 2026-11-26). Each run is
// held until the test lands it, as the phone's spring takes a while: a run replaced on its way ends unfinished, as
// Reanimated ends it, and the last one finishes.

jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => false,
  useMotionAllowed: (): boolean => true,
  useReduceMotionSetting: (): boolean => false,
}));

interface Run {
  to: number;
  land: (finished: boolean) => void;
}

const mockRuns: Run[] = [];

jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual<typeof ReanimatedModule>('react-native-reanimated'),
  withSpring: (to: number, _config: unknown, end: (finished: boolean) => void): number => {
    mockRuns.push({ to, land: end });
    return to;
  },
}));

const SHEET: SheetLink = {
  high: false,
  onOpen: () => {
    // No sheet under the card.
  },
};

type View = Awaited<ReturnType<typeof renderHook<TimeCardGrip, { rows: number }>>>;

function cardWith(rows: number): Promise<View> {
  mockRuns.length = 0;
  return renderHook(({ rows: room }) => useTimeCardGrip({ height: 100, top: 40, rows: room, sheet: SHEET }), {
    initialProps: { rows },
  });
}

async function step(view: View, move: (grip: TimeCardGrip) => void): Promise<void> {
  await act(() => {
    move(view.result.current);
  });
}

// Every run so far comes to its end: the replaced ones unfinished, the last one finished.
async function land(): Promise<void> {
  const runs = mockRuns.splice(0);
  await act(async () => {
    runs.forEach((run, at) => {
      run.land(at === runs.length - 1);
    });
    await Promise.resolve();
  });
}

function placeOf(view: View): GripPlace {
  return view.result.current.place;
}

// Partitions: the rows laid out again while it opens; a way back asked while it opens; a press on the grip while it
// opens. Expected values: the run's end, and the place it rests at.
describe('the time card on its way open', () => {
  // The user's phone: "김태현이 뜬 뒤에 나중에 안진영 함재현이 떠". Picking's rows are laid out a frame after the
  // opening begins, and the run headed for the room the rows had before.
  it('heads for the rows laid out again on the way, and rests open', async () => {
    const view = await cardWith(32);

    await step(view, (grip) => {
      grip.settleTo('open');
    });
    await view.rerender({ rows: 206 });

    expect(mockRuns.at(-1)?.to).toBe(206);
    await land();
    expect(placeOf(view)).toBe('open');
  });

  // The user's phone: "빠르게 완료를 누르면 카드가 펼쳐진 상태가 되어 나 줄이 떠".
  it('goes back folded when leaving picking asks for it before it arrives', async () => {
    const view = await cardWith(108);

    await step(view, (grip) => {
      grip.settleTo('open');
    });
    await step(view, (grip) => {
      grip.settleTo('shown');
    });
    await land();

    expect(placeOf(view)).toBe('shown');
  });

  it('folds again at a press on the grip before it arrives', async () => {
    const view = await cardWith(108);

    await step(view, (grip) => {
      grip.toggle();
    });
    await step(view, (grip) => {
      grip.toggle();
    });
    await land();

    expect(placeOf(view)).toBe('shown');
  });
});
