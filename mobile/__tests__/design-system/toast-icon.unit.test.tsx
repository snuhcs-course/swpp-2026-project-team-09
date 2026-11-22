/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { Button } from '@/design-system/button';
import { ToastProvider, useToast } from '@/design-system/toast';

function Buttons(): ReactElement {
  const showToast = useToast();
  return (
    <>
      <Button
        onPress={() => {
          showToast('파티에 참여했어요');
        }}
      >
        수락
      </Button>
      <Button
        onPress={() => {
          showToast('이미 끝난 파티예요', undefined, 'alert');
        }}
      >
        거절된 수락
      </Button>
    </>
  );
}

describe("Toast's icon", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('is the check mark unless the caller gives another, such as the alert of a failure', async () => {
    await render(
      <ToastProvider>
        <Buttons />
      </ToastProvider>,
    );

    await fireEvent.press(screen.getByRole('button', { name: '수락' }));
    expect(screen.getByTestId('toast-icon-check', { includeHiddenElements: true })).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: '거절된 수락' }));
    expect(screen.getByTestId('toast-icon-alert', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.queryByTestId('toast-icon-check', { includeHiddenElements: true })).toBeNull();
  });
});
