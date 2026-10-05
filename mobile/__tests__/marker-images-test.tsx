import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { TurboModuleRegistry } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { Map, MarkerImageStage, type MarkerLook, useMarkerImages } from '@/map';
import { EMPTY, GATE } from './support/map';

jest.mock('react-native-view-shot', (): { captureRef: jest.Mock<Promise<string>, []> } => ({
  captureRef: jest.fn<Promise<string>, []>(),
}));

// A screen that asks for one look and puts it on the map, inside what the app puts around every screen.
function Sample({ look }: { look: MarkerLook }): ReactElement {
  const [image] = useMarkerImages([look]);
  return (
    <>
      <Map {...EMPTY} markers={[{ id: 'm1', name: '표시', position: GATE, image }]} />
      <MarkerImageStage />
    </>
  );
}

// Lays out the stage's view of a look, which a screen reader does not see, and lets the stage capture it.
async function layOut(label: string): Promise<void> {
  await fireEvent(screen.getByLabelText(label, { includeHiddenElements: true }), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 56, height: 64 } },
  });
  await act(async () => {
    await jest.advanceTimersByTimeAsync(100);
  });
}

describe('marker images', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('names the look at once, so that a test and the plain ground know what was asked', async () => {
    await render(<Sample look={{ kind: 'friend', form: 'dot', name: '김서연', photo: null, status: 'moving' }} />);

    expect(screen.getByRole('button', { name: '표시' })).toHaveProp('testID', 'friend:dot:moving:김서연:');
  });

  it('keeps what is drawn to be captured away from a screen reader', async () => {
    await render(<Sample look={{ kind: 'friend', form: 'pin', name: '김서연', photo: null, status: 'free' }} />);

    expect(screen.queryByLabelText('김서연 · 공강')).toBeNull();
    expect(screen.getByLabelText('김서연 · 공강', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('makes no picture where the build cannot capture a view', async () => {
    jest.spyOn(TurboModuleRegistry, 'get').mockReturnValue(null);
    await render(<Sample look={{ kind: 'quest', form: 'dot' }} />);
    await layOut('퀘스트');

    expect(screen.queryByLabelText('퀘스트', { includeHiddenElements: true })).toBeNull();
    expect(captureRef).not.toHaveBeenCalled();
  });

  it('makes the picture of a look once, from the design system view, and hands it to the map', async () => {
    jest.spyOn(TurboModuleRegistry, 'get').mockImplementation((name) => (name === 'RNViewShot' ? {} : null));
    jest.mocked(captureRef).mockResolvedValue('file:///tmp/party-pin.png');
    await render(<Sample look={{ kind: 'party', form: 'pin' }} />);
    await layOut('파티');

    const picture = screen.getByTestId('party:pin:picture');
    expect(picture).toHaveProp('source', { uri: 'file:///tmp/party-pin.png' });
    expect(picture).toHaveStyle({ width: 56, height: 64 });
    expect(captureRef).toHaveBeenCalledTimes(1);
  });
});
