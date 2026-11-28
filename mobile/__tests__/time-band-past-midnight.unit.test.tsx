/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { DeviceEventEmitter } from 'react-native';
import { State } from 'react-native-gesture-handler';
import { getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import type { TimeBand as TimeBandData } from '@/api/assistant-types';
import { font } from '@/design-system';
import { TimeBand } from '@/screens/main/answer/time-band';
import { holdGesture } from './support/hold-gesture';

// The end handle of a study place's band that runs past midnight (P01 ticket 48), as the user pressed it on his phone:
// "19:15–01:00 · 5시간 45분" in a range of 19:00 to 01:00, a track 240 wide, so 1.5 minutes a point. Partitions: the end
// pressed where it is; dragged back before midnight; dragged back only past midnight, where it stops at the last step
// before it (#769's review); the drag cancelled, as when the card's scroll takes the touch.

const at = (clock: string, date = '2026-11-28'): string => `${date}T${clock}:00+09:00`;
const LATE: TimeBandData = {
  range: { startAt: at('19:00'), endAt: at('01:00', '2026-11-29') },
  now: at('19:04'),
  lanes: [{ userId: 'me', name: '나', busy: [] }],
  startAt: at('19:15'),
  endAt: at('01:00', '2026-11-29'),
  text: '19:15–01:00 · 5시간 45분',
};

// The times a handle was let go at, in the order it was.
async function show(): Promise<string[]> {
  const drops: string[] = [];
  const onDrop = (bound: string, time: string): void => {
    drops.push(`${bound} ${time}`);
  };
  await render(
    <TimeBand band={LATE} disabled={false} fixed={{ from: null, until: null }} focus={null} onDrop={onDrop} />,
  );
  await fireEvent(screen.getByTestId('time-band-track'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 240, height: 60 } },
  });
  return drops;
}

// The pan on `testId`, held, ends: let go (END) or taken by another gesture (CANCELLED).
async function endPan(testId: string, dx: number, state: State): Promise<void> {
  const { handlerTag } = getByGestureTestId(testId);
  await act(() => {
    DeviceEventEmitter.emit('onGestureHandlerStateChange', {
      handlerTag,
      numberOfPointers: 1,
      x: 0,
      y: 0,
      absoluteX: 0,
      absoluteY: 0,
      translationX: dx,
      translationY: 0,
      state,
      oldState: State.ACTIVE,
    });
  });
}

describe('The end handle of a band past midnight', () => {
  it('stays at the bar’s right end when pressed where it is', async () => {
    await show();

    await holdGesture('time-band-until', 0, 0);

    expect(screen.getByTestId('time-band-handle-until')).toHaveStyle({ left: '100%' });
    expect(screen.getByTestId('time-band-words')).toHaveTextContent('19:15–01:00 · 5시간 45분');
  });

  it('says the end and the length the bar draws when dragged back before midnight', async () => {
    await show();

    // 90 minutes before 01:00.
    await holdGesture('time-band-until', 0, -60);

    expect(screen.getByTestId('time-band-words')).toHaveTextContent('19:15–23:30 · 4시간 15분');
    expect(screen.getByText('23:30')).toHaveStyle({ fontFamily: font.bold });
  });

  it('stops before midnight when dragged back to 00:30, and is let go there', async () => {
    const drops = await show();

    // 30 minutes before 01:00, past the last step before midnight.
    const move = await holdGesture('time-band-until', 0, -20);

    expect(screen.getByTestId('time-band-words')).toHaveTextContent('19:15–23:55 · 4시간 40분');

    await move(-20);
    await endPan('time-band-until', -20, State.END);

    expect(drops).toEqual(['until 23:55']);
  });

  it('goes back and asks for nothing when the drag is cancelled', async () => {
    const drops = await show();
    await holdGesture('time-band-until', 0, -60);

    await endPan('time-band-until', -60, State.CANCELLED);

    expect(drops).toEqual([]);
    expect(screen.getByTestId('time-band-handle-until')).toHaveStyle({ left: '100%' });
    expect(screen.getByTestId('time-band-words')).toHaveTextContent('19:15–01:00 · 5시간 45분');
  });
});
