/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-22  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { render, screen, userEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { hideKeyboard, KEYBOARD, showKeyboard } from '../support/keyboard';

import { Button } from '@/design-system/button';
import { FullScreenPanel } from '@/design-system/full-screen-panel';

async function renderForm(footerHidesForKeyboard = false): Promise<void> {
  await render(
    <FullScreenPanel
      footer={
        <Button full size="lg">
          저장
        </Button>
      }
      footerHidesForKeyboard={footerHidesForKeyboard}
      leave={{ kind: 'back', onPress: jest.fn<void, []>() }}
      title="파티 만들기"
    >
      <Text>제목</Text>
    </FullScreenPanel>,
  );
}

describe('FullScreenPanel', () => {
  it('has an app bar with its way out, what stays under it, the body and the footer', async () => {
    const onClose = jest.fn<void, []>();
    await render(
      <FullScreenPanel
        footer={
          <Button full size="lg">
            저장
          </Button>
        }
        leave={{ kind: 'back', onPress: onClose }}
        title="프로필 편집"
        under={<Text>기본 정보</Text>}
      >
        <Text>이름</Text>
      </FullScreenPanel>,
    );

    expect(screen.getByRole('header', { name: '프로필 편집' })).toBeVisible();
    expect(screen.getByText('기본 정보')).toBeVisible();
    expect(screen.getByText('이름')).toBeVisible();
    expect(screen.getByRole('button', { name: '저장' })).toBeVisible();
    await userEvent.press(screen.getByRole('button', { name: '뒤로' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ends at the keyboard while it is up, its footer right above it, and comes back down with it', async () => {
    await renderForm();

    await showKeyboard(KEYBOARD);
    expect(screen.getByTestId('full-screen-panel')).toHaveStyle({ paddingBottom: KEYBOARD });
    expect(screen.getByRole('button', { name: '저장' })).toBeVisible();

    await hideKeyboard();
    expect(screen.getByTestId('full-screen-panel')).toHaveStyle({ paddingBottom: 0 });
    expect(screen.getByRole('button', { name: '저장' })).toBeVisible();
  });

  it('puts away a footer nobody needs while typing, until the keyboard goes down', async () => {
    await renderForm(true);

    await showKeyboard(KEYBOARD);
    expect(screen.queryByRole('button', { name: '저장' })).toBeNull();

    await hideKeyboard();
    expect(screen.getByRole('button', { name: '저장' })).toBeVisible();
  });
});

describe('FullScreenPanel on glass', () => {
  it('lies on the glass panel, with no white of its own, when it is shown over the map', async () => {
    await render(
      <FullScreenPanel glass leave={{ kind: 'close', onPress: jest.fn<void, []>() }} title="퀘스트">
        <Text>자료구조</Text>
      </FullScreenPanel>,
    );

    // Without Liquid Glass, as on Android, the screen is white at 85% (A04-08).
    expect(screen.getByTestId('full-screen-panel')).toHaveStyle({ backgroundColor: 'rgba(255, 255, 255, 0.85)' });
    expect(screen.getByText('자료구조')).toBeVisible();
  });
});
