/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { createRef, type ReactElement, type Ref, useImperativeHandle } from 'react';
import { View } from 'react-native';

import type { MapHandle } from '@/map';
import NativeMap from '@/map/native-map';
import { sentToView } from '@/map/view-calls';
import { EMPTY } from './support/map';

// The camera calls `native-map.tsx` makes on the module's view when that view is already gone, as after a change of
// the font size recreates Android's Activity and drops the native view before the JavaScript one unmounts (P04 ticket
// 95). The module rejects such a call; nothing is left to move, so the rejection is no error of the app. Any other
// rejection still is, and is left unhandled, so that it is reported as before. Jest fails a test in which a rejection
// is left unhandled, so each call below on a gone view passes only when its rejection is handled.

interface MockViewProps {
  onCameraIdle: (event: { nativeEvent: { latitude: number; longitude: number; zoom: number } }) => void;
  ref: Ref<{ moveCamera: (...sent: unknown[]) => Promise<void>; fitTo: (...sent: unknown[]) => Promise<void> }>;
}

const mockMoveCamera = jest.fn<Promise<void>, unknown[]>();
const mockFitTo = jest.fn<Promise<void>, unknown[]>();
let mockProps: MockViewProps | null = null;

function MockNativeView(props: MockViewProps): ReactElement {
  mockProps = props;
  useImperativeHandle(props.ref, () => ({ moveCamera: mockMoveCamera, fitTo: mockFitTo }), []);
  return <View testID="module-view" />;
}

jest.mock('expo', (): object => ({
  ...jest.requireActual<object>('expo'),
  requireNativeView: (): typeof MockNativeView => MockNativeView,
}));

// An error as expo-modules-core rejects a call with: its `code` and its message, each cause on a line of its own.
function moduleError(code: string, lines: readonly string[]): Error {
  return Object.assign(new Error(lines.join('\n→ Caused by: ')), { code });
}

// The view gone, as each platform's module says it: Android's `Exceptions.ViewNotFound` keeps its code through the
// call's wrappers; iOS wraps it in an argument cast, whose code it takes, and keeps its words.
const GONE_ON_ANDROID = moduleError('ERR_VIEW_NOT_FOUND', [
  "Call to function 'SnuNowMap.moveCamera' has been rejected.",
  'The 1st argument cannot be cast to type class com.bonnieandclaude.snunow.map.SnuNowMapView (received class java.lang.Integer)',
  'Unable to find the class com.bonnieandclaude.snunow.map.SnuNowMapView view with tag 211',
]);
const GONE_ON_IOS = moduleError('ERR_ARGUMENT_CAST', [
  "Calling the 'moveCamera' function has failed",
  'The 1st argument cannot be cast to type SnuNowMapView',
  "Unable to find the 'SnuNowMapView' view with tag '211'",
]);
// Another failure of the same call: an argument the module cannot read.
const OTHER = moduleError('ERR_ARGUMENT_CAST', [
  "Call to function 'SnuNowMap.moveCamera' has been rejected.",
  'The 2nd argument cannot be cast to type CameraMoveRecord (received class java.lang.String)',
]);

beforeEach(() => {
  mockMoveCamera.mockReset().mockResolvedValue();
  mockFitTo.mockReset().mockResolvedValue();
  mockProps = null;
});

// Long enough for Node to have looked for rejections left unhandled by the calls made.
async function settled(): Promise<void> {
  await act(async () => {
    await new Promise((done) => {
      setTimeout(done, 20);
    });
  });
}

async function opened(laidOut: boolean): Promise<{ current: MapHandle | null }> {
  const ref = createRef<MapHandle>();
  await render(<NativeMap {...EMPTY} ref={ref} />);
  if (laidOut) {
    const view = screen.getByTestId('module-view').parent;
    if (view !== null) {
      await fireEvent(view, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 411, height: 826 } } });
    }
  }
  await act(() => {
    mockProps?.onCameraIdle({ nativeEvent: { latitude: 37.458, longitude: 126.954, zoom: 15.2 } });
  });
  return ref;
}

const CAMERA = { centre: { latitude: 37.459, longitude: 126.952 }, zoom: 16, animated: true };
const POINTS = [
  { latitude: 37.459, longitude: 126.952 },
  { latitude: 37.455, longitude: 126.95 },
];

// Partitions: each call the handle makes on the module's view: a move; a fit before the view is laid out, which the
// module fits; a fit worked out here, sent as a move. The view gone on Android or on iOS. Expected values: the call
// made, and no rejection left unhandled.
describe('a camera call on a map view that is already gone', () => {
  it.each([
    ['Android', GONE_ON_ANDROID],
    ['iOS', GONE_ON_IOS],
  ])('leaves no unhandled rejection for a move, the view gone on %s', async (_platform, gone) => {
    const map = await opened(true);
    mockMoveCamera.mockRejectedValue(gone);

    map.current?.moveCamera(CAMERA);
    await settled();

    expect(mockMoveCamera).toHaveBeenCalled();
  });

  it("leaves none for the module's own fit, before the view is laid out", async () => {
    const map = await opened(false);
    mockFitTo.mockRejectedValue(GONE_ON_ANDROID);

    map.current?.fitTo(POINTS, { padding: 40 });
    await settled();

    expect(mockFitTo).toHaveBeenCalled();
  });

  it('leaves none for a fit worked out here and sent as a move', async () => {
    const map = await opened(true);
    mockMoveCamera.mockRejectedValue(GONE_ON_IOS);

    map.current?.fitTo(POINTS, { padding: 40 });
    await settled();

    expect(mockMoveCamera).toHaveBeenCalled();
  });
});

// Partitions: a call that resolves; one rejected because the view is gone on Android or on iOS; one rejected for
// another reason. Expected values: the gone view's rejection taken, every other kept as it came, so that a call made
// without waiting leaves it unhandled and reported as before.
describe('a call sent to the map view', () => {
  it.each([
    ['resolves', (): Promise<void> => Promise.resolve()],
    ['is rejected because the view is gone on Android', (): Promise<void> => Promise.reject(GONE_ON_ANDROID)],
    ['is rejected because the view is gone on iOS', (): Promise<void> => Promise.reject(GONE_ON_IOS)],
  ])('settles quietly when it %s', async (_case, call) => {
    await expect(sentToView(call())).resolves.toBeUndefined();
  });

  it('keeps any other failure', async () => {
    await expect(sentToView(Promise.reject(OTHER))).rejects.toBe(OTHER);
  });

  it('sends nothing when there is no view', async () => {
    await expect(sentToView()).resolves.toBeUndefined();
  });
});
