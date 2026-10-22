/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-22  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { holdBackButton } from '../support/back';
import { hideKeyboard, KEYBOARD, showKeyboard } from '../support/keyboard';

import { BottomSheet } from '@/design-system/bottom-sheet';

jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

afterEach(() => {
  jest.restoreAllMocks();
});

async function renderSheet(onClose: () => void): Promise<void> {
  await render(
    <BottomSheet label="AI 매칭" onClose={onClose} open>
      <Text>인원</Text>
    </BottomSheet>,
  );
}

async function dragHandle(from: number, to: number): Promise<void> {
  const handle = screen.getByTestId('sheet-handle');
  await fireEvent(handle, 'touchStart', { nativeEvent: { pageY: from } });
  await fireEvent(handle, 'touchEnd', { nativeEvent: { pageY: to } });
}

describe('BottomSheet', () => {
  it('shows what it holds while it is open', async () => {
    await renderSheet(jest.fn<void, []>());

    expect(screen.getByText('인원')).toBeVisible();
  });

  it('is closed by a press on the scrim', async () => {
    const onClose = jest.fn<void, []>();
    await renderSheet(onClose);

    await userEvent.press(screen.getByRole('button', { name: 'AI 매칭 닫기' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("is closed by Android's back button", async () => {
    const pressBack = holdBackButton();
    const onClose = jest.fn<void, []>();
    await renderSheet(onClose);

    expect(await pressBack()).toBe(true);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('is closed by a drag down from its handle, and not by a short one', async () => {
    const onClose = jest.fn<void, []>();
    await renderSheet(onClose);

    await dragHandle(500, 520);
    expect(onClose).not.toHaveBeenCalled();

    await dragHandle(500, 560);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('stands on the keyboard while it is up, and goes back down with it', async () => {
    await renderSheet(jest.fn<void, []>());

    await showKeyboard(KEYBOARD);
    expect(screen.getByTestId('sheet-room')).toHaveStyle({ bottom: KEYBOARD });
    expect(screen.getByText('인원')).toBeVisible();

    await hideKeyboard();
    expect(screen.getByTestId('sheet-room')).toHaveStyle({ bottom: 0 });
  });
});
