/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { render, screen, userEvent } from '@testing-library/react-native';

import { AppBar, IconButton } from '@/design-system/app-bar';
import { Button } from '@/design-system/button';
import { font } from '@/design-system/tokens';

describe('AppBar', () => {
  it("is a tab's: its title and its actions, with no way out", async () => {
    await render(<AppBar actions={<Button>만들기</Button>} title="파티" />);

    expect(screen.getByRole('header', { name: '파티' })).toBeVisible();
    expect(screen.getByRole('button', { name: '만들기' })).toBeVisible();
    expect(screen.queryByRole('button', { name: '뒤로' })).toBeNull();
  });

  // P06 ticket 17: the title larger and 7 from its line.
  it("sets a tab's title in 25 Bold, in a row 50 high with 4 on top, and keeps its icon buttons 48", async () => {
    await render(
      <AppBar actions={<IconButton icon="bell" label="알림" onPress={jest.fn<void, []>()} />} title="내 정보" />,
    );

    const title = screen.getByRole('header', { name: '내 정보' });
    expect(title).toHaveStyle({ fontFamily: font.bold, fontSize: 25, lineHeight: 32, letterSpacing: -0.4 });
    expect(title.parent).toHaveStyle({ height: 50, paddingTop: 4, alignItems: 'center' });
    expect(screen.getByRole('button', { name: '알림' })).toHaveStyle({ width: 48, height: 48 });
  });

  it.each([
    ['back', '뒤로'],
    ['close', '닫기'],
  ] as const)("is a sub-screen's with %s: its way out, read as %s, and its title in 20", async (kind, label) => {
    const onPress = jest.fn<void, []>();
    await render(<AppBar leave={{ kind, onPress }} title="프로필 편집" />);

    await userEvent.press(screen.getByRole('button', { name: label }));

    expect(onPress).toHaveBeenCalledTimes(1);
    const title = screen.getByRole('header', { name: '프로필 편집' });
    expect(title).toHaveStyle({ fontFamily: font.bold, fontSize: 20, lineHeight: 28 });
    expect(title.parent).toHaveStyle({ height: 56 });
    expect(title.parent).not.toHaveStyle({ paddingTop: 4 });
  });

  it('says a count after its title', async () => {
    await render(<AppBar count={12} leave={{ kind: 'close', onPress: jest.fn<void, []>() }} title="퀘스트" />);

    expect(screen.getByRole('header', { name: '퀘스트 12' })).toBeVisible();
  });
});
