// AI-generated with Claude Opus 5.5, 2026-10-05, prompted by AhnJinYoung, reviewed by Jaehyun0320 in #50
import { render, screen, userEvent } from '@testing-library/react-native';

import { TextField } from '@/design-system/text-field';

describe('TextField', () => {
  it('passes on what is typed', async () => {
    const onChangeText = jest.fn<void, [string]>();
    await render(<TextField label="이름" onChangeText={onChangeText} placeholder="예: 홍길동" value="" />);

    await userEvent.type(screen.getByLabelText('이름'), '김');

    expect(onChangeText).toHaveBeenLastCalledWith('김');
  });

  it('shows the error in place of the helper', async () => {
    await render(<TextField error="30자까지 쓸 수 있어요" helper="친구에게 보이는 이름이에요" label="이름" value="" />);

    expect(screen.getByText('30자까지 쓸 수 있어요')).toBeVisible();
    expect(screen.queryByText('친구에게 보이는 이름이에요')).toBeNull();
  });

  it('takes no text while it is disabled', async () => {
    const onChangeText = jest.fn<void, [string]>();
    await render(<TextField disabled label="이름" onChangeText={onChangeText} value="홍길동" />);

    await userEvent.type(screen.getByLabelText('이름'), '김');

    expect(onChangeText).not.toHaveBeenCalled();
  });
});
