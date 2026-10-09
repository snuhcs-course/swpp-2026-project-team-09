// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
import { render, screen, userEvent } from '@testing-library/react-native';
import { Text } from 'react-native';

import { Button } from '@/design-system/button';
import { FullScreenPanel } from '@/design-system/full-screen-panel';

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
});
