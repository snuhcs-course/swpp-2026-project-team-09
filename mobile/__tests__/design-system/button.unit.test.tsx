/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-17  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by TaeHyun79
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

  it('shows the dots in place of its label while busy, and takes no press', async () => {
    const onPress = jest.fn<void, []>();
    await render(
      <Button busy onPress={onPress}>
        여기서 먹기
      </Button>,
    );

    expect(screen.queryByText('여기서 먹기')).toBeNull();
    expect(screen.getByLabelText('여기서 먹기 · 보는 중')).toBeVisible();
    await userEvent.press(screen.getByLabelText('여기서 먹기 · 보는 중'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('is an icon alone, read by its label, when it has no words', async () => {
    const onPress = jest.fn<void, []>();
    await render(<Button icon="crown" label="김민준님에게 파티장 넘기기" onPress={onPress} variant="secondary" />);

    const button = screen.getByRole('button', { name: '김민준님에게 파티장 넘기기' });
    expect(button).toHaveTextContent(/^$/u);
    await userEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
