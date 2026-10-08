import { render, screen, userEvent } from '@testing-library/react-native';

import { AppBar } from '@/design-system/app-bar';
import { Button } from '@/design-system/button';

describe('AppBar', () => {
  it("is a tab's: its title and its actions, with no way out", async () => {
    await render(<AppBar actions={<Button>만들기</Button>} title="파티" />);

    expect(screen.getByRole('header', { name: '파티' })).toHaveStyle({ fontSize: 22 });
    expect(screen.getByRole('button', { name: '만들기' })).toBeVisible();
    expect(screen.queryByRole('button', { name: '뒤로' })).toBeNull();
  });

  it.each([
    ['back', '뒤로'],
    ['close', '닫기'],
  ] as const)("is a sub-screen's with %s: its way out, read as %s, and its title in 20", async (kind, label) => {
    const onPress = jest.fn<void, []>();
    await render(<AppBar leave={{ kind, onPress }} title="프로필 편집" />);

    await userEvent.press(screen.getByRole('button', { name: label }));

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('header', { name: '프로필 편집' })).toHaveStyle({ fontSize: 20 });
  });

  it('says a count after its title', async () => {
    await render(<AppBar count={12} leave={{ kind: 'close', onPress: jest.fn<void, []>() }} title="퀘스트" />);

    expect(screen.getByRole('header', { name: '퀘스트 12' })).toBeVisible();
  });
});
