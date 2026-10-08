import { requireNativeView } from 'expo';
import {
  type ReactElement,
  type Ref,
  type RefObject,
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, View } from 'react-native';
import type { LatLng } from '@/api/types';
import { color, text } from '@/design-system';
import { useMotionAllowed } from '@/hooks/use-reduce-motion';
import { IMAGE_MARGIN } from './marker-images';
import { NATIVE_MAP_MODULE } from './native-module';
import { type CameraRules, fit, lowestZoom, type Size } from './projection';
import type {
  FitOptions,
  FitPadding,
  MapBounds,
  MapCamera,
  MapHandle,
  MapInset,
  MapLine,
  MapMarker,
  MapProps,
} from './types';

// The native map module's view, as `modules/snu-now-map` defines it: the interface of `types.ts`, flattened. The
// module keeps the camera's rules of `types.ts` itself, with the same Web Mercator sums as `projection.ts`. What the
// interface gained after the module was written is kept here, in TypeScript, with those sums:
// - the fit zoom (`onFitZoom`), which the module does not send, from the view's size;
// - a fit with a padding for each edge and a closest zoom, which the module's `fitTo` cannot take;
// - a passive marker's press, which the module sends and this file drops.
// A line's dashes are the module's to draw: it draws a solid line in the colour and the width it is given.
// `inset` is handed over with all four sides; the module places Kakao's logo 8 from the bottom right of what it leaves.

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
  // The module does not read it yet: every label takes a press, and a passive one's press is dropped here.
  passive: boolean;
}

// A line, by the rules of `MapLine`. The module keeps, changes and removes each by its `id`, and draws the later in
// the list on top.
interface NativeLine {
  id: string;
  points: readonly LatLng[];
  color: string;
  width: number;
}

// What the interface names no colour or size for, from the design system's tokens.
interface NativeLooks {
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
  lines: NativeLine[];
  looks: NativeLooks;
  // What the screen's controls cover of each edge, in points: the module's logo belongs inside what is left.
  inset: FitPadding;
  onThingPress: (event: NativeEvent<{ id: string }>) => void;
  onCameraIdle: (event: NativeEvent<LatLng & { zoom: number }>) => void;
  ref: Ref<NativeMapView>;
  style: typeof StyleSheet.absoluteFill;
}

const NativeView = requireNativeView<NativeMapProps>(NATIVE_MAP_MODULE);

const LOOKS: NativeLooks = {
  textColor: color.ink,
  textHaloColor: color.surface,
  textSize: text.micro.fontSize,
  imageMargin: IMAGE_MARGIN,
};

function nativeLine({ id, points, style }: MapLine): NativeLine {
  return { id, points, color: style.color, width: style.width };
}

// The module's `fitTo` takes one number for all four edges. Of a padding for each edge it is given the largest, so
// that neither end is ever under a control; the points then come to the view's middle and may be shown smaller than
// the interface asks.
function widestPadding(padding: FitOptions['padding']): number {
  if (padding === undefined || typeof padding === 'number') {
    return padding ?? 0;
  }
  return Math.max(padding.top, padding.right, padding.bottom, padding.left);
}

function thing({ id, position, image, text: words, order, passive }: MapMarker, glideMs: number): NativeThing {
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
    passive: passive ?? false,
  };
}

// The inset with every side said, and the same object for as long as no side changes.
function useInset({ top = 0, right = 0, bottom = 0, left = 0 }: MapInset = {}): FitPadding {
  return useMemo(() => ({ top, right, bottom, left }), [top, right, bottom, left]);
}

// Tells the fit zoom, which the module does not send: the lowest zoom allowed by the rule of `projection.ts`, the
// same one the module holds the camera by, from the view's size as it is laid out. It is told before the first
// `onCameraIdle`, which is kept back until then, and again whenever the size changes it. Answers what the module's
// camera reports go through.
function useReports(
  rules: CameraRules | null,
  { onCameraIdle, onFitZoom }: Pick<MapProps, 'onCameraIdle' | 'onFitZoom'>,
): (camera: MapCamera) => void {
  const fitZoom = rules === null ? null : lowestZoom(rules);
  const told = useRef(false);
  const kept = useRef<MapCamera | null>(null);
  const tell = useEffectEvent(() => {
    if (fitZoom === null) {
      return;
    }
    onFitZoom?.(fitZoom);
    told.current = true;
    if (kept.current !== null) {
      onCameraIdle?.(kept.current);
      kept.current = null;
    }
  });
  useEffect(() => {
    tell();
  }, [fitZoom]);
  return (camera) => {
    if (told.current) {
      onCameraIdle?.(camera);
    } else {
      kept.current = camera;
    }
  };
}

// The interface's handle on the module's view. A fit is worked out here, by `fit` of `projection.ts`, and sent as a
// move of the camera, because the module's own `fitTo` takes neither a padding for each edge nor a closest zoom.
// Until the view is laid out its size is not known here, and the module's `fitTo` is asked with the largest side of
// the padding.
function useHandle(
  ref: Ref<MapHandle> | undefined,
  view: RefObject<NativeMapView | null>,
  rules: CameraRules | null,
): void {
  useImperativeHandle(
    ref,
    () => ({
      moveCamera: ({ centre, zoom, animated }): void => {
        void view.current?.moveCamera({ ...centre, zoom, animated: animated ?? false });
      },
      fitTo: (points, options): void => {
        const animated = options?.animated ?? false;
        if (rules === null) {
          void view.current?.fitTo(points, widestPadding(options?.padding), animated);
          return;
        }
        const camera = fit(points, options ?? {}, rules);
        if (camera !== null) {
          void view.current?.moveCamera({ ...camera.centre, zoom: camera.zoom, animated });
        }
      },
    }),
    [view, rules],
  );
}

// THE SEAM FOR THE NATIVE MAP. `map.tsx` loads this file only in a build that holds the module `SnuNowMap`, so
// nothing here runs in Expo Go or on the web, and it is the only file that names the native view. The iOS side
// (ticket 11) implements the same view.
export default function NativeMap(props: MapProps): ReactElement {
  const { bounds, minZoom, maxZoom, markers, avatars, lines, onPress, ref } = props;
  const view = useRef<NativeMapView>(null);
  const gliding = useMotionAllowed();
  const [size, setSize] = useState<Size | null>(null);
  const rules = useMemo(
    () => (size === null ? null : { bounds, minZoom, maxZoom, size }),
    [bounds, minZoom, maxZoom, size],
  );
  const report = useReports(rules, props);
  useHandle(ref, view, rules);
  const inset = useInset(props.inset);
  const passive = new Set([...markers, ...avatars].filter((one) => one.passive === true).map(({ id }) => id));
  return (
    <View
      onLayout={({ nativeEvent: { layout } }) => {
        setSize((last) =>
          last?.width === layout.width && last.height === layout.height
            ? last
            : { width: layout.width, height: layout.height },
        );
      }}
      style={StyleSheet.absoluteFill}
    >
      <NativeView
        avatars={avatars.map((avatar) => thing(avatar, gliding ? avatar.glideMs : 0))}
        bounds={bounds}
        inset={inset}
        lines={lines.map((line) => nativeLine(line))}
        looks={LOOKS}
        markers={markers.map((marker) => thing(marker, 0))}
        maxZoom={maxZoom}
        minZoom={minZoom}
        onCameraIdle={({ nativeEvent: { latitude, longitude, zoom } }) => {
          report({ centre: { latitude, longitude }, zoom });
        }}
        onThingPress={({ nativeEvent: { id } }) => {
          if (!passive.has(id)) {
            onPress?.(id);
          }
        }}
        ref={view}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}
