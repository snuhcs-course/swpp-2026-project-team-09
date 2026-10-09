// AI-generated with Claude Opus 5.5, 2026-10-05 to 2026-10-08, prompted by AhnJinYoung and fyoon46
import { type ComponentType, type ReactElement, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
// of what the screen's controls leave of the map (`inset`), drawn by the app over the map. With `onCreditPress` it is
// a button that opens the sources.
export function Map({ style, onCreditPress, ...props }: MapProps): ReactElement {
  const [Chosen] = useState(chooseMap);
  const { left = 0, bottom = 0 } = props.inset ?? {};
  const place = { left: CREDIT_MARGIN + left, bottom: CREDIT_MARGIN + bottom };
  const credit = <Text style={[styles.credit, onCreditPress === undefined && [styles.placed, place]]}>{CREDIT}</Text>;
  return (
    <View style={[styles.map, style]}>
      <Chosen {...props} />
      {onCreditPress === undefined ? (
        credit
      ) : (
        <Pressable
          accessibilityLabel="지도 데이터 출처 보기"
          accessibilityRole="button"
          hitSlop={CREDIT_MARGIN}
          onPress={onCreditPress}
          style={[styles.placed, place]}
        >
          {credit}
        </Pressable>
      )}
    </View>
  );
}

const CREDIT = '© OpenStreetMap · 국토지리정보원';

// Between the credit and the edges of what is left of the map.
const CREDIT_MARGIN = space[2];

// What the credit takes above the bottom of what is left of the map: its margin and its one line. A screen keeps
// that strip free at the left.
export const CREDIT_ROOM = CREDIT_MARGIN + text.micro.lineHeight;

const styles = StyleSheet.create({
  map: { flex: 1, backgroundColor: color.surfaceSubtle },
  credit: { ...text.micro, color: color.inkMuted, pointerEvents: 'none' },
  placed: { position: 'absolute' },
});
