/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { render, screen, userEvent } from '@testing-library/react-native';

import { SegmentedTabs } from '@/design-system/segmented-tabs';

const SEGMENTS = [
  { key: 'find', label: '찾기' },
  { key: 'mine', label: '내 파티', count: 2 },
  { key: 'invites', label: '초대', count: 1, alert: true },
] as const;

describe('SegmentedTabs', () => {
  it('says which tab is selected, with the counts after the names', async () => {
    await render(<SegmentedTabs onSelect={jest.fn<void, [string]>()} segments={SEGMENTS} selected="find" />);

    expect(screen.getByRole('tab', { name: '찾기' })).toBeSelected();
    expect(screen.getByRole('tab', { name: '내 파티 2' })).not.toBeSelected();
    expect(screen.getByRole('tab', { name: '초대 1' })).not.toBeSelected();
  });

  it('passes on the tab that is pressed', async () => {
    const onSelect = jest.fn<void, [string]>();
    await render(<SegmentedTabs onSelect={onSelect} segments={SEGMENTS} selected="find" />);

    await userEvent.press(screen.getByRole('tab', { name: '초대 1' }));

    expect(onSelect).toHaveBeenCalledWith('invites');
  });

  it('shows no count of 0', async () => {
    await render(
      <SegmentedTabs
        onSelect={jest.fn<void, [string]>()}
        segments={[{ key: 'mine', label: '내 파티', count: 0 }]}
        selected="mine"
      />,
    );

    expect(screen.getByRole('tab', { name: '내 파티' })).toBeSelected();
  });
});
