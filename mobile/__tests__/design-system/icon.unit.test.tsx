/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { render, screen } from '@testing-library/react-native';

import { Icon } from '@/design-system/icon';

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
});
