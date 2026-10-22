/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { render, screen, userEvent } from '@testing-library/react-native';

import { ChipRow } from '@/design-system/chip-row';

const CHIPS = [
  { key: 'all', label: '전체', count: 12 },
  { key: 'free', label: '공강', count: 4 },
  { key: 'moving', label: '이동 중', count: 0 },
] as const;

describe('ChipRow', () => {
  it('shows each chip with its count, and the selected one as selected', async () => {
    await render(<ChipRow chips={CHIPS} onSelect={jest.fn<void, [string]>()} selected="all" />);

    expect(screen.getByRole('button', { name: '전체 12' })).toBeSelected();
    expect(screen.getByRole('button', { name: '공강 4' })).not.toBeSelected();
    expect(screen.getByRole('button', { name: '이동 중 0' })).toBeVisible();
  });

  it('passes on the chip that is pressed', async () => {
    const onSelect = jest.fn<void, [string]>();
    await render(<ChipRow chips={CHIPS} onSelect={onSelect} selected="all" />);

    await userEvent.press(screen.getByRole('button', { name: '공강 4' }));

    expect(onSelect).toHaveBeenCalledWith('free');
  });

  it('can hide the chips whose count is 0, except the selected one', async () => {
    await render(<ChipRow chips={CHIPS} hideEmpty onSelect={jest.fn<void, [string]>()} selected="all" />);
    expect(screen.queryByRole('button', { name: '이동 중 0' })).toBeNull();

    await screen.rerender(<ChipRow chips={CHIPS} hideEmpty onSelect={jest.fn<void, [string]>()} selected="moving" />);
    expect(screen.getByRole('button', { name: '이동 중 0' })).toBeSelected();
  });
});
