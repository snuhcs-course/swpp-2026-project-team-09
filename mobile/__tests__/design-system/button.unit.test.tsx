/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { render, screen, userEvent } from '@testing-library/react-native';

import { Button } from '@/design-system/button';

describe('Button', () => {
  it('acts when it is pressed', async () => {
    const onPress = jest.fn<void, []>();
    await render(<Button onPress={onPress}>참여하기</Button>);

    await userEvent.press(screen.getByRole('button', { name: '참여하기' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does nothing while it is disabled', async () => {
    const onPress = jest.fn<void, []>();
    await render(
      <Button disabled onPress={onPress}>
        참여하기
      </Button>,
    );

    await userEvent.press(screen.getByRole('button', { name: '참여하기' }));

    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '참여하기' })).toBeDisabled();
  });
});
