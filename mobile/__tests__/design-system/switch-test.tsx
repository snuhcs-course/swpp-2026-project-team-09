import { render, screen, userEvent } from '@testing-library/react-native';

import { Switch } from '@/design-system/switch';

describe('Switch', () => {
  it('asks to be turned on when it is pressed while off', async () => {
    const onChange = jest.fn<void, [boolean]>();
    await render(
      <Switch
        checked={false}
        description="친구 12명이 내 위치를 볼 수 있어요"
        label="친구와 위치 공유"
        onChange={onChange}
      />,
    );

    expect(screen.getByText('친구 12명이 내 위치를 볼 수 있어요')).toBeVisible();
    expect(screen.getByRole('switch', { name: '친구와 위치 공유' })).not.toBeChecked();

    await userEvent.press(screen.getByRole('switch', { name: '친구와 위치 공유' }));

    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('asks to be turned off when it is pressed while on', async () => {
    const onChange = jest.fn<void, [boolean]>();
    await render(<Switch checked label="친구와 위치 공유" onChange={onChange} />);

    expect(screen.getByRole('switch', { name: '친구와 위치 공유' })).toBeChecked();

    await userEvent.press(screen.getByRole('switch', { name: '친구와 위치 공유' }));

    expect(onChange).toHaveBeenCalledWith(false);
  });
});
