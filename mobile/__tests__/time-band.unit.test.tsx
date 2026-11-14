/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { ComponentProps } from 'react';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import { MEAL_PLAN_3 } from '@/api/mock/data/meal-answer-plan-3';
import { color } from '@/design-system';
import { TimeBand } from '@/screens/main/answer/time-band';

// The band of the third Plan of the stored reply to "배고파, 민수랑 같이": the range 11:30 to 13:30, the band 12:33 to
// 12:59, a lane for 나 and one for 민수. The track is laid out 240 wide, two points a minute, so that a drag of 10 is
// five minutes. The expected times are worked by hand from the rule: steps of five minutes, inside the range, and at
// least 15 minutes between the handles.
const { band } = MEAL_PLAN_3;
const TRACK_WIDTH = 240;
const at = (clock: string): string => `2026-11-17T${clock}:00+09:00`;

type Props = ComponentProps<typeof TimeBand>;
type OnDrop = Props['onDrop'];

const noop = (): void => undefined;

function element(props: Partial<Props>): React.ReactElement {
  return (
    <TimeBand
      band={band}
      disabled={false}
      focus={null}
      ghost={null}
      onDrop={noop}
      window={{ from: null, until: null }}
      {...props}
    />
  );
}

async function show(props: Partial<Props> = {}): Promise<(next: Partial<Props>) => Promise<void>> {
  const { rerender } = await render(element(props));
  await fireEvent(screen.getByTestId('time-band-track'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: TRACK_WIDTH, height: 60 } },
  });
  return async (next) => {
    await rerender(element({ ...props, ...next }));
  };
}

async function drag(bound: 'from' | 'until', dx: number): Promise<void> {
  await act(() => {
    fireGestureHandler(getByGestureTestId(`time-band-${bound}`), [
      { translationX: 0, translationY: 0 },
      { translationX: dx, translationY: 0 },
    ]);
  });
}

function handle(bound: 'from' | 'until'): ReturnType<typeof screen.getByRole> {
  return screen.getByRole('adjustable', { name: bound === 'from' ? '시작 시각' : '끝 시각' });
}

async function step(bound: 'from' | 'until', actionName: 'increment' | 'decrement'): Promise<void> {
  await fireEvent(handle(bound), 'accessibilityAction', { nativeEvent: { actionName } });
}

describe('TimeBand drawn', () => {
  // Partitions: the lanes and words of a stored band; a ghost given or not; a window that fixes a bound or none; a
  // focus on a handle or none.
  it("draws a lane for each person, the range's ends, the band's words, and its two handles", async () => {
    await show();

    expect(screen.getByText('나')).toBeVisible();
    expect(screen.getByText('민수')).toBeVisible();
    expect(screen.getByText('11:30')).toBeVisible();
    expect(screen.getByText('13:30')).toBeVisible();
    expect(screen.getByText('12:33–12:59 · 식사 26분')).toBeVisible();
    expect(handle('from')).toHaveAccessibilityValue({ text: '12:33' });
    expect(handle('until')).toHaveAccessibilityValue({ text: '12:59' });
  });

  it('draws the ghost as a dashed outline only when one is given', async () => {
    const rerender = await show();
    expect(screen.queryByTestId('time-band-ghost')).toBeNull();

    await rerender({ ghost: { startAt: at('12:15'), endAt: at('12:43') } });

    expect(screen.getByTestId('time-band-ghost')).toHaveStyle({ borderStyle: 'dashed' });
  });

  it('draws a busy stretch inside the fixed window in the warning colour', async () => {
    // A window fixed to end at 13:10: 나's class from 13:00 lies inside it.
    await show({ window: { from: null, until: '13:10' } });

    expect(screen.getAllByTestId('time-band-clash')).toHaveLength(1);
    expect(screen.getByTestId('time-band-clash')).toHaveStyle({ backgroundColor: color.warning });
  });

  it('draws no clash when the window fixes no bound', async () => {
    await show();

    expect(screen.queryByTestId('time-band-clash')).toBeNull();
  });

  it('emphasises the handle in focus', async () => {
    await show({ focus: 'until' });

    expect(handle('until')).toHaveStyle({ borderColor: color.focusRing });
    expect(handle('from')).not.toHaveStyle({ borderColor: color.focusRing });
  });
});

describe('TimeBand dragged', () => {
  // Partitions: a drag of each handle, a drag that ends on the handle's own time, and a drag while disabled.
  it('drops the start handle at the nearest step', async () => {
    const onDrop = jest.fn<void, Parameters<OnDrop>>();
    await show({ onDrop });

    // 12:33 and five minutes is 12:38, nearest to 12:40.
    await drag('from', 10);

    expect(onDrop).toHaveBeenCalledTimes(1);
    expect(onDrop).toHaveBeenCalledWith('from', '12:40');
  });

  it('drops the end handle no nearer than 15 minutes to the start', async () => {
    const onDrop = jest.fn<void, Parameters<OnDrop>>();
    await show({ onDrop });

    // 12:59 less 20 minutes is 12:39; the end handle stops at 12:50, the first step 15 minutes after 12:33.
    await drag('until', -40);

    expect(onDrop).toHaveBeenCalledWith('until', '12:50');
  });

  it("calls nothing for a drag that ends on the handle's own time", async () => {
    const onDrop = jest.fn<void, Parameters<OnDrop>>();
    // The stored band with its start at 12:40, a step, so that a short drag comes back to it.
    await show({ band: { ...band, startAt: at('12:40') }, onDrop });

    await drag('from', 2);

    expect(onDrop).not.toHaveBeenCalled();
  });

  it('takes no drag while a recalculation is on its way', async () => {
    const onDrop = jest.fn<void, Parameters<OnDrop>>();
    await show({ disabled: true, onDrop });

    await drag('from', 10);

    expect(onDrop).not.toHaveBeenCalled();
    expect(handle('from')).toBeDisabled();
  });
});

describe('TimeBand after a drop', () => {
  // Partitions: held while disabled, given back when disabled ends, and replaced when the band changes.
  it('holds the band where it was dropped until the recalculation ends', async () => {
    const rerender = await show();
    await drag('from', 10);
    await rerender({ disabled: true });
    expect(handle('from')).toHaveAccessibilityValue({ text: '12:40' });

    await rerender({ disabled: false });

    expect(handle('from')).toHaveAccessibilityValue({ text: '12:33' });
  });

  it('draws a new band in place of the one dropped', async () => {
    const rerender = await show();
    // 12:59 and one minute: dropped at 13:00.
    await drag('until', 2);
    await rerender({ disabled: true });

    // The stored band with its end moved to 13:10, as a recalculation might draw it.
    await rerender({ band: { ...band, endAt: at('13:10') }, disabled: true });

    expect(handle('until')).toHaveAccessibilityValue({ text: '13:10' });
    expect(handle('from')).toHaveAccessibilityValue({ text: '12:33' });
  });
});

describe('TimeBand stepped', () => {
  // Partitions: each handle up and down, a step that cannot move the handle, and a step while disabled.
  it.each([
    ['from', 'increment', '12:35'],
    ['from', 'decrement', '12:30'],
    ['until', 'increment', '13:00'],
    ['until', 'decrement', '12:55'],
  ] as const)('steps the %s handle by its %s action to %s', async (bound, action, clock) => {
    const onDrop = jest.fn<void, Parameters<OnDrop>>();
    await show({ onDrop });

    await step(bound, action);

    expect(onDrop).toHaveBeenCalledWith(bound, clock);
  });

  it('calls nothing for a step that cannot move the handle', async () => {
    const onDrop = jest.fn<void, Parameters<OnDrop>>();
    // The stored band with its start at 12:40, the last step 15 minutes before 12:59.
    await show({ band: { ...band, startAt: at('12:40') }, onDrop });

    await step('from', 'increment');

    expect(onDrop).not.toHaveBeenCalled();
  });

  it('takes no step while a recalculation is on its way', async () => {
    const onDrop = jest.fn<void, Parameters<OnDrop>>();
    await show({ disabled: true, onDrop });

    await step('until', 'increment');

    expect(onDrop).not.toHaveBeenCalled();
  });
});
