import { render, screen, userEvent, waitFor } from '@testing-library/react-native';

import CatalogueScreen from '@/app/catalogue';
import { ToastProvider } from '@/design-system';

async function renderCatalogue(): Promise<void> {
  await render(
    <ToastProvider>
      <CatalogueScreen />
    </ToastProvider>,
  );
}

describe('design system catalogue', () => {
  it('shows every shared component under its name', async () => {
    await renderCatalogue();

    for (const name of [
      'Icon',
      'Button',
      'Chip',
      'Badge',
      'Avatar',
      'MapPin',
      'EventCard',
      'TextField',
      'ChatInput',
      'BottomNav',
      'Dialog',
      'Toast',
      'AppBar',
      'FullScreenPanel',
      'SidePanel · BottomSheet',
      'SegmentedTabs · ChipRow · SearchField',
      'ListRow · SectionHeader · SwitchRow',
      'EmptyState · LoadingState · ErrorState',
    ]) {
      expect(screen.getByRole('header', { name })).toBeOnTheScreen();
    }
  });

  it('lets a developer try the controls', async () => {
    await renderCatalogue();

    await userEvent.press(screen.getByRole('button', { name: '질문 열기' }));
    expect(screen.getByRole('header', { name: '내 위치를 지도에 표시할까요?' })).toBeVisible();
    await userEvent.press(screen.getByRole('button', { name: '나중에' }));
    expect(screen.queryByRole('header', { name: '내 위치를 지도에 표시할까요?' })).toBeNull();

    await userEvent.press(screen.getByRole('button', { name: '준비 중 알림' }));
    expect(screen.getByText('준비 중이에요')).toBeVisible();

    await userEvent.press(screen.getByRole('button', { name: '2초 알림' }));
    expect(screen.getByText('서지우님은 위치가 꺼져 있어요')).toBeVisible();
  });
});

describe("design system catalogue's panels", () => {
  it('lets a developer open and close a side panel', async () => {
    await renderCatalogue();

    await userEvent.press(screen.getByRole('button', { name: '패널 열기' }));
    expect(screen.getByRole('header', { name: '친구 12' })).toBeVisible();
    await userEvent.press(screen.getByRole('button', { name: '친구 패널 닫기' }));
    // It slides out first.
    await waitFor(() => {
      expect(screen.queryByRole('header', { name: '친구 12' })).toBeNull();
    });
  });
});
