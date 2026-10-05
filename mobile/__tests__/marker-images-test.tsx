import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { Text } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { Map, MarkerImageStage, type MarkerLook, useMarkerImages } from '@/map';
import { EMPTY, GATE } from './support/map';

let mockHasNativeMap = false;

jest.mock('@/map/native-module', (): { hasNativeMap: () => boolean } => ({
  hasNativeMap: (): boolean => mockHasNativeMap,
}));

jest.mock('react-native-view-shot', (): { captureRef: jest.Mock<Promise<string>, []> } => ({
  captureRef: jest.fn<Promise<string>, []>(),
}));

// A screen that asks for one look and puts it on the map, inside what the app puts around every screen. It also
// says where the look's picture is.
function Sample({ look }: { look: MarkerLook }): ReactElement {
  const [image] = useMarkerImages([look]);
  return (
    <>
      <Map {...EMPTY} markers={[{ id: 'm1', name: '표시', position: GATE, image }]} />
      <Text>{`그림: ${image.uri ?? '없음'}`}</Text>
      <MarkerImageStage />
    </>
  );
}

async function pass(milliseconds: number): Promise<void> {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(milliseconds);
  });
}

// The stage's view of a look: the last view of it, after any that the map draws.
function onStage(label: string): ReturnType<typeof screen.getByLabelText> {
  const views = screen.getAllByLabelText(label, { includeHiddenElements: true });
  return views.at(-1) ?? screen.getByLabelText(label);
}

async function layOutOnStage(label: string): Promise<void> {
  await fireEvent(onStage(label), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 56, height: 64 } } });
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.mocked(captureRef).mockReset();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('marker images in a build without a native map', () => {
  beforeEach(() => {
    mockHasNativeMap = false;
  });

  it('names the look and makes no picture: the plain ground draws the view itself', async () => {
    await render(<Sample look={{ kind: 'friend', form: 'dot', name: '김서연', photo: null, status: 'moving' }} />);
    await pass(5000);

    expect(screen.getByRole('button', { name: '표시' })).toHaveProp('testID', 'friend:dot:moving:김서연:');
    expect(screen.getAllByLabelText('김서연 · 이동 중', { includeHiddenElements: true })).toHaveLength(1);
    expect(screen.getByText('그림: 없음')).toBeVisible();
    expect(captureRef).not.toHaveBeenCalled();
  });
});

describe('marker images in a build with a native map', () => {
  beforeEach(() => {
    mockHasNativeMap = true;
  });

  it("makes the picture of a look once, from the design system's view, unread by a screen reader", async () => {
    jest.mocked(captureRef).mockResolvedValue('file:///tmp/party-pin.png');
    await render(<Sample look={{ kind: 'party', form: 'pin' }} />);
    expect(screen.queryByLabelText('파티')).toBeNull();

    await layOutOnStage('파티');
    await pass(100);

    // The look has left the stage, and the native map draws the picture, not the view.
    expect(screen.getByText('그림: file:///tmp/party-pin.png')).toBeVisible();
    expect(screen.queryAllByLabelText('파티', { includeHiddenElements: true })).toHaveLength(0);
    await pass(10_000);
    expect(captureRef).toHaveBeenCalledTimes(1);
  });

  it('tries again after a capture that gave no picture', async () => {
    jest
      .mocked(captureRef)
      .mockRejectedValueOnce(new Error('not drawn yet'))
      .mockResolvedValue('file:///tmp/quest.png');
    await render(<Sample look={{ kind: 'quest', form: 'dot' }} />);

    await layOutOnStage('퀘스트');
    await pass(100);
    expect(screen.getByText('그림: 없음')).toBeVisible();

    await pass(500);
    expect(screen.getByText('그림: file:///tmp/quest.png')).toBeVisible();
    expect(captureRef).toHaveBeenCalledTimes(2);
  });
});

describe("a Friend's photo that arrives late", () => {
  beforeEach(() => {
    mockHasNativeMap = true;
  });

  it('replaces the picture made without it', async () => {
    jest.mocked(captureRef).mockResolvedValueOnce('file:///tmp/letters.png').mockResolvedValue('file:///tmp/photo.png');
    const photo = 'https://example.test/seoyeon.jpg';
    await render(<Sample look={{ kind: 'friend', form: 'pin', name: '김서연', photo, status: 'free' }} />);

    await layOutOnStage('김서연 · 공강');
    await pass(100);
    expect(screen.getByText('그림: 없음')).toBeVisible();
    await pass(3000);
    await pass(100);
    expect(screen.getByText('그림: file:///tmp/letters.png')).toBeVisible();

    const [shownPhoto] = onStage('김서연 · 공강').children;
    if (typeof shownPhoto !== 'string') {
      await fireEvent(shownPhoto, 'load');
    }
    await pass(100);
    expect(screen.getByText('그림: file:///tmp/photo.png')).toBeVisible();
  });
});
