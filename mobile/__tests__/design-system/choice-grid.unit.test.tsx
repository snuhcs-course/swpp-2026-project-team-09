/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import type { ComponentProps } from 'react';

import { ChoiceGrid, choiceRowsWithin, color, type GridChoice } from '@/design-system';

type Props = ComponentProps<typeof ChoiceGrid>;

// Three cells as the Friends to add draw them: a given name, and a distance or "자리 모름".
const CHOICES: GridChoice[] = [
  { key: 'f5', name: '하은', value: '160m', faint: false, label: '하은, 160m, 추가' },
  { key: 'f6', name: '도윤', value: '720m', faint: false, label: '도윤, 720m, 추가' },
  { key: 'f11', name: '지우', value: '자리 모름', faint: true, label: '지우, 자리 모름, 추가' },
];

const noop = (): void => undefined;

async function show(props: Partial<Props> = {}): Promise<void> {
  await render(<ChoiceGrid choices={CHOICES} disabled={false} onChoose={noop} {...props} />);
}

// The grid's rows, each as what its parts are called: a cell by its name read aloud, the empty partner by its id.
function rows(): string[][] {
  return screen
    .getByTestId('choice-grid')
    .children.map((row) =>
      typeof row === 'string'
        ? [row]
        : row.children.map((part) => {
            if (typeof part === 'string') {
              return part;
            }
            const name: unknown = part.props.accessibilityLabel ?? part.props.testID;
            return typeof name === 'string' ? name : '';
          }),
    );
}

describe('ChoiceGrid laid out', () => {
  // Partitions: no choice, one, two (a full row), and three (a full row, then an odd last cell). The rule: the design
  // brief's fix 1, two equal columns filled row by row, and an empty cell of the same width after an odd last one.
  it('draws no row for no choice', async () => {
    await show({ choices: [] });

    expect(rows()).toEqual([]);
  });

  it('gives a single choice an empty partner', async () => {
    await show({ choices: CHOICES.slice(0, 1) });

    expect(rows()).toEqual([['하은, 160m, 추가', 'choice-grid-empty']]);
  });

  it('fills a row with two choices and no empty partner', async () => {
    await show({ choices: CHOICES.slice(0, 2) });

    expect(rows()).toEqual([['하은, 160m, 추가', '도윤, 720m, 추가']]);
  });

  it('fills the rows in order, and gives the odd last cell an empty partner', async () => {
    await show();

    expect(rows()).toEqual([
      ['하은, 160m, 추가', '도윤, 720m, 추가'],
      ['지우, 자리 모름, 추가', 'choice-grid-empty'],
    ]);
  });

  it('gives every cell and the empty partner the same share of a row, 44 high', async () => {
    await show();

    for (const label of ['하은, 160m, 추가', '도윤, 720m, 추가', '지우, 자리 모름, 추가']) {
      expect(screen.getByRole('button', { name: label })).toHaveStyle({ flex: 1, height: 44 });
    }
    expect(screen.getByTestId('choice-grid-empty')).toHaveStyle({ flex: 1 });
  });
});

describe('ChoiceGrid shown', () => {
  // Partitions: a value in the muted ink and one said faint.
  it('writes the name at the left and the value at the right, a faint value in the faint ink', async () => {
    await show();

    expect(screen.getByRole('button', { name: '하은, 160m, 추가' })).toHaveTextContent('하은160m');
    expect(screen.getByText('160m')).toHaveStyle({ color: color.inkMuted, textAlign: 'right' });
    expect(screen.getByText('자리 모름')).toHaveStyle({ color: color.inkSubtle });
  });
});

// Nine cells, five rows: 5 × 44 + 4 × 8 = 252 high.
const NINE: GridChoice[] = Array.from({ length: 9 }, (_, index) => ({
  key: `k${index}`,
  name: `친구${index}`,
  value: `${(index + 1) * 100}m`,
  faint: false,
  label: `친구${index}, ${(index + 1) * 100}m, 추가`,
}));

// The grid's window laid out `view` high around content `content` high, scrolled down by `offset`.
async function scrolled(view: number, content: number, offset: number): Promise<void> {
  const shown = screen.getByTestId('choice-grid-window');
  await fireEvent(shown, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 343, height: view } } });
  await fireEvent(shown, 'contentSizeChange', 343, content);
  await fireEvent.scroll(shown, {
    nativeEvent: {
      contentOffset: { x: 0, y: offset },
      contentSize: { width: 343, height: content },
      layoutMeasurement: { width: 343, height: view },
    },
  });
}

describe('ChoiceGrid with a row limit', () => {
  // Partitions: no limit; a limit of four over five rows, at the top and scrolled to the end; three rows under a
  // limit of four. The rule: fix 2 of the design review, at most that many whole rows (4 × 44 + 3 × 8 = 200) that
  // scroll inside, and a fade at the bottom while more rows are below.
  it('draws every row with no window without a limit', async () => {
    await show({ choices: NINE });

    expect(screen.queryByTestId('choice-grid-window')).toBeNull();
  });

  it('shows four whole rows of five in a window 200 high that scrolls inside the card', async () => {
    await show({ choices: NINE, rows: 4 });

    expect(screen.getByTestId('choice-grid-window')).toHaveStyle({ maxHeight: 200 });
    expect(screen.getByTestId('choice-grid-window')).toHaveProp('nestedScrollEnabled', true);
  });

  it('fades the bottom while more rows are below, and not once scrolled to the end', async () => {
    await show({ choices: NINE, rows: 4 });

    await scrolled(200, 252, 0);
    expect(screen.getByTestId('choice-grid-fade')).toBeOnTheScreen();

    await scrolled(200, 252, 52);
    expect(screen.queryByTestId('choice-grid-fade')).toBeNull();
  });

  it('draws no fade when every row fits', async () => {
    // Three rows: 3 × 44 + 2 × 8 = 148.
    await show({ choices: NINE.slice(0, 6), rows: 4 });

    await scrolled(148, 148, 0);

    expect(screen.queryByTestId('choice-grid-fade')).toBeNull();
  });

  it.each([
    [200, 4],
    [199, 3],
    [96, 2],
    [95, 1],
  ])('counts the whole rows within %d as %d', (height, rows) => {
    expect(choiceRowsWithin(height)).toBe(rows);
  });
});

describe('ChoiceGrid pressed', () => {
  // Partitions: a press while enabled, and while disabled.
  it('chooses the cell pressed by its key', async () => {
    const onChoose = jest.fn<void, [string]>();
    await show({ onChoose });

    await userEvent.press(screen.getByRole('button', { name: '지우, 자리 모름, 추가' }));

    expect(onChoose).toHaveBeenCalledWith('f11');
  });

  it('takes no press while disabled, and draws its cells at half strength', async () => {
    const onChoose = jest.fn<void, [string]>();
    await show({ disabled: true, onChoose });

    await userEvent.press(screen.getByRole('button', { name: '하은, 160m, 추가' }));

    expect(onChoose).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '하은, 160m, 추가' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '하은, 160m, 추가' })).toHaveStyle({ opacity: 0.5 });
  });
});
