/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { render, screen, userEvent, within } from '@testing-library/react-native';
import type { ComponentProps } from 'react';

import { ChoiceGrid, color, type GridChoice } from '@/design-system';

type Props = ComponentProps<typeof ChoiceGrid>;

const noop = (): void => undefined;

// Two Friends as a list of people draws them (P02 ticket 18): the full name, the department under it, the distance at
// the right, and the mark that opens the person's profile.
function person(more?: GridChoice['more']): GridChoice[] {
  return [
    {
      key: 'f1',
      name: '김민준',
      sub: '컴퓨터공학부',
      value: '1.2km',
      faint: false,
      label: '김민준, 컴퓨터공학부, 1.2km, 추가',
      more,
    },
    {
      key: 'f11',
      name: '서지우',
      sub: '심리학과',
      value: '위치 모름',
      faint: true,
      label: '서지우, 심리학과, 위치 모름, 추가',
    },
  ];
}

async function show(props: Partial<Props> = {}): Promise<void> {
  await render(<ChoiceGrid choices={person()} disabled={false} onChoose={noop} {...props} />);
}

describe('ChoiceGrid with a second line', () => {
  // Partitions: a cell with a second line, and one without (the cells of `choice-grid.unit.test.tsx`). The rule:
  // ticket 18, the department under the full name in small muted text, the distance staying at the right, and the
  // cell 44 high as every cell of the grid.
  it('writes the second line under the name in the caption in the muted ink, and keeps the value at the right', async () => {
    await show();

    const cell = screen.getByRole('button', { name: '김민준, 컴퓨터공학부, 1.2km, 추가' });
    expect(cell).toHaveTextContent('김민준컴퓨터공학부1.2km');
    expect(cell).toHaveStyle({ flex: 1, height: 44 });
    expect(within(cell).getByText('컴퓨터공학부')).toHaveStyle({ fontSize: 12, color: color.inkMuted });
    expect(within(cell).getByText('1.2km')).toHaveStyle({ textAlign: 'right' });
  });
});

describe('ChoiceGrid with a mark that opens', () => {
  // Partitions: a press on the mark, and on the rest of the cell; the mark while the grid is disabled; a cell without
  // a mark. The rule: ticket 18, a small mark at the cell's end, its own button read as its label, which opens without
  // choosing, with a touch area of at least 44; a press anywhere else chooses at once, as before.
  it('opens with a press on the mark, read as its own button, and does not choose', async () => {
    const onOpen = jest.fn<void, []>();
    const onChoose = jest.fn<void, [string]>();
    await show({ choices: person({ label: '김민준 프로필', onPress: onOpen }), onChoose });

    await userEvent.press(screen.getByRole('button', { name: '김민준 프로필' }));

    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onChoose).not.toHaveBeenCalled();
  });

  it('chooses with a press on the rest of the cell, and does not open', async () => {
    const onOpen = jest.fn<void, []>();
    const onChoose = jest.fn<void, [string]>();
    await show({ choices: person({ label: '김민준 프로필', onPress: onOpen }), onChoose });

    await userEvent.press(screen.getByRole('button', { name: '김민준, 컴퓨터공학부, 1.2km, 추가' }));

    expect(onChoose).toHaveBeenCalledWith('f1');
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('gives the mark a touch area 44 square at the end of the cell', async () => {
    await show({ choices: person({ label: '김민준 프로필', onPress: noop }) });

    expect(screen.getByRole('button', { name: '김민준 프로필' })).toHaveStyle({ width: 44, height: 44 });
    expect(screen.getByRole('button', { name: '김민준, 컴퓨터공학부, 1.2km, 추가' })).toHaveStyle({ height: 44 });
  });

  it('still opens while the grid takes no choice', async () => {
    const onOpen = jest.fn<void, []>();
    await show({ choices: person({ label: '김민준 프로필', onPress: onOpen }), disabled: true });

    await userEvent.press(screen.getByRole('button', { name: '김민준 프로필' }));

    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: '김민준, 컴퓨터공학부, 1.2km, 추가' })).toBeDisabled();
  });

  it('draws no mark on a cell without one', async () => {
    await show({ choices: person({ label: '김민준 프로필', onPress: noop }) });

    expect(screen.getAllByRole('button', { name: /프로필$/u })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: '서지우 프로필' })).toBeNull();
  });
});
