import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { createRef, type ReactElement, type Ref, useImperativeHandle } from 'react';
import { View } from 'react-native';

import type { LatLng } from '@/api/types';
import { CAMPUS_BOUNDS, type MapCamera, type MapHandle, type MapProps, ZOOM_OFFSET } from '@/map';
import NativeMap from '@/map/native-map';
import { EMPTY, EVENT, FRIEND, GATE, LIBRARY } from './support/map';

// What `native-map.tsx` hands the module's view, as far as these tests read it.
interface MockViewProps {
  avatars: { id: string; passive: boolean }[];
  looks: { routeColor: string; routeWidth: number };
  onThingPress: (event: { nativeEvent: { id: string } }) => void;
  onCameraIdle: (event: { nativeEvent: LatLng & { zoom: number } }) => void;
  ref: Ref<{ moveCamera: (move: object) => Promise<void>; fitTo: (...asked: unknown[]) => Promise<void> }>;
}

const mockMoveCamera = jest.fn<Promise<void>, [object]>();
const mockFitTo = jest.fn<Promise<void>, unknown[]>();
let mockProps: MockViewProps | null = null;

// The module's view: it keeps what it is handed and records what its two functions are asked.
function MockNativeView(props: MockViewProps): ReactElement {
  mockProps = props;
  useImperativeHandle(props.ref, () => ({ moveCamera: mockMoveCamera, fitTo: mockFitTo }), []);
  return <View testID="module-view" />;
}

jest.mock('expo', (): object => ({
  ...jest.requireActual<object>('expo'),
  requireNativeView: (): typeof MockNativeView => MockNativeView,
}));

function latitudeOf(move: object | undefined): number {
  return move !== undefined && 'latitude' in move ? Number(move.latitude) : Number.NaN;
}

// The zoom at which a view of 390 by 700 points just fits inside the campus rectangle.
const WHOLE_CAMPUS = 14.895;
const OPENING = { latitude: 37.458, longitude: 126.954, zoom: WHOLE_CAMPUS };

interface Shown {
  ref: { current: MapHandle | null };
  onFitZoom: jest.Mock<void, [number]>;
  onCameraIdle: jest.Mock<void, [MapCamera]>;
  onPress: jest.Mock<void, [string]>;
  layOut: (width: number, height: number) => Promise<void>;
  // The module tells where its camera rests.
  rest: () => Promise<void>;
}

async function show(props: Partial<MapProps> = {}): Promise<Shown> {
  const ref = createRef<MapHandle>();
  const [onFitZoom, onCameraIdle] = [jest.fn<void, [number]>(), jest.fn<void, [MapCamera]>()];
  const onPress = jest.fn<void, [string]>();
  await render(
    <NativeMap {...EMPTY} {...props} onCameraIdle={onCameraIdle} onFitZoom={onFitZoom} onPress={onPress} ref={ref} />,
  );
  return {
    ref,
    onFitZoom,
    onCameraIdle,
    onPress,
    layOut: async (width, height): Promise<void> => {
      const view = screen.getByTestId('module-view').parent;
      if (view !== null) {
        await fireEvent(view, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width, height } } });
      }
    },
    rest: async (): Promise<void> => {
      await act(() => {
        mockProps?.onCameraIdle({ nativeEvent: OPENING });
      });
    },
  };
}

beforeEach(() => {
  mockMoveCamera.mockReset().mockResolvedValue();
  mockFitTo.mockReset().mockResolvedValue();
  mockProps = null;
});

describe("the native map's fit zoom, which the module does not send", () => {
  it("is worked out from the view's size and told before the camera's first rest", async () => {
    const map = await show();
    // The module's camera rests before the view's size is known here: it is kept back.
    await map.rest();
    expect(map.onCameraIdle).not.toHaveBeenCalled();

    await map.layOut(390, 700);

    expect(map.onFitZoom).toHaveBeenCalledTimes(1);
    expect(map.onFitZoom.mock.calls[0]?.[0]).toBeCloseTo(WHOLE_CAMPUS, 3);
    expect(map.onCameraIdle).toHaveBeenCalledTimes(1);
    expect(map.onFitZoom.mock.invocationCallOrder[0]).toBeLessThan(map.onCameraIdle.mock.invocationCallOrder[0] ?? 0);
    expect(map.onCameraIdle).toHaveBeenCalledWith({
      centre: { latitude: 37.458, longitude: 126.954 },
      zoom: WHOLE_CAMPUS,
    });
  });

  it('is told again when the size changes it, and not when the size stays', async () => {
    const map = await show();
    await map.layOut(390, 700);

    await map.layOut(390, 700);
    expect(map.onFitZoom).toHaveBeenCalledTimes(1);

    await map.layOut(780, 1400);
    expect(map.onFitZoom).toHaveBeenCalledTimes(2);
    expect(map.onFitZoom.mock.lastCall?.[0]).toBeCloseTo(WHOLE_CAMPUS + 1, 3);
    await map.rest();
    expect(map.onCameraIdle).toHaveBeenCalledTimes(1);
  });
});

describe('a fit on the native map', () => {
  const PADDING = { top: 288, right: 108, bottom: 166, left: 46 };

  it("gives the module's own fit the largest side of the padding until the view's size is known", async () => {
    const map = await show();

    map.ref.current?.fitTo([GATE, LIBRARY], { padding: PADDING, animated: true });
    map.ref.current?.fitTo([GATE], { padding: 24 });

    expect(mockFitTo.mock.calls).toEqual([
      [[GATE, LIBRARY], 288, true],
      [[GATE], 24, false],
    ]);
    expect(mockMoveCamera).not.toHaveBeenCalled();
  });

  it('is worked out here once the size is known: a padding for each edge, and no closer than asked', async () => {
    const map = await show();
    await map.layOut(390, 700);
    const closest = WHOLE_CAMPUS + ZOOM_OFFSET.pins;
    const near: LatLng = { latitude: LIBRARY.latitude + 0.0002, longitude: LIBRARY.longitude };

    map.ref.current?.fitTo([LIBRARY, near], { padding: PADDING, maxZoom: closest, animated: true });

    expect(mockFitTo).not.toHaveBeenCalled();
    const [move] = mockMoveCamera.mock.calls;
    expect(move?.[0]).toMatchObject({ zoom: closest, animated: true });
    // The top takes more than the bottom, so the points come below the view's middle: the centre is north of them.
    expect(latitudeOf(move?.[0])).toBeGreaterThan(near.latitude);
    expect(latitudeOf(move?.[0])).toBeLessThan(CAMPUS_BOUNDS.north);
  });
});

describe('what the native map hands the module', () => {
  it("drops a passive Avatar's press and passes every other on", async () => {
    const me = { ...FRIEND, id: 'me', name: '내 위치', passive: true };
    const map = await show({ avatars: [FRIEND, me], markers: [EVENT] });

    expect(mockProps?.avatars.map(({ id, passive }) => [id, passive])).toEqual([
      ['friend:f1', false],
      ['me', true],
    ]);
    await act(() => {
      mockProps?.onThingPress({ nativeEvent: { id: 'me' } });
      mockProps?.onThingPress({ nativeEvent: { id: 'friend:f1' } });
    });

    expect(map.onPress.mock.calls).toEqual([['friend:f1']]);
  });

  it("gives the route the screen's colour and width, or the map's own plain line", async () => {
    await show({ routeStyle: { color: '#865600', width: 3, dash: [2, 6] } });
    expect(mockProps?.looks).toMatchObject({ routeColor: '#865600', routeWidth: 3 });

    await show();
    expect(mockProps?.looks).toMatchObject({ routeColor: '#2F6BFF', routeWidth: 5 });
  });
});
