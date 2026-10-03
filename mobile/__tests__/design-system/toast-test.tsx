import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { Button } from '@/design-system/button';
import { ToastProvider, useNotReadyToast, useToast } from '@/design-system/toast';

function Buttons(): ReactElement {
  const showToast = useToast();
  const showNotReady = useNotReadyToast();
  return (
    <>
      <Button
        onPress={() => {
          showToast('수업을 추가했어요');
        }}
      >
        추가
      </Button>
      <Button onPress={showNotReady}>파티</Button>
    </>
  );
}

async function renderButtons(): Promise<void> {
  await render(
    <ToastProvider>
      <Buttons />
    </ToastProvider>,
  );
}

describe('Toast', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows its words for a moment', async () => {
    await renderButtons();

    await fireEvent.press(screen.getByRole('button', { name: '추가' }));

    await act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(screen.getByText('수업을 추가했어요')).toBeVisible();

    await act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.queryByText('수업을 추가했어요')).toBeNull();
  });
});

describe('Toast, one at a time', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('says that a feature is not ready', async () => {
    await renderButtons();

    await fireEvent.press(screen.getByRole('button', { name: '파티' }));

    expect(screen.getByText('준비 중이에요')).toBeVisible();
  });

  it('starts its time again when the same words are shown again', async () => {
    await renderButtons();

    await fireEvent.press(screen.getByRole('button', { name: '추가' }));
    await act(() => {
      jest.advanceTimersByTime(2000);
    });
    await fireEvent.press(screen.getByRole('button', { name: '추가' }));
    await act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(screen.getByText('수업을 추가했어요')).toBeVisible();
  });

  it('replaces the toast before it with the new one', async () => {
    await renderButtons();

    await fireEvent.press(screen.getByRole('button', { name: '추가' }));
    await fireEvent.press(screen.getByRole('button', { name: '파티' }));

    expect(screen.queryByText('수업을 추가했어요')).toBeNull();
    expect(screen.getByText('준비 중이에요')).toBeVisible();
  });
});
