import { type ReactElement, useEffect, useEffectEvent, useImperativeHandle, useRef } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { color, size, space, text } from '@/design-system';
import { centreOf, keepInside, keepZoom } from './campus';
import type { MapCamera, MapMarker, MapProps } from './types';

// One thing the map was asked to show: its picture when there is one and its text, as a map would draw them, and
// its name for a screen reader. Without a picture and a text, the name is shown so that it is not empty.
function Shown({ marker, onPress }: { marker: MapMarker; onPress?: (id: string) => void }): ReactElement {
  const { id, name, image, text: words } = marker;
  return (
    <Pressable
      accessibilityLabel={name}
      accessibilityRole="button"
      onPress={() => {
        onPress?.(id);
      }}
      style={styles.shown}
      testID={image.look}
    >
      {image.uri === null ? null : (
        <Image
          source={{ uri: image.uri }}
          style={{ width: image.width, height: image.height }}
          testID={`${image.look}:picture`}
        />
      )}
      {words === undefined ? null : <Text style={styles.shownText}>{words}</Text>}
      {image.uri === null && words === undefined ? <Text style={styles.shownText}>{name}</Text> : null}
    </Pressable>
  );
}

// The map in a build without the native module: a plain ground that says so. It is no stand-in map. It lists what
// it was asked to show, so that a screen reader and a test read a marker's name and press it, and it keeps the
// camera it was asked for, so that a screen's zoom buttons and detail work as on a map.
export function PlainMap(props: MapProps): ReactElement {
  const { bounds, minZoom, maxZoom, markers, avatars, route, onPress, onCameraIdle, ref } = props;
  const camera = useRef<MapCamera>({ centre: centreOf(bounds), zoom: minZoom });
  const report = useEffectEvent(() => {
    onCameraIdle?.(camera.current);
  });
  useEffect(() => {
    report();
  }, []);
  useImperativeHandle(
    ref,
    () => ({
      moveCamera: ({ centre, zoom }): void => {
        camera.current = {
          centre: keepInside(centre ?? camera.current.centre, bounds),
          zoom: keepZoom(zoom ?? camera.current.zoom, minZoom, maxZoom),
        };
        onCameraIdle?.(camera.current);
      },
    }),
    [bounds, minZoom, maxZoom, onCameraIdle],
  );
  return (
    <View style={styles.ground}>
      <Text style={styles.words}>지도는 Android 빌드에서 보입니다</Text>
      <View style={styles.list}>
        {[...markers, ...avatars].map((marker) => (
          <Shown key={marker.id} marker={marker} onPress={onPress} />
        ))}
      </View>
      {route === null ? null : <Text style={styles.route}>경로가 그려져 있습니다</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  ground: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[3],
    padding: space[4],
    backgroundColor: color.surfaceSubtle,
  },
  words: { ...text.body, color: color.inkMuted },
  list: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[1],
  },
  shown: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: size.touchMin,
    minHeight: size.touchMin,
  },
  shownText: { ...text.micro, color: color.ink },
  route: { ...text.caption, color: color.inkMuted },
});
