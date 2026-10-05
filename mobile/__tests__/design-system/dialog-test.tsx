import { render, screen, userEvent } from '@testing-library/react-native';

import { Dialog } from '@/design-system/dialog';

describe('Dialog', () => {
  it('asks its question and passes on each answer', async () => {
    const onConfirm = jest.fn<void, []>();
    const onCancel = jest.fn<void, []>();
    await render(
      <Dialog
        body="지도에 내 아바타를 보여 주려면 위치 권한이 필요해요."
        cancelLabel="나중에"
        confirmLabel="계속"
        onCancel={onCancel}
        onConfirm={onConfirm}
        title="내 위치를 지도에 표시할까요?"
        visible
      />,
    );

    expect(screen.getByRole('header', { name: '내 위치를 지도에 표시할까요?' })).toBeVisible();
    expect(screen.getByText('지도에 내 아바타를 보여 주려면 위치 권한이 필요해요.')).toBeVisible();

    await userEvent.press(screen.getByRole('button', { name: '계속' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();

    await userEvent.press(screen.getByRole('button', { name: '나중에' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('shows nothing while it is closed', async () => {
    await render(<Dialog confirmLabel="확인" title="다른 기기에서 로그인했어요" visible={false} />);

    expect(screen.queryByText('다른 기기에서 로그인했어요')).toBeNull();
  });

  it('has one button when there is nothing to choose', async () => {
    await render(<Dialog confirmLabel="확인" title="다른 기기에서 로그인했어요" visible />);

    expect(screen.getAllByRole('button')).toHaveLength(1);
  });
});
