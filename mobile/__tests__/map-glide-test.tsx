/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-06  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { render } from '@testing-library/react-native';
import { AccessibilityInfo, Animated } from 'react-native';

import { Map, unmadeImage } from '@/map';
import { EMPTY, FRIEND, GATE } from './support/map';

function watchGlides(reduceMotion = false): jest.SpyInstance {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(reduceMotion);
  return jest.spyOn(Animated, 'timing');
}

describe('an Avatar that glides', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('is placed without a glide when it first appears', async () => {
    const glides = watchGlides();

    await render(<Map {...EMPTY} avatars={[FRIEND]} />);

    expect(glides).not.toHaveBeenCalled();
  });

  it('stays where it is for the same position in a new list', async () => {
    const glides = watchGlides();
    const { rerender } = await render(<Map {...EMPTY} avatars={[FRIEND]} />);

    await rerender(<Map {...EMPTY} avatars={[{ ...FRIEND, position: { ...FRIEND.position } }]} />);

    expect(glides).not.toHaveBeenCalled();
  });

  it('glides to a new position over the time given', async () => {
    const glides = watchGlides();
    const { rerender } = await render(<Map {...EMPTY} avatars={[FRIEND]} />);

    await rerender(<Map {...EMPTY} avatars={[{ ...FRIEND, position: GATE }]} />);

    expect(glides).toHaveBeenCalledTimes(1);
    expect(glides.mock.calls[0]).toEqual([expect.anything(), expect.objectContaining({ duration: 5000 })]);
  });

  it('does not start again for a new image or text alone', async () => {
    const glides = watchGlides();
    const { rerender } = await render(<Map {...EMPTY} avatars={[FRIEND]} />);
    const image = unmadeImage({ kind: 'person', id: 'f1', tone: 'class', small: true, name: '김민준', photo: null });

    await rerender(<Map {...EMPTY} avatars={[{ ...FRIEND, image, text: '민준' }]} />);

    expect(glides).not.toHaveBeenCalled();
  });
});

describe('an Avatar that does not glide', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('is placed at once with no time to glide, or when the phone asks for less motion', async () => {
    const glides = watchGlides();
    const still = { ...FRIEND, glideMs: 0 };
    const { rerender, unmount } = await render(<Map {...EMPTY} avatars={[still]} />);
    await rerender(<Map {...EMPTY} avatars={[{ ...still, position: GATE }]} />);
    expect(glides).not.toHaveBeenCalled();
    await unmount();

    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    const calm = await render(<Map {...EMPTY} avatars={[FRIEND]} />);
    await calm.rerender(<Map {...EMPTY} avatars={[{ ...FRIEND, position: GATE }]} />);
    expect(glides).not.toHaveBeenCalled();
  });
});
