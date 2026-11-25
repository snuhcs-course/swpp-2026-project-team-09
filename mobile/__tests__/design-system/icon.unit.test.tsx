/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-25  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { render, screen } from '@testing-library/react-native';

import { Icon, ICON_NAMES } from '@/design-system/icon';

describe('Icon', () => {
  it('is read by its label when it stands alone', async () => {
    await render(<Icon label="시간" name="clock" />);

    expect(screen.getByLabelText('시간')).toBeVisible();
  });

  it('is hidden from a screen reader without a label', async () => {
    await render(<Icon name="clock" testID="icon" />);

    expect(screen.queryByTestId('icon')).toBeNull();
    expect(screen.getByTestId('icon', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  // The 파티 member row's 친구 추가 and 내보내기, which the catalogue lists with every other name.
  it.each(['usersPlus', 'userMinus'] as const)('has %s', async (name) => {
    await render(<Icon label={name} name={name} />);

    expect(ICON_NAMES).toContain(name);
    expect(screen.getByLabelText(name)).toBeVisible();
  });
});
