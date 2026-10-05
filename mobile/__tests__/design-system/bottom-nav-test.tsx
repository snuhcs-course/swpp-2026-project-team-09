import { render, screen, userEvent } from '@testing-library/react-native';

import { BottomNav } from '@/design-system/bottom-nav';

const ITEMS = [
  { icon: 'map', label: '지도' },
  { icon: 'users', label: '파티', badge: 2 },
  { icon: 'user', label: '내 정보' },
] as const;

describe('BottomNav', () => {
  it('says which tab is the current one', async () => {
    await render(<BottomNav active={0} items={ITEMS} />);

    expect(screen.getByRole('tab', { name: '지도' })).toBeSelected();
    expect(screen.getByRole('tab', { name: '내 정보' })).not.toBeSelected();
  });

  it('passes on the tab that was pressed', async () => {
    const onSelect = jest.fn<void, [number]>();
    await render(<BottomNav active={0} items={ITEMS} onSelect={onSelect} />);

    await userEvent.press(screen.getByRole('tab', { name: '내 정보' }));

    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it("shows a tab's count", async () => {
    await render(<BottomNav active={0} items={ITEMS} />);

    expect(screen.getByText('2')).toBeVisible();
    expect(screen.getByRole('tab', { name: '파티, 새 소식 2개' })).toBeVisible();
  });
});
