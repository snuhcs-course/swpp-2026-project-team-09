/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { render, screen } from '@testing-library/react-native';
import { StyleSheet, type ViewStyle } from 'react-native';

import { WaitingDots } from '@/design-system/waiting-dots';

// The phone does not ask for less motion unless a test says so.
let mockMotion = true;

jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => !mockMotion,
  useMotionAllowed: (): boolean => mockMotion,
  useReduceMotionSetting: (): boolean => !mockMotion,
}));

beforeEach(() => {
  mockMotion = true;
});

function opacities(): unknown[] {
  return screen.getAllByTestId('waiting-dot', { includeHiddenElements: true }).map((dot) => {
    const style: unknown = dot.props.style;
    return StyleSheet.flatten<ViewStyle>(Array.isArray(style) ? style : [style]).opacity;
  });
}

describe('WaitingDots', () => {
  it('is read aloud as the words it stands for', async () => {
    await render(<WaitingDots label="보는 중" />);

    expect(screen.getByLabelText('보는 중')).toBeVisible();
    expect(screen.queryByText('보는 중')).toBeNull();
  });

  it('draws three dots whose opacity moves', async () => {
    await render(<WaitingDots label="보는 중" />);

    expect(opacities()).toEqual([expect.any(Number), expect.any(Number), expect.any(Number)]);
  });

  it('keeps the three dots still while the phone asks for less motion', async () => {
    mockMotion = false;

    await render(<WaitingDots label="보는 중" />);

    expect(opacities()).toEqual([undefined, undefined, undefined]);
  });
});
