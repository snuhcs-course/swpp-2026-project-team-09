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
// holds the module, the plain ground anywhere else. The credit for the map data is on every one, at the bottom left
// of what the screen's controls leave of the map (`inset`).
export function Map({ style, ...props }: MapProps): ReactElement {
  const [Chosen] = useState(chooseMap);
  const { left = 0, bottom = 0 } = props.inset ?? {};
  return (
    <View style={[styles.map, style]}>
      <Chosen {...props} />
      <Text style={[styles.credit, { left: CREDIT_MARGIN + left, bottom: CREDIT_MARGIN + bottom }]}>
        © OpenStreetMap · 국토지리정보원
      </Text>
    </View>
  );
}

// Between the credit and the edges of what is left of the map.
const CREDIT_MARGIN = space[2];

const styles = StyleSheet.create({
  map: { flex: 1, backgroundColor: color.surfaceSubtle },
  credit: {
    ...text.micro,
    position: 'absolute',
    color: color.inkMuted,
    pointerEvents: 'none',
  },
});
