/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { createRef, type ReactElement, type Ref, useImperativeHandle } from 'react';
import { Platform, View } from 'react-native';

import { INVITATION_CARD } from '@/api/mock/data/invitation-card';
import type { LatLng } from '@/api/types';
import { answerCamera } from '@/features/assistant/answer-camera';
import { type AnswerDrawing, drawingOfScene } from '@/features/assistant/answer-marks';
import { inView, type MapCamera, type MapHandle, ZOOM_OFFSET } from '@/map';
import NativeMap from '@/map/native-map';
import { paddingOf } from '@/screens/main/use-answer-map';
import { EMPTY } from './support/map';

// What `native-map.tsx` sends the module's `moveCamera`.
interface Sent {
  latitude?: number;
  longitude?: number;
  zoom?: number;
  animated: boolean;
}

interface MockViewProps {
  minZoom: number;
  onCameraIdle: (event: { nativeEvent: LatLng & { zoom: number } }) => void;
  ref: Ref<{ moveCamera: (move: Sent) => Promise<void>; fitTo: (...asked: unknown[]) => Promise<void> }>;
}

const mockMoveCamera = jest.fn<Promise<void>, [Sent]>();
const mockFitTo = jest.fn<Promise<void>, unknown[]>();
let mockProps: MockViewProps | null = null;

// The module's view: it keeps what it is handed and records the cameras it is sent.
function MockNativeView(props: MockViewProps): ReactElement {
  mockProps = props;
  useImperativeHandle(props.ref, () => ({ moveCamera: mockMoveCamera, fitTo: mockFitTo }), []);
  return <View testID="module-view" />;
}

jest.mock('expo', (): object => ({
  ...jest.requireActual<object>('expo'),
  requireNativeView: (): typeof MockNativeView => MockNativeView,
}));

// The emulator's numbers: a view 411 wide, 826 high over the tab bar (its 64 and the phone's own bar of 24) when the
// map opened, and 914 once the tab bar gave way to a received invitation's card, which took 411 of it, under a status
// bar of 24. What the card leaves for the way runs from 24 + 24 for the marks' room (half the symbol box of 36, and 6)
// to 914 - 411 - 24.
const WIDTH = 411;
const OPENED = 826;
const FRAMED = 914;
const STATUS_BAR = 24;
const CARD = 411;
const AREA = { top: 48, bottom: 479 };

// What the Android module shows for a camera it was sent (`SnuNowMapView.kt`): a zoom no lower than its lowest zoom,
// placed through the camera's height by a scale it measured when it opened. Kakao's camera shows as much from top to
// bottom at one height in a view of any height, so a view `now` high shows the zoom sent plus log2(now / opened). The
// emulator showed it: 민수's way, asked at zoom 15.49, was shown at 15.63, and the same camera 10% smaller once the
// tab bar was back.
function shownBy(move: Sent | undefined, opened: number, now: number): MapCamera {
  if (move?.latitude === undefined || move.longitude === undefined || move.zoom === undefined || mockProps === null) {
    throw new Error('The module was sent no camera');
  }
  return {
    centre: { latitude: move.latitude, longitude: move.longitude },
    zoom: Math.max(move.zoom, mockProps.minZoom) + Math.log2(now / opened),
  };
}

function wayDrawing(): AnswerDrawing {
  const { way } = INVITATION_CARD;
  if (way === null) {
    throw new Error('The stored card has a way');
  }
  return drawingOfScene(way.scene);
}

// The camera the main screen works out for the stored card's way under a card `card` high (`useAnswerCamera`).
function askedFor(card: number, fitZoom: number): MapCamera {
  const drawing = wayDrawing();
  const padding = paddingOf(STATUS_BAR, card, drawing, false);
  const camera = answerCamera(drawing, { width: WIDTH, height: FRAMED }, padding, fitZoom + ZOOM_OFFSET.close);
  if (camera === null) {
    throw new Error('The way has no camera');
  }
  return camera;
}

function heightsOf(points: readonly LatLng[], camera: MapCamera): number[] {
  return points.map((point) => inView(point, camera, { width: WIDTH, height: FRAMED }).y);
}

async function layOut(height: number): Promise<void> {
  const view = screen.getByTestId('module-view').parent;
  if (view !== null) {
    await fireEvent(view, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: WIDTH, height } } });
  }
}

interface Opened {
  ref: { current: MapHandle | null };
  // The fit zoom the map told last.
  fitZoom: () => number;
}

// The map laid out `height` high, and the module's first report of its camera once it opened.
async function openedAt(height: number): Promise<Opened> {
  const ref = createRef<MapHandle>();
  const onFitZoom = jest.fn<void, [number]>();
  await render(<NativeMap {...EMPTY} onFitZoom={onFitZoom} ref={ref} />);
  await layOut(height);
  await act(() => {
    mockProps?.onCameraIdle({ nativeEvent: { latitude: 37.458, longitude: 126.954, zoom: 15.2 } });
  });
  return { ref, fitZoom: () => onFitZoom.mock.lastCall?.[0] ?? Number.NaN };
}

beforeEach(() => {
  jest.replaceProperty(Platform, 'OS', 'android');
  mockMoveCamera.mockReset().mockResolvedValue();
  mockFitTo.mockReset().mockResolvedValue();
  mockProps = null;
});

afterEach(() => {
  jest.restoreAllMocks();
});

// Partitions of a view taller than when the module opened: a camera above the lowest zoom, one at the lowest zoom with
// the destination's side kept, and a fit worked out here. Expected values: the P02 spec's camera of a received
// invitation (the scene under the status bar and the card, the destination's side kept where the map cannot go out
// far enough) with the emulator's numbers above.
describe('the camera asked of the Android module in a view grown since it opened', () => {
  it("shows every point of 민수's way between the status bar's room and the card's top", async () => {
    const map = await openedAt(OPENED);
    await layOut(FRAMED);

    map.ref.current?.moveCamera({ ...askedFor(CARD, map.fitZoom()), animated: true });

    const ys = heightsOf(wayDrawing().points, shownBy(mockMoveCamera.mock.lastCall?.[0], OPENED, FRAMED));
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(AREA.top - 1);
    expect(Math.max(...ys)).toBeLessThanOrEqual(AREA.bottom + 1);
  });

  it("keeps the destination at the area's top where the map cannot go out far enough: under a card of 480", async () => {
    const map = await openedAt(OPENED);
    await layOut(FRAMED);
    const asked = askedFor(480, map.fitZoom());
    expect(asked.zoom).toBeCloseTo(map.fitZoom(), 6);

    map.ref.current?.moveCamera({ ...asked, animated: true });

    const shown = shownBy(mockMoveCamera.mock.lastCall?.[0], OPENED, FRAMED);
    // 63동, the pick, is the way's north end.
    expect(heightsOf([{ latitude: 37.45932, longitude: 126.95058 }], shown)[0]).toBeCloseTo(AREA.top, 0);
  });

  it("shows every point of a fit worked out here inside the fit's padding", async () => {
    const map = await openedAt(OPENED);
    await layOut(FRAMED);
    const { points } = wayDrawing();

    map.ref.current?.fitTo(points, { padding: { top: 48, right: 64, bottom: 435, left: 64 }, animated: true });

    const ys = heightsOf(points, shownBy(mockMoveCamera.mock.lastCall?.[0], OPENED, FRAMED));
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(AREA.top - 1);
    expect(Math.max(...ys)).toBeLessThanOrEqual(AREA.bottom + 1);
  });
});

const SOMEWHERE = { centre: { latitude: 37.455, longitude: 126.952 }, zoom: 16.2, animated: true };

// Partitions: the view as high as when the module opened (the everyday map), and lower than then, as when a card that
// opened with the map closes. Expected values: the zoom asked, and that zoom plus log2(914 / 826).
describe('the camera asked of the Android module in a view not grown since it opened', () => {
  it('is sent as asked while the view is as high as when the module opened', async () => {
    const map = await openedAt(OPENED);

    map.ref.current?.moveCamera(SOMEWHERE);

    expect(mockMoveCamera.mock.lastCall?.[0].zoom).toBe(16.2);
    expect(mockProps?.minZoom).toBeCloseTo(map.fitZoom(), 6);
  });

  it('is sent closer in a view lower than when the module opened, its lowest zoom kept', async () => {
    const map = await openedAt(FRAMED);
    await layOut(OPENED);

    map.ref.current?.moveCamera(SOMEWHERE);

    expect(mockMoveCamera.mock.lastCall?.[0].zoom).toBeCloseTo(16.2 + Math.log2(FRAMED / OPENED), 6);
    expect(mockProps?.minZoom).toBeCloseTo(map.fitZoom(), 6);
  });
});

// Partitions: no report yet, as before the module opened, which then measures its scale at the view's height then;
// and the iOS module, which measures its scale again after each move. Expected value: the zoom asked.
describe('the camera asked of a module that measures its scale where the view is', () => {
  it('is sent as asked when the view grew before the module first reported its camera', async () => {
    const ref = createRef<MapHandle>();
    await render(<NativeMap {...EMPTY} ref={ref} />);
    await layOut(OPENED);
    await layOut(FRAMED);

    ref.current?.moveCamera(SOMEWHERE);

    expect(mockMoveCamera.mock.lastCall?.[0].zoom).toBe(16.2);
  });

  it('is sent as asked on iOS', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    const map = await openedAt(OPENED);
    await layOut(FRAMED);

    map.ref.current?.moveCamera(SOMEWHERE);

    expect(mockMoveCamera.mock.lastCall?.[0].zoom).toBe(16.2);
    expect(mockProps?.minZoom).toBeCloseTo(map.fitZoom(), 6);
  });
});
