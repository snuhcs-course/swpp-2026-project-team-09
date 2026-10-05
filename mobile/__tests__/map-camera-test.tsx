import { screen } from '@testing-library/react-native';

import { CAMPUS_BOUNDS, centreOf, MAX_ZOOM } from '@/map';
import { EVENT, FRIEND, GATE, holdMap, layOutMap, LIBRARY } from './support/map';

// The zoom at which a view of 390 by 700 points just fits inside the campus rectangle.
const WHOLE_CAMPUS = 14.895;

describe("the map's camera", () => {
  it('opens on the middle of the campus, as far out as the view fits inside it', async () => {
    const map = await holdMap();

    expect(map.camera()?.zoom).toBeCloseTo(WHOLE_CAMPUS, 3);
    expect(map.camera()?.centre.latitude).toBeCloseTo(centreOf(CAMPUS_BOUNDS).latitude, 3);
    expect(map.camera()?.centre.longitude).toBeCloseTo(centreOf(CAMPUS_BOUNDS).longitude, 6);
  });

  it('answers a move with where it stopped', async () => {
    const map = await holdMap();

    await map.move((handle) => {
      handle.moveCamera({ centre: LIBRARY, zoom: 17, animated: true });
    });
    expect(map.camera()).toEqual({ centre: LIBRARY, zoom: 17 });

    await map.move((handle) => {
      handle.moveCamera({ zoom: 17.5 });
    });
    expect(map.camera()).toEqual({ centre: LIBRARY, zoom: 17.5 });
  });

  it('sends nothing for a move that changes nothing', async () => {
    const map = await holdMap();
    await map.move((handle) => {
      handle.moveCamera({ centre: LIBRARY, zoom: 17 });
    });
    const sent = map.onCameraIdle.mock.calls.length;

    await map.move((handle) => {
      handle.moveCamera({ centre: LIBRARY, zoom: 17 });
      handle.moveCamera({});
      handle.fitTo([]);
    });

    expect(map.onCameraIdle).toHaveBeenCalledTimes(sent);
  });
});

describe("the camera's limits", () => {
  it('keeps the view inside the campus rectangle and the zoom limits', async () => {
    const map = await holdMap();

    await map.move((handle) => {
      handle.moveCamera({ centre: { latitude: 37.5, longitude: 126.9 }, zoom: 30 });
    });
    expect(map.camera()?.zoom).toBe(MAX_ZOOM);
    // Half a view of 390 points is 0.0005 degrees wide at this zoom, and half of 700 is 0.0007 degrees high.
    expect(map.camera()?.centre.longitude).toBeCloseTo(CAMPUS_BOUNDS.west + 0.00052, 5);
    expect(map.camera()?.centre.latitude).toBeCloseTo(CAMPUS_BOUNDS.north - 0.00075, 5);

    await map.move((handle) => {
      handle.moveCamera({ zoom: 1 });
    });
    expect(map.camera()?.zoom).toBeCloseTo(WHOLE_CAMPUS, 3);
  });

  it('follows the size of the view', async () => {
    const map = await holdMap();

    await layOutMap(390, 350);

    expect(map.camera()?.zoom).toBeCloseTo(WHOLE_CAMPUS, 3);
    await layOutMap(780, 700);
    expect(map.camera()?.zoom).toBeCloseTo(WHOLE_CAMPUS + 1, 3);
  });
});

describe('fitting the camera to points', () => {
  it('shows all the points, as close as the padding allows', async () => {
    const map = await holdMap({ avatars: [{ ...FRIEND, text: '민준' }], markers: [EVENT] });
    await map.move((handle) => {
      handle.moveCamera({ centre: LIBRARY, zoom: 19 });
    });
    expect(screen.queryByText('AI 커리어')).toBeNull();

    await map.move((handle) => {
      handle.fitTo([GATE, LIBRARY], { padding: 40, animated: true });
    });

    // The two are 0.0099 degrees apart from south to north, which fills 620 of the 700 points at this zoom.
    expect(map.camera()?.zoom).toBeCloseTo(16.093, 3);
    expect(map.camera()?.centre.latitude).toBeCloseTo((GATE.latitude + LIBRARY.latitude) / 2, 5);
    expect(map.camera()?.centre.longitude).toBeCloseTo((GATE.longitude + LIBRARY.longitude) / 2, 6);
    expect(screen.getByText('AI 커리어')).toBeVisible();
    expect(screen.getByText('민준')).toBeVisible();
  });

  it('comes no closer to one point than the highest zoom', async () => {
    const map = await holdMap();

    await map.move((handle) => {
      handle.fitTo([LIBRARY]);
    });

    expect(map.camera()?.zoom).toBe(MAX_ZOOM);
    expect(map.camera()?.centre.latitude).toBeCloseTo(LIBRARY.latitude, 9);
    expect(map.camera()?.centre.longitude).toBeCloseTo(LIBRARY.longitude, 9);
  });
});
