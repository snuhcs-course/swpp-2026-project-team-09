import { act, renderHook } from '@testing-library/react-native';
import type { LatLng } from '@/api/types';
import { type CameraMove, CAMPUS_BOUNDS, centreOf, type FitOptions, ZOOM_OFFSET } from '@/map';
import { type MainMap, useMainMap } from '@/screens/main/use-main-map';

const FIT = 15;
const CENTRE = centreOf(CAMPUS_BOUNDS);
const LIBRARY: LatLng = { latitude: 37.4598, longitude: 126.9521 };

interface Opened {
  map: () => MainMap;
  // What the map was asked, in order.
  moves: CameraMove[];
  fits: { points: readonly LatLng[]; options?: FitOptions }[];
  // The map opens: it tells its fit zoom and then where its camera rests.
  ready: () => Promise<void>;
  rest: (zoom: number) => Promise<void>;
}

// The main screen's map with a native map's handle that only records what it is asked.
async function open(): Promise<Opened> {
  const moves: CameraMove[] = [];
  const fits: Opened['fits'] = [];
  const { result } = await renderHook(() => useMainMap());
  const map = (): MainMap => result.current;
  map().ref.current = {
    moveCamera: (move): void => {
      moves.push(move);
    },
    fitTo: (points, options): void => {
      fits.push({ points, options });
    },
  };
  const rest = async (zoom: number): Promise<void> => {
    await act(() => {
      map().onCameraIdle({ centre: CENTRE, zoom });
    });
  };
  const ready = async (): Promise<void> => {
    await act(() => {
      map().onFitZoom(FIT);
    });
    await rest(FIT);
  };
  return { map, moves, fits, ready, rest };
}

describe("a move of the main screen's camera before the map is ready", () => {
  it('is kept and carried out when the map is ready, from the fit zoom the map tells', async () => {
    const { map, moves, ready } = await open();

    map().goTo(LIBRARY, 'close');
    expect(moves).toEqual([]);

    await ready();
    expect(moves).toEqual([{ centre: LIBRARY, zoom: FIT + ZOOM_OFFSET.close, animated: true }]);
  });

  it('is replaced by a later one: only the last is carried out, once', async () => {
    const { map, moves, ready, rest } = await open();

    map().goTo(LIBRARY, 'close');
    map().showCampus();
    await ready();
    await rest(FIT);

    expect(moves).toEqual([{ centre: CENTRE, zoom: FIT, animated: true }]);
  });

  it('does not change the zoom that the zoom buttons count from', async () => {
    const { map, moves, ready } = await open();
    map().goTo(LIBRARY, 'close');
    await ready();
    moves.length = 0;

    // The camera is on its way to the close level: one step out and one step in come back to it.
    map().zoomBy(-1);
    map().zoomBy(1);

    expect(moves.map(({ zoom }) => zoom)).toEqual([
      FIT + ZOOM_OFFSET.close - ZOOM_OFFSET.step,
      FIT + ZOOM_OFFSET.close,
    ]);
  });
});

describe("a move of the main screen's camera that changes nothing", () => {
  it('is not counted: zoom out on the whole campus and then zoom in is one step in', async () => {
    const { map, moves, ready } = await open();
    await ready();

    map().zoomBy(-1);
    map().zoomBy(1);

    expect(moves.map(({ zoom }) => zoom)).toEqual([FIT, FIT + ZOOM_OFFSET.step]);
  });

  it('counts a second press from the first while the camera is still moving', async () => {
    const { map, moves, ready, rest } = await open();
    await ready();

    map().zoomBy(1);
    map().zoomBy(1);
    expect(moves.map(({ zoom }) => zoom)).toEqual([FIT + ZOOM_OFFSET.step, FIT + 2 * ZOOM_OFFSET.step]);

    // Where the camera really rests is where the next press counts from.
    await rest(FIT + 1);
    map().zoomBy(-1);
    expect(moves.at(-1)?.zoom).toBeCloseTo(FIT + 1 - ZOOM_OFFSET.step, 6);
  });
});

describe("a fit of the main screen's camera", () => {
  const PADDING = { top: 10, right: 20, bottom: 30, left: 40 };

  it('is kept like a move until the map is ready, and comes no closer than the "pins" level', async () => {
    const { map, fits, ready } = await open();

    map().fitTo([CENTRE, LIBRARY], PADDING);
    expect(fits).toEqual([]);

    await ready();
    expect(fits).toEqual([
      { points: [CENTRE, LIBRARY], options: { padding: PADDING, maxZoom: FIT + ZOOM_OFFSET.pins, animated: true } },
    ]);
  });

  it('is what the zoom buttons count from, before the camera rests', async () => {
    const { map, moves, ready, rest } = await open();
    await ready();

    map().fitTo([CENTRE, LIBRARY], PADDING);
    map().zoomBy(1);
    expect(moves.map(({ zoom }) => zoom)).toEqual([FIT + ZOOM_OFFSET.pins + ZOOM_OFFSET.step]);

    // A fit that ended further out is counted from where it rests.
    await rest(FIT + 0.2);
    map().zoomBy(1);
    expect(moves.at(-1)?.zoom).toBeCloseTo(FIT + 0.2 + ZOOM_OFFSET.step, 6);
  });
});
