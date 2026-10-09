// AI-generated with Claude Opus 5.5 and Fable 5.1, 2026-10-05 to 2026-10-08, prompted by AhnJinYoung and fyoon46, reviewed by Jaehyun0320 in #50
import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';

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

describe('Dialog, confirming what cannot be taken back', () => {
  it('fills its answer in red', async () => {
    await render(<Dialog cancelLabel="취소" confirmLabel="로그아웃" title="로그아웃할까요?" tone="danger" visible />);

    expect(screen.getByRole('button', { name: '로그아웃' })).toHaveStyle({ backgroundColor: '#C42B2B' });
    expect(screen.getByRole('header', { name: '로그아웃할까요?' })).toHaveStyle({ fontSize: 18 });
  });

  it("is closed by Android's back button as by its cancel", async () => {
    const onCancel = jest.fn<void, []>();
    await render(
      <Dialog cancelLabel="취소" confirmLabel="로그아웃" onCancel={onCancel} title="로그아웃할까요?" visible />,
    );

    // The Modal around the dialog takes Android's back button.
    let modal = screen.getByRole('header', { name: '로그아웃할까요?' }).parent;
    while (modal !== null && modal.props.onRequestClose === undefined) {
      modal = modal.parent;
    }
    if (modal === null) {
      throw new Error('The dialog stands in no Modal');
    }
    await fireEvent(modal, 'requestClose');

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
