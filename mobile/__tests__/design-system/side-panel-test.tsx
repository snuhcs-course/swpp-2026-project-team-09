// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
import { render, screen, userEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { holdBackButton } from '../support/back';

import { SidePanel } from '@/design-system/side-panel';

jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

afterEach(() => {
  jest.restoreAllMocks();
});

describe('SidePanel', () => {
  it('shows what it holds while it is open, and nothing while it is closed', async () => {
    await render(
      <SidePanel label="친구" onClose={jest.fn<void, []>()} open>
        <Text>김민준</Text>
      </SidePanel>,
    );
    expect(screen.getByText('김민준')).toBeVisible();

    await screen.rerender(
      <SidePanel label="친구" onClose={jest.fn<void, []>()} open={false}>
        <Text>김민준</Text>
      </SidePanel>,
    );
    expect(screen.queryByText('김민준')).toBeNull();
  });

  it('is closed by a press on the scrim, read with its name', async () => {
    const onClose = jest.fn<void, []>();
    await render(
      <SidePanel label="친구" onClose={onClose} open>
        <Text>김민준</Text>
      </SidePanel>,
    );

    await userEvent.press(screen.getByRole('button', { name: '친구 패널 닫기' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("is closed by Android's back button, which goes no further", async () => {
    const pressBack = holdBackButton();
    const onClose = jest.fn<void, []>();
    await render(
      <SidePanel label="친구" onClose={onClose} open>
        <Text>김민준</Text>
      </SidePanel>,
    );

    expect(await pressBack()).toBe(true);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
