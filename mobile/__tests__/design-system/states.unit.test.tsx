/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { render, screen, userEvent } from '@testing-library/react-native';

import { EmptyState, ErrorState, LoadingState } from '@/design-system/states';

describe('the states of a list', () => {
  it('says the caller’s words when there is nothing', async () => {
    await render(<EmptyState words="결과 없음" />);

    expect(screen.getByText('결과 없음')).toBeVisible();
  });

  it('offers one first action under its words when the caller gives one', async () => {
    const onPress = jest.fn<void, []>();
    await render(
      <EmptyState action={{ label: '파티 찾기', onPress }} words="여기서는 참여 중인 파티를 볼 수 있어요" />,
    );

    expect(screen.getByText('여기서는 참여 중인 파티를 볼 수 있어요')).toBeVisible();
    await userEvent.press(screen.getByRole('button', { name: '파티 찾기' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('has no button without an action', async () => {
    await render(<EmptyState words="결과 없음" />);

    expect(screen.queryByRole('button')).toBeNull();
  });

  it('is read as loading while the data is on its way', async () => {
    await render(<LoadingState />);

    expect(screen.getByLabelText('불러오는 중')).toBeVisible();
  });

  it('says that the data did not come and asks again', async () => {
    const onRetry = jest.fn<void, []>();
    await render(<ErrorState onRetry={onRetry} />);

    expect(screen.getByText('불러오지 못했어요')).toBeVisible();
    await userEvent.press(screen.getByRole('button', { name: '다시 시도' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
