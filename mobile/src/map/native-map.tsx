import { requireNativeView } from 'expo';
import { type ReactElement, type Ref, useImperativeHandle, useRef } from 'react';
import { StyleSheet } from 'react-native';
import type { LatLng } from '@/api/types';
import { color, text } from '@/design-system';
import { useMotionAllowed } from '@/hooks/use-reduce-motion';
import { IMAGE_MARGIN } from './marker-images';
import { NATIVE_MAP_MODULE } from './native-module';
import type { FitOptions, MapBounds, MapMarker, MapProps } from './types';

// The native map module's view, as `modules/snu-now-map` defines it: the interface of `types.ts`, flattened. The
// module keeps the rules of `types.ts` itself.

// A marker or an Avatar. A marker's `glideMs` is 0.
interface NativeThing {
  id: string;
  latitude: number;
  longitude: number;
  look: string;
  uri: string | null;
  width: number;
  height: number;
  anchorX: number;
  anchorY: number;
  text: string | null;
  order: number;
  glideMs: number;
}

// What the interface names no colour or width for, from the design system's tokens.
interface NativeLooks {
  routeColor: string;
  routeWidth: number;
  textColor: string;
  textHaloColor: string;
  textSize: number;
  imageMargin: number;
}

interface NativeEvent<Payload> {
  nativeEvent: Payload;
}

interface NativeMapView {
  moveCamera: (move: { latitude?: number; longitude?: number; zoom?: number; animated: boolean }) => Promise<void>;
  fitTo: (points: readonly LatLng[], padding: number, animated: boolean) => Promise<void>;
}

interface NativeMapProps {
  bounds: MapBounds;
  minZoom: number;
  maxZoom: number;
  markers: NativeThing[];
  avatars: NativeThing[];
  route: readonly LatLng[] | null;
  looks: NativeLooks;
  onThingPress: (event: NativeEvent<{ id: string }>) => void;
  onCameraIdle: (event: NativeEvent<LatLng & { zoom: number }>) => void;
  ref: Ref<NativeMapView>;
  style: typeof StyleSheet.absoluteFill;
}

const NativeView = requireNativeView<NativeMapProps>(NATIVE_MAP_MODULE);

const ROUTE_WIDTH = 5;

const LOOKS: NativeLooks = {
  routeColor: color.me,
  routeWidth: ROUTE_WIDTH,
  textColor: color.ink,
  textHaloColor: color.surface,
  textSize: text.micro.fontSize,
  imageMargin: IMAGE_MARGIN,
};

// The module's `fitTo` takes one number for all four edges. Of a padding for each edge it is given the largest, so
// that neither end is ever under a control; the points then come to the view's middle and may be shown smaller than
// the interface asks.
function widestPadding(padding: FitOptions['padding']): number {
  if (padding === undefined || typeof padding === 'number') {
    return padding ?? 0;
  }
  return Math.max(padding.top, padding.right, padding.bottom, padding.left);
}

function thing({ id, position, image, text: words, order }: MapMarker, glideMs: number): NativeThing {
  return {
    id,
    latitude: position.latitude,
    longitude: position.longitude,
    look: image.look,
    uri: image.uri,
    width: image.width,
    height: image.height,
    anchorX: image.anchor.x,
    anchorY: image.anchor.y,
    text: words ?? null,
    order: order ?? 0,
    glideMs,
  };
}

// THE SEAM FOR THE NATIVE MAP. `map.tsx` loads this file only in a build that holds the module `SnuNowMap`, so
// nothing here runs in Expo Go, on the web or in a test, and it is the only file that names the native view. The
// iOS side (ticket 11) implements the same view.
export default function NativeMap(props: MapProps): ReactElement {
  const { bounds, minZoom, maxZoom, markers, avatars, route, onPress, onCameraIdle, ref } = props;
  const view = useRef<NativeMapView>(null);
  const gliding = useMotionAllowed();
  useImperativeHandle(
    ref,
    () => ({
      moveCamera: ({ centre, zoom, animated }): void => {
        void view.current?.moveCamera({ ...centre, zoom, animated: animated ?? false });
      },
      fitTo: (points, options): void => {
        void view.current?.fitTo(points, widestPadding(options?.padding), options?.animated ?? false);
      },
    }),
    [],
  );
  return (
    <NativeView
      avatars={avatars.map((avatar) => thing(avatar, gliding ? avatar.glideMs : 0))}
      bounds={bounds}
      looks={LOOKS}
      markers={markers.map((marker) => thing(marker, 0))}
      maxZoom={maxZoom}
      minZoom={minZoom}
      onCameraIdle={({ nativeEvent: { latitude, longitude, zoom } }) => {
        onCameraIdle?.({ centre: { latitude, longitude }, zoom });
      }}
      onThingPress={({ nativeEvent: { id } }) => {
        onPress?.(id);
      }}
      ref={view}
      route={route}
      style={StyleSheet.absoluteFill}
    />
  );
}
