import { render, screen, userEvent } from '@testing-library/react-native';

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
      'ChatBubble',
      'ActionConfirm',
      'TextField',
      'ChatInput',
      'Switch',
      'BottomNav',
      'BottomSheet',
      'Toast',
    ]) {
      expect(screen.getByRole('header', { name })).toBeOnTheScreen();
    }
  });

  it('lets a developer try the controls', async () => {
    await renderCatalogue();

    await userEvent.press(screen.getByRole('switch', { name: '친구와 위치 공유' }));
    expect(screen.getByRole('switch', { name: '친구와 위치 공유' })).toBeChecked();

    await userEvent.press(screen.getByRole('button', { name: '준비 중 알림' }));
    expect(screen.getByText('준비 중이에요')).toBeVisible();
  });
});
