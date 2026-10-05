import { act, render, screen, userEvent } from '@testing-library/react-native';
import { createRef } from 'react';

import { CAMPUS_BOUNDS, centreOf, Map, type MapCamera, type MapHandle, MAX_ZOOM, MIN_ZOOM } from '@/map';
import { EMPTY, EVENT, FRIEND, GATE, LIBRARY } from './support/map';

describe('the map without a native module', () => {
  it('is a plain ground that says where the map shows', async () => {
    await render(<Map {...EMPTY} />);

    expect(screen.getByText('지도는 Android 빌드에서 보입니다')).toBeVisible();
  });

  it('credits the map data', async () => {
    await render(<Map {...EMPTY} />);

    expect(screen.getByText('© OpenStreetMap · 국토지리정보원')).toBeVisible();
  });

  it("lets a marker's and an Avatar's name be read, with the look and the text asked for", async () => {
    await render(<Map {...EMPTY} avatars={[FRIEND]} markers={[EVENT]} />);

    expect(screen.getByRole('button', { name: 'AI 커리어 채용설명회' })).toHaveProp('testID', 'official:pin');
    expect(screen.getByText('AI 커리어')).toBeVisible();
    expect(screen.getByRole('button', { name: '김민준' })).toBeVisible();
  });

  it('passes a press on with the identifier', async () => {
    const onPress = jest.fn<void, [string]>();
    await render(<Map {...EMPTY} avatars={[FRIEND]} markers={[EVENT]} onPress={onPress} />);

    await userEvent.press(screen.getByRole('button', { name: 'AI 커리어 채용설명회' }));
    await userEvent.press(screen.getByRole('button', { name: '김민준' }));

    expect(onPress.mock.calls).toEqual([['event:e1'], ['friend:f1']]);
  });

  it('removes a marker that is no longer listed', async () => {
    const { rerender } = await render(<Map {...EMPTY} markers={[EVENT]} />);

    await rerender(<Map {...EMPTY} />);

    expect(screen.queryByRole('button', { name: 'AI 커리어 채용설명회' })).toBeNull();
  });

  it('draws the route line and clears it', async () => {
    const { rerender } = await render(<Map {...EMPTY} />);
    expect(screen.queryByText('경로가 그려져 있습니다')).toBeNull();

    await rerender(<Map {...EMPTY} route={[GATE, LIBRARY]} />);
    expect(screen.getByText('경로가 그려져 있습니다')).toBeVisible();

    await rerender(<Map {...EMPTY} route={null} />);
    expect(screen.queryByText('경로가 그려져 있습니다')).toBeNull();
  });
});

// A map as a screen holds it: by a handle, and told when the camera stops.
async function renderMap(): Promise<{ map: MapHandle | null; onCameraIdle: jest.Mock<void, [MapCamera]> }> {
  const ref = createRef<MapHandle>();
  const onCameraIdle = jest.fn<void, [MapCamera]>();
  await render(<Map {...EMPTY} onCameraIdle={onCameraIdle} ref={ref} />);
  return { map: ref.current, onCameraIdle };
}

describe("the map's camera", () => {
  it('opens on the whole campus', async () => {
    const { onCameraIdle } = await renderMap();

    expect(onCameraIdle.mock.calls).toEqual([[{ centre: centreOf(CAMPUS_BOUNDS), zoom: MIN_ZOOM }]]);
  });

  it('answers a move with where it stopped', async () => {
    const { map, onCameraIdle } = await renderMap();

    await act(() => {
      map?.moveCamera({ centre: LIBRARY, zoom: 17, animated: true });
    });
    expect(onCameraIdle).toHaveBeenLastCalledWith({ centre: LIBRARY, zoom: 17 });

    await act(() => {
      map?.moveCamera({ zoom: 18 });
    });
    expect(onCameraIdle).toHaveBeenLastCalledWith({ centre: LIBRARY, zoom: 18 });
  });

  it('stays inside the campus rectangle and the zoom limits', async () => {
    const { map, onCameraIdle } = await renderMap();

    await act(() => {
      map?.moveCamera({ centre: { latitude: 37.5, longitude: 126.9 }, zoom: 30 });
    });

    expect(onCameraIdle).toHaveBeenLastCalledWith({
      centre: { latitude: CAMPUS_BOUNDS.north, longitude: CAMPUS_BOUNDS.west },
      zoom: MAX_ZOOM,
    });
  });
});
