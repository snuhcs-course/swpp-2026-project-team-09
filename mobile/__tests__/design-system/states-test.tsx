// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
import { render, screen, userEvent } from '@testing-library/react-native';

import { EmptyState, ErrorState, LoadingState } from '@/design-system/states';

describe('the states of a list', () => {
  it('says the caller’s words when there is nothing', async () => {
    await render(<EmptyState words="결과 없음" />);

    expect(screen.getByText('결과 없음')).toBeVisible();
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
