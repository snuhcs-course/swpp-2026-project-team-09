/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { ComponentProps, ReactElement } from 'react';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import { MEAL_PLAN_3 } from '@/api/mock/data/meal-answer-plan-3';
import { font } from '@/design-system';
import { TimeBand } from '@/screens/main/answer/time-band';
import { holdGesture } from './support/hold-gesture';

// The time bar's words while a handle is dragged (P04 ticket 30): the times and the length under the finger, the
// dragged end's time in the stronger weight. The band of the third Plan of the stored reply to "배고파, 민수랑 같이",
// 12:33 to 12:59 · 식사 26분, in a range of 11:30 to 13:30, with 민수's class until 12:15 and the User's from 13:00. The
// track is laid out 240 wide: unfolded, two points a minute; folded, over 12:00 to 13:15 (15 minutes around 12:15 and
// 13:00), 3.2 points a minute. Each handle stops at the nearest five-minute step. Expected values worked by hand.
const { band } = MEAL_PLAN_3;
const at = (clock: string): string => `2026-11-17T${clock}:00+09:00`;

type Props = ComponentProps<typeof TimeBand>;

const noop = (): void => undefined;

function element(props: Partial<Props>): ReactElement {
  return (
    <TimeBand
      band={band}
      disabled={false}
      focus={null}
      ghost={null}
      onDrop={noop}
      fixed={{ from: null, until: null }}
      {...props}
    />
  );
}

async function show(props: Partial<Props> = {}): Promise<(next: Partial<Props>) => Promise<void>> {
  const { rerender } = await render(element(props));
  await fireEvent(screen.getByTestId('time-band-track'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 240, height: 60 } },
  });
  return async (next) => {
    await rerender(element({ ...props, ...next }));
  };
}

function words(): ReturnType<typeof screen.getByTestId> {
  return screen.getByTestId('time-band-words');
}

// Partitions: the start held on the unfolded bar, moved on while held; the end held on the folded bar; no drag.
describe("TimeBand's words while a handle is held", () => {
  it('says the start and the length under the finger, the start stronger, and follows the finger', async () => {
    await show();

    // 12:33 and five minutes is 12:38, nearest to 12:40.
    const move = await holdGesture('time-band-from', 0, 10);

    expect(words()).toHaveTextContent('12:40–12:59 · 식사 19분');
    expect(screen.getByText('12:40')).toHaveStyle({ fontFamily: font.bold });

    // Back, ten minutes before 12:33: 12:23, nearest to 12:25. Ahead, 12:40 is the last step 15 minutes before 12:59.
    await move(-20);

    expect(words()).toHaveTextContent('12:25–12:59 · 식사 34분');
  });

  it('says the end under the finger on the folded bar, the end stronger', async () => {
    await show({ folded: true });

    // 12:59 less ten minutes is 12:49, nearest to 12:50.
    await holdGesture('time-band-until', 0, -32);

    expect(words()).toHaveTextContent('12:33–12:50 · 식사 17분');
    expect(screen.getByText('12:50')).toHaveStyle({ fontFamily: font.bold });
  });

  it("says the band's own words while nothing is dragged", async () => {
    await show();

    expect(words()).toHaveTextContent('12:33–12:59 · 식사 26분');
  });
});

async function drag(bound: 'from' | 'until', dx: number): Promise<void> {
  await act(() => {
    fireGestureHandler(getByGestureTestId(`time-band-${bound}`), [
      { translationX: 0, translationY: 0 },
      { translationX: dx, translationY: 0 },
    ]);
  });
}

// Partitions: let go while the recalculation runs, then its new band; let go and the recalculation failed.
describe("TimeBand's words after a handle is let go", () => {
  it("keeps the dropped times while the recalculation runs, then says the new band's words", async () => {
    const rerender = await show();
    await drag('from', 10);
    await rerender({ disabled: true });

    expect(words()).toHaveTextContent('12:40–12:59 · 식사 19분');

    await rerender({ band: { ...band, startAt: at('12:40'), text: '12:40–12:59 · 식사 19분' }, disabled: false });

    expect(words()).toHaveTextContent('12:40–12:59 · 식사 19분');
    expect(screen.queryByText('12:40')).toBeNull();
  });

  it("says the band's own words again when the recalculation fails", async () => {
    const rerender = await show();
    await drag('until', -20);
    await rerender({ disabled: true });

    await rerender({ disabled: false });

    expect(words()).toHaveTextContent('12:33–12:59 · 식사 26분');
  });
});

// The longest words the bar's head writes, seen on a phone 360 wide (P04 ticket 37), from the bar's left edge to
// "＋ 같이" ("←" left the answer in P04 ticket 52).
const LONG = { ...band, text: '11:03–12:15 · 식사 1시간 12분' };
const HEAD = { right: 72 };

// The hidden copy of the words lays itself out at their width; two lines mean they do not fit on one.
async function laidOut(lines: number): Promise<void> {
  await fireEvent(screen.getByTestId('time-band-words-measure', { includeHiddenElements: true }), 'textLayout', {
    nativeEvent: { lines: Array.from({ length: lines }, () => ({})) },
  });
}

// Partitions: words that fit; too long once; too long after dropping the length.
describe("TimeBand's head words on a narrow bar", () => {
  it('stay whole when they fit on one line', async () => {
    await show({ band: LONG, day: '내일(월) 점심', head: HEAD });

    await laidOut(1);

    expect(words()).toHaveTextContent('내일(월) 점심 11:03–12:15 · 식사 1시간 12분', { exact: true });
  });

  it("drop the length first, then the meal's name, before they are cut", async () => {
    await show({ band: LONG, day: '내일(월) 점심', head: HEAD });

    await laidOut(2);
    expect(words()).toHaveTextContent('내일(월) 점심 11:03–12:15', { exact: true });

    await laidOut(2);
    expect(words()).toHaveTextContent('내일(월) 11:03–12:15', { exact: true });
    expect(screen.queryByTestId('time-band-words-measure', { includeHiddenElements: true })).toBeNull();
  });
});
