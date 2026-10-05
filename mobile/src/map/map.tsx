import { type ComponentType, type ReactElement, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { color, space, text } from '@/design-system';
import { hasNativeMap } from './native-module';
import { PlainMap } from './plain-map';
import type { MapProps } from './types';

function holdsMap(file: unknown): file is { default: ComponentType<MapProps> } {
  return typeof file === 'object' && file !== null && 'default' in file && typeof file.default === 'function';
}

// Chosen while the app runs. The native map's file is asked for here and not imported at the top, so that it is
// loaded only in a build that holds the native map module.
function chooseMap(): ComponentType<MapProps> {
  if (!hasNativeMap()) {
    return PlainMap;
  }
  const file: unknown = require('./native-map');
  return holdsMap(file) ? file.default : PlainMap;
}

// The one component a screen uses to show a map. It chooses while the app runs: the native map in a build that
// holds the module, the plain ground anywhere else. The credit for the map data is on every one.
export function Map({ style, ...props }: MapProps): ReactElement {
  const [Chosen] = useState(chooseMap);
  return (
    <View style={[styles.map, style]}>
      <Chosen {...props} />
      <Text style={styles.credit}>© OpenStreetMap · 국토지리정보원</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1, backgroundColor: color.surfaceSubtle },
  credit: {
    ...text.micro,
    position: 'absolute',
    left: space[2],
    bottom: space[2],
    color: color.inkMuted,
    pointerEvents: 'none',
  },
});
