/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { render, screen, userEvent } from '@testing-library/react-native';

import { Chip } from '@/design-system/chip';

describe('Chip', () => {
  it('is a toggle that says whether it is selected', async () => {
    const onPress = jest.fn<void, []>();
    await render(
      <Chip onPress={onPress} selected>
        #보드게임
      </Chip>,
    );

    await userEvent.press(screen.getByRole('button', { name: '#보드게임' }));

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: '#보드게임' })).toBeSelected();
  });

  it('can be removed', async () => {
    const onRemove = jest.fn<void, []>();
    await render(<Chip onRemove={onRemove}>#러닝</Chip>);

    await userEvent.press(screen.getByRole('button', { name: '#러닝 삭제' }));

    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('offers the toggle and the × as two controls', async () => {
    const onPress = jest.fn<void, []>();
    const onRemove = jest.fn<void, []>();
    await render(
      <Chip onPress={onPress} onRemove={onRemove}>
        #밴드
      </Chip>,
    );

    await userEvent.press(screen.getByRole('button', { name: '#밴드 삭제' }));

    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('is plain text when it does nothing', async () => {
    await render(<Chip>#재즈</Chip>);

    expect(screen.getByText('#재즈')).toBeVisible();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
