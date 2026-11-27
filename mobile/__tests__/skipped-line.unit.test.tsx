/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { fireEvent, render, screen, within } from '@testing-library/react-native';
import type { SkippedClass } from '@/api/time-band-types';
import { foldedTimeCardOf } from '@/screens/main/answer/card-caps';
import { SkippedBlocks, SkippedLine, skippedLineOf } from '@/screens/main/answer/skipped-classes';

// The line of the Classes left out under the time card's ends (P04 ticket 93, the design's option 다 and "뺀 수업
// 줄이 넘칠 때"): its pills, the label that stays in place while they scroll, the fade at the end with more, and the
// card one fixed step taller; and the dashed blocks in the range. Partitions: none, one, five; scrolled to its start
// and on; a Class in the range and one outside it.

const at = (clock: string): string => `2026-11-17T${clock}:00+09:00`;
const classAt = (start: string, end: string): SkippedClass => ({
  id: `class-${start}`,
  startAt: at(start),
  endAt: at(end),
  label: '24동 수업',
});
const FIVE = [
  classAt('09:00', '10:15'),
  classAt('10:30', '11:50'),
  classAt('13:00', '14:15'),
  classAt('15:00', '16:15'),
  classAt('16:30', '17:45'),
];

describe('The line of Classes left out', () => {
  it('is not drawn for none', async () => {
    await render(<SkippedLine disabled={false} onPutBack={jest.fn<void, [string]>()} skipped={[]} />);

    expect(screen.queryByTestId('time-band-skipped-line')).toBeNull();
  });

  it('says 뺀 수업 and a pill for each Class by its start, whose ✕ puts that one back', async () => {
    const onPutBack = jest.fn<void, [string]>();
    await render(<SkippedLine disabled={false} onPutBack={onPutBack} skipped={FIVE.slice(2, 3)} />);

    expect(screen.getByText('뺀 수업')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: '13:00 24동 수업 다시 넣기' }));

    expect(screen.getByText('13:00 ✕')).toBeOnTheScreen();
    expect(onPutBack).toHaveBeenCalledWith('class-13:00');
  });

  it('keeps the label out of the row that scrolls, and fades the end with more', async () => {
    await render(<SkippedLine disabled={false} onPutBack={jest.fn<void, [string]>()} skipped={FIVE} />);
    const pills = screen.getByTestId('time-band-skipped-pills');

    expect(within(pills).queryByText('뺀 수업')).toBeNull();
    expect(within(pills).getAllByRole('button')).toHaveLength(5);
    await fireEvent(pills, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 240, height: 20 } } });
    await fireEvent(pills, 'contentSizeChange', 400, 20);
    expect(screen.getByTestId('time-band-skipped-fade-right')).toBeOnTheScreen();
    expect(screen.queryByTestId('time-band-skipped-fade-left')).toBeNull();

    await fireEvent.scroll(pills, { nativeEvent: { contentOffset: { x: 160, y: 0 } } });

    expect(screen.getByTestId('time-band-skipped-fade-left')).toBeOnTheScreen();
    expect(screen.queryByTestId('time-band-skipped-fade-right')).toBeNull();
  });

  it('takes no press while a recalculation is on its way', async () => {
    const onPutBack = jest.fn<void, [string]>();
    await render(<SkippedLine disabled onPutBack={onPutBack} skipped={FIVE.slice(2, 3)} />);

    await fireEvent.press(screen.getByRole('button', { name: '13:00 24동 수업 다시 넣기' }));

    expect(onPutBack).not.toHaveBeenCalled();
  });
});

describe('The folded time card with the line', () => {
  it.each([1, 1.3])('is one fixed step taller at font scale %s', (scale) => {
    expect(foldedTimeCardOf(scale, true) - foldedTimeCardOf(scale)).toBeCloseTo(skippedLineOf(scale));
    expect(skippedLineOf(scale)).toBeGreaterThan(0);
  });
});

describe('The dashed blocks of Classes left out', () => {
  it('draws one for a Class in the range and none for one outside it', async () => {
    await render(
      <SkippedBlocks
        range={{ startAt: at('11:30'), endAt: at('14:30') }}
        skipped={[classAt('13:00', '14:15'), classAt('15:00', '16:15')]}
      />,
    );

    expect(screen.getAllByTestId('time-band-skipped')).toHaveLength(1);
  });
});
