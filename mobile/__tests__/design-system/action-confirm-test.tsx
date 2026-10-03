import { render, screen, userEvent } from '@testing-library/react-native';

import { ActionConfirm } from '@/design-system/action-confirm';

describe('ActionConfirm', () => {
  it('shows what will happen and waits for the User', async () => {
    const onConfirm = jest.fn<void, []>();
    const onCancel = jest.fn<void, []>();
    await render(
      <ActionConfirm
        cancelLabel="취소"
        confirmLabel="켜기"
        note="캠퍼스 밖에서는 아무에게도 보이지 않아요"
        onCancel={onCancel}
        onConfirm={onConfirm}
        rows={[{ label: '대상', value: '친구 12명' }]}
        title="위치 공유를 켤까요?"
      />,
    );

    expect(screen.getByText('위치 공유를 켤까요?')).toBeVisible();
    expect(screen.getByText('대상')).toBeVisible();
    expect(screen.getByText('친구 12명')).toBeVisible();
    expect(screen.getByText('캠퍼스 밖에서는 아무에게도 보이지 않아요')).toBeVisible();

    await userEvent.press(screen.getByRole('button', { name: '켜기' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();

    await userEvent.press(screen.getByRole('button', { name: '취소' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('offers 수정 and 확인 unless told otherwise', async () => {
    await render(<ActionConfirm rows={[]} title="파티에 참여할까요?" />);

    expect(screen.getByRole('button', { name: '수정' })).toBeVisible();
    expect(screen.getByRole('button', { name: '확인' })).toBeVisible();
  });
});
