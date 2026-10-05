import { type ReactElement, type Ref, useEffect, useEffectEvent, useImperativeHandle, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { LatLng } from '@/api/types';
import { color, text } from '@/design-system';
import { useMotionAllowed } from '@/hooks/use-reduce-motion';
import { centreOf } from './campus';
import { RouteLine } from './plain-route';
import { Thing } from './plain-things';
import { type CameraRules, fit, inView, lowestZoom, type Point, sameCamera, settle, type Size } from './projection';
import type { MapCamera, MapHandle, MapMarker, MapProps } from './types';

// The camera of the plain ground, by the rules of `MapHandle`. It jumps: an animated move ends where it would.
function useCamera(
  rules: CameraRules,
  ref: Ref<MapHandle> | undefined,
  { onCameraIdle, onFitZoom }: Pick<MapProps, 'onCameraIdle' | 'onFitZoom'>,
): MapCamera {
  const [asked, setAsked] = useState<MapCamera>({ centre: centreOf(rules.bounds), zoom: rules.minZoom });
  const camera = settle(asked, rules);
  const { centre, zoom } = camera;
  const fitZoom = lowestZoom(rules);
  const report = useEffectEvent(() => {
    onCameraIdle?.(camera);
  });
  const reportFit = useEffectEvent(() => {
    onFitZoom?.(fitZoom);
  });
  // Before the camera's first report, and each time the view's size changes it.
  useEffect(() => {
    reportFit();
  }, [fitZoom]);
  // Once when the ground is first shown, and each time the camera rests somewhere else.
  useEffect(() => {
    report();
  }, [centre.latitude, centre.longitude, zoom]);
  useImperativeHandle(ref, () => {
    // A move that changes nothing keeps the camera as it is, and so sends nothing.
    const go = (next: (now: MapCamera) => MapCamera | null): void => {
      setAsked((last) => {
        const now = settle(last, rules);
        const then = next(now);
        return then === null || sameCamera(now, then) ? last : then;
      });
    };
    return {
      moveCamera: (move): void => {
        go((now) => settle({ centre: move.centre ?? now.centre, zoom: move.zoom ?? now.zoom }, rules));
      },
      fitTo: (points, options): void => {
        go(() => fit(points, options?.padding ?? 0, rules));
      },
    };
  }, [rules]);
  return camera;
}

// Higher on top; of two that are equal, the later in the list.
function ranked<Kind extends MapMarker>(things: readonly Kind[]): Kind[] {
  return things.toSorted((one, other) => (one.order ?? 0) - (other.order ?? 0));
}

// The map in a build without the native module: a plain ground that says so. It is no stand-in map: it has no
// tiles and draws no campus. It places what it was asked to show by position, with the camera it was asked for, so
// that a move of the camera or of an Avatar is seen and a screen can be laid out around it. A User cannot pan it.
export function PlainMap(props: MapProps): ReactElement {
  const { bounds, minZoom, maxZoom, markers, avatars, route, routeStyle, onPress, onCameraIdle, onFitZoom, ref } =
    props;
  const window = useWindowDimensions();
  // Until the ground is laid out it counts as large as the window, so that it is ready at once.
  const [laidOut, setLaidOut] = useState<Size | null>(null);
  const size = laidOut ?? { width: window.width, height: window.height };
  const camera = useCamera({ bounds, minZoom, maxZoom, size }, ref, { onCameraIdle, onFitZoom });
  const gliding = useMotionAllowed();
  const place = (position: LatLng): Point => inView(position, camera, size);
  return (
    <View
      onLayout={({ nativeEvent: { layout } }) => {
        setLaidOut({ width: layout.width, height: layout.height });
      }}
      style={styles.ground}
    >
      <Text style={styles.words}>지도는 Android 빌드에서 보입니다</Text>
      {route === null ? null : <RouteLine look={routeStyle} points={route.map((point) => place(point))} />}
      {ranked(markers).map((marker) => (
        <Thing glideMs={0} key={marker.id} onPress={onPress} place={place} thing={marker} view={size} />
      ))}
      {ranked(avatars).map((avatar) => (
        <Thing
          glideMs={gliding ? avatar.glideMs : 0}
          key={avatar.id}
          onPress={onPress}
          place={place}
          thing={avatar}
          view={size}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  ground: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: color.surfaceSubtle,
  },
  // Small and at the top, so that the words do not run through what is placed on the ground.
  words: { ...text.caption, position: 'absolute', top: 12, alignSelf: 'center', color: color.inkMuted },
});
