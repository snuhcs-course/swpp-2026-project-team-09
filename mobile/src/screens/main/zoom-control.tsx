// AI-generated with Claude Opus 5.5, 2026-10-06, prompted by AhnJinYoung
import type { ReactElement } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { color, Icon, type IconName, radius, shadow } from '@/design-system';
import { ZOOM_CONTROL } from './layout';

interface ZoomControlProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onMyPosition: () => void;
}

interface ControlProps {
  label: string;
  icon: IconName;
  iconSize: number;
  tint: string;
  onPress: () => void;
}

function Control({ label, icon, iconSize, tint, onPress }: ControlProps): ReactElement {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={HIT_SLOP}
      onPress={onPress}
      style={({ pressed }) => [styles.control, pressed && styles.pressed]}
    >
      <Icon color={tint} name={icon} size={iconSize} />
    </Pressable>
  );
}

// The `Main` frame's zoom control: zoom in, zoom out and "내 위치로 이동" in one white pill at the right of the map.
export function ZoomControl({ onZoomIn, onZoomOut, onMyPosition }: ZoomControlProps): ReactElement {
  return (
    <View style={styles.pill}>
      <Control icon="plus" iconSize={20} label="확대" onPress={onZoomIn} tint={color.ink} />
      <View style={styles.divider} />
      <Control icon="minus" iconSize={20} label="축소" onPress={onZoomOut} tint={color.ink} />
      <View style={styles.divider} />
      <Control icon="route" iconSize={18} label="내 위치로 이동" onPress={onMyPosition} tint={color.snuBlue} />
    </View>
  );
}

// The frame's buttons are 44; the room around each brings its touch area to the design system's minimum.
const CONTROL = 44;
const HIT_SLOP = 2;

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    right: ZOOM_CONTROL.right,
    bottom: ZOOM_CONTROL.bottom,
    alignItems: 'center',
    width: CONTROL,
    borderRadius: radius.full,
    backgroundColor: color.surface,
    boxShadow: shadow.float,
  },
  control: {
    alignItems: 'center',
    justifyContent: 'center',
    width: CONTROL,
    height: CONTROL,
    borderRadius: radius.full,
  },
  pressed: { backgroundColor: color.surfaceSunken },
  divider: { width: 24, height: 1, backgroundColor: color.border },
});
