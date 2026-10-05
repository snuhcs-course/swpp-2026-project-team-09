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

describe("BottomNav's action", () => {
  it('is in the middle, is pressed like a tab, is never the current one and shows no name', async () => {
    const onSelect = jest.fn<void, [number]>();
    await render(
      <BottomNav
        active={0}
        items={[
          { icon: 'map', label: '지도' },
          { icon: 'plus', label: '올리기', action: true },
          { icon: 'user', label: '내 정보' },
        ]}
        onSelect={onSelect}
      />,
    );

    await userEvent.press(screen.getByRole('button', { name: '올리기' }));

    expect(onSelect).toHaveBeenCalledWith(1);
    expect(screen.queryByRole('tab', { name: '올리기' })).toBeNull();
    // Its name is what a screen reader says, and is not drawn.
    expect(screen.queryByText('올리기')).toBeNull();
    expect(screen.getByText('지도')).toBeVisible();
  });

  it('draws the action inside the bar: nothing of it is placed out of its slot', async () => {
    await render(<BottomNav active={0} items={[{ icon: 'plus', label: '올리기', action: true }]} line={false} />);

    expect(screen.getByRole('button', { name: '올리기' }).parent).toHaveStyle({ height: 64 });
    expect(screen.getByRole('button', { name: '올리기' }).children).toHaveLength(1);
    expect(screen.getByRole('button', { name: '올리기' }).children[0]).toHaveStyle({ width: 44, height: 44 });
    expect(screen.getByRole('button', { name: '올리기' }).children[0]).not.toHaveStyle({ position: 'absolute' });
  });
});

describe("BottomNav's bar", () => {
  it('has a line on top unless its owner draws the edge', async () => {
    await render(<BottomNav active={0} items={ITEMS} />);

    expect(screen.getByRole('tab', { name: '지도' }).parent).toHaveStyle({ height: 65, borderTopWidth: 1 });
  });
});
