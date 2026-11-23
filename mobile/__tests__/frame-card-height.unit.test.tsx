/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { FrameCard } from '@/screens/main/answer/frame-card';

// The height the frame's card tells the camera (P04 ticket 52, PR 516's review): a card without steps, as a received
// invitation's or a made Quest's, settles at its content's height under the cap and tells it, its room under the
// content included, so that the camera keeps the way clear of it.

jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: (): object => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

const STAGE = 800;
const BAR_ROOM = 40;
const CONTENT = 120;

async function shown(onHeight: (height: number) => void): Promise<void> {
  await render(
    <FrameCard barRoom={BAR_ROOM} onHeight={onHeight} stageHeight={STAGE} testID="card">
      <Text>수락하거나 거절해요</Text>
    </FrameCard>,
  );
}

async function layParts(height: number): Promise<void> {
  await fireEvent(screen.getByTestId('card-parts'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 390, height } },
  });
}

// Partitions: the content laid out, then grown, both under the cap.
describe('a frame card without steps', () => {
  it('tells its whole height once its content is laid out: the content, its padding above, and the room under it', async () => {
    const onHeight = jest.fn<undefined, [number]>();
    await shown(onHeight);

    await layParts(CONTENT);

    // The content's padding above it (CONTENT_TOP, 20) is part of what the card shows.
    expect(onHeight).toHaveBeenLastCalledWith(BAR_ROOM + CONTENT + 20);
    expect(BAR_ROOM + CONTENT + 20).toBeLessThan(STAGE / 2);
  });

  it('tells the new height once when its content grows', async () => {
    const onHeight = jest.fn<undefined, [number]>();
    await shown(onHeight);
    await layParts(CONTENT);
    onHeight.mockClear();

    await layParts(CONTENT + 60);

    expect(onHeight.mock.calls).toEqual([[BAR_ROOM + CONTENT + 60 + 20]]);
  });
});
