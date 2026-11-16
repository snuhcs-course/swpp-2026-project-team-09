/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-22  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-16  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { hideKeyboard, KEYBOARD, showKeyboard } from '../support/keyboard';

import { Button } from '@/design-system/button';
import { ToastProvider, useNotReadyToast, useToast, useToastAbove } from '@/design-system/toast';

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
      <Button
        onPress={() => {
          showToast('서지우님은 위치가 꺼져 있어요', 2000);
        }}
      >
        친구
      </Button>
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

describe("Toast's time", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('is 2.4 seconds unless the caller gives another', async () => {
    await renderButtons();

    await fireEvent.press(screen.getByRole('button', { name: '추가' }));
    await act(() => {
      jest.advanceTimersByTime(2399);
    });
    expect(screen.getByText('수업을 추가했어요')).toBeVisible();
    await act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(screen.queryByText('수업을 추가했어요')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: '친구' }));
    await act(() => {
      jest.advanceTimersByTime(1999);
    });
    expect(screen.getByText('서지우님은 위치가 꺼져 있어요')).toBeVisible();
    await act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(screen.queryByText('서지우님은 위치가 꺼져 있어요')).toBeNull();
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

function LinkButton({ onLink }: { onLink: () => void }): ReactElement {
  const showToast = useToast();
  return (
    <Button
      onPress={() => {
        showToast('참여를 신청했어요', undefined, undefined, { label: '보낸 신청 보기', onPress: onLink });
      }}
    >
      신청
    </Button>
  );
}

describe('a toast with a link', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows the link beside its words, and a press follows it and closes the toast', async () => {
    const onLink = jest.fn<undefined, []>();
    await render(
      <ToastProvider>
        <LinkButton onLink={onLink} />
      </ToastProvider>,
    );

    await fireEvent.press(screen.getByRole('button', { name: '신청' }));
    expect(screen.getByText('참여를 신청했어요')).toBeVisible();
    await fireEvent.press(screen.getByRole('button', { name: '보낸 신청 보기' }));

    expect(onLink).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('참여를 신청했어요')).toBeNull();
  });
});

describe("a toast with a link's time", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('stays 4 seconds, long enough to reach the link', async () => {
    await render(
      <ToastProvider>
        <LinkButton onLink={jest.fn<undefined, []>()} />
      </ToastProvider>,
    );

    await fireEvent.press(screen.getByRole('button', { name: '신청' }));
    await act(() => {
      jest.advanceTimersByTime(3999);
    });
    expect(screen.getByRole('button', { name: '보낸 신청 보기' })).toBeVisible();
    await act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(screen.queryByRole('button', { name: '보낸 신청 보기' })).toBeNull();
  });

  it('has no link unless the caller gives one', async () => {
    await renderButtons();

    await fireEvent.press(screen.getByRole('button', { name: '추가' }));

    expect(within(screen.getByTestId('toast-layer')).queryByRole('button')).toBeNull();
  });
});

function ScreenWithNavigation(): ReactElement {
  useToastAbove(65);
  return <Buttons />;
}

describe("Toast's place", () => {
  it('is just above the bottom of a screen with nothing fixed there', async () => {
    await renderButtons();

    await fireEvent.press(screen.getByRole('button', { name: '추가' }));

    // A bar from 16 to 16 from the sides.
    expect(screen.getByTestId('toast-layer')).toHaveStyle({ bottom: 24, left: 16, right: 16 });
  });

  it("is above the bottom navigation and the phone's own bar on a screen that has them", async () => {
    await render(
      <SafeAreaInsetsContext value={{ top: 0, right: 0, bottom: 34, left: 0 }}>
        <ToastProvider>
          <ScreenWithNavigation />
        </ToastProvider>
      </SafeAreaInsetsContext>,
    );

    await fireEvent.press(screen.getByRole('button', { name: '추가' }));

    expect(screen.getByTestId('toast-layer')).toHaveStyle({ bottom: 34 + 65 + 24 });
  });

  it('stands on the keyboard while it is up, still clear of what is claimed, and comes back down with it', async () => {
    await render(
      <SafeAreaInsetsContext value={{ top: 0, right: 0, bottom: 34, left: 0 }}>
        <ToastProvider>
          <ScreenWithNavigation />
        </ToastProvider>
      </SafeAreaInsetsContext>,
    );
    await fireEvent.press(screen.getByRole('button', { name: '추가' }));

    await showKeyboard(KEYBOARD);
    expect(screen.getByTestId('toast-layer')).toHaveStyle({ bottom: KEYBOARD + 65 + 24 });

    await hideKeyboard();
    expect(screen.getByTestId('toast-layer')).toHaveStyle({ bottom: 34 + 65 + 24 });
  });
});

function Tab({ height, inFront }: { height: number; inFront: boolean }): ReactElement {
  useToastAbove(height, inFront);
  return <></>;
}

function tabs(front: 'map' | 'other'): ReactElement {
  return (
    <ToastProvider>
      <Tab height={134} inFront={front === 'map'} />
      <Tab height={72} inFront={front === 'other'} />
      <Buttons />
    </ToastProvider>
  );
}

describe("Toast's place among screens that stay mounted", () => {
  it('follows the screen in front, and not one behind it', async () => {
    await render(tabs('map'));
    await fireEvent.press(screen.getByRole('button', { name: '추가' }));
    expect(screen.getByTestId('toast-layer')).toHaveStyle({ bottom: 134 + 24 });

    await screen.rerender(tabs('other'));
    expect(screen.getByTestId('toast-layer')).toHaveStyle({ bottom: 72 + 24 });

    await screen.rerender(tabs('map'));
    expect(screen.getByTestId('toast-layer')).toHaveStyle({ bottom: 134 + 24 });
  });
});
