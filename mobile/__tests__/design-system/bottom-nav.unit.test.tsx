/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-29  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

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

// The middle of the bar (A04 ticket 09): the map's tab, a round button whose name is not drawn. Filled navy while it
// is the current tab and what it raises is up; else white, with a navy ring and icon.
const ROUND_ITEMS = (raised: boolean) =>
  [
    { icon: 'users', label: '파티' },
    { icon: 'mapSpark', label: '지도', round: true, raised },
    { icon: 'user', label: '내 정보' },
  ] as const;

function round(): ReturnType<typeof screen.getByTestId> {
  return screen.getByTestId('bottom-nav-round');
}

describe("BottomNav's round tab", () => {
  it('is a tab, selected while current, and says whether what it raises is up', async () => {
    await render(<BottomNav active={1} items={ROUND_ITEMS(true)} />);

    expect(screen.getByRole('tab', { name: '지도' })).toBeSelected();
    expect(screen.getByRole('tab', { name: '지도' })).toBeExpanded();
    // Its name is what a screen reader says, and is not drawn.
    expect(screen.queryByText('지도')).toBeNull();
  });

  it('says it is lowered on its own tab, and nothing of it on another', async () => {
    const { rerender } = await render(<BottomNav active={1} items={ROUND_ITEMS(false)} />);

    expect(screen.getByRole('tab', { name: '지도' })).toBeCollapsed();

    await rerender(<BottomNav active={0} items={ROUND_ITEMS(true)} />);

    expect(screen.getByRole('tab', { name: '지도' })).not.toBeSelected();
    expect(screen.getByRole('tab', { name: '지도' }).props.accessibilityState).not.toHaveProperty('expanded');
  });

  it('is filled navy while raised on its tab, and white with a navy ring otherwise', async () => {
    const { rerender } = await render(<BottomNav active={1} items={ROUND_ITEMS(true)} line={false} />);

    expect(round()).toHaveStyle({ width: 56, height: 56, backgroundColor: '#001A72' });

    await rerender(<BottomNav active={1} items={ROUND_ITEMS(false)} line={false} />);
    expect(round()).toHaveStyle({ backgroundColor: '#FFFFFF', borderWidth: 3, borderColor: '#001A72' });

    await rerender(<BottomNav active={0} items={ROUND_ITEMS(true)} line={false} />);
    expect(round()).toHaveStyle({ backgroundColor: '#FFFFFF', borderWidth: 3, borderColor: '#001A72' });
    // Inside the bar's 64.
    expect(screen.getByRole('tab', { name: '지도' }).parent).toHaveStyle({ height: 64 });
    expect(round()).not.toHaveStyle({ position: 'absolute' });
  });

  it('passes on its press like any tab', async () => {
    const onSelect = jest.fn<void, [number]>();
    await render(<BottomNav active={1} items={ROUND_ITEMS(true)} onSelect={onSelect} />);

    await userEvent.press(screen.getByRole('tab', { name: '지도' }));

    expect(onSelect).toHaveBeenCalledWith(1);
  });
});

describe("BottomNav's count", () => {
  it('shows 9+ above nine, and says the whole count', async () => {
    await render(<BottomNav active={0} items={[{ icon: 'bell', label: '알림', badge: 12 }]} />);

    expect(screen.getByText('9+')).toBeVisible();
    expect(screen.getByRole('tab', { name: '알림, 새 소식 12개' })).toBeVisible();
  });
});

describe("BottomNav's bar", () => {
  it('has a line on top unless its owner draws the edge', async () => {
    await render(<BottomNav active={0} items={ITEMS} />);

    expect(screen.getByRole('tab', { name: '지도' }).parent).toHaveStyle({ height: 65, borderTopWidth: 1 });
  });
});
