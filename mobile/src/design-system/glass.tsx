/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-25  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-26  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import type { ReactElement, ReactNode } from 'react';
import { type StyleProp, StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';
import { glass } from './tokens';

// The glass layer's levels, from the outside in. What takes each is in the README's § Design system, Glass layer.
export type GlassLevel = 'panel' | 'inner' | 'field' | 'mapChip' | 'darkChip';

export const GLASS_LEVELS: readonly GlassLevel[] = ['panel', 'inner', 'field', 'mapChip', 'darkChip'];

interface GlassProps extends Omit<ViewProps, 'style' | 'children'> {
  level: GlassLevel;
  // The caller's layout: size, padding, radius, how the children are laid out. The surface's colours, shadow and the
  // map chip's rim are the level's and win over the caller's.
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

// A see-through surface at a named level, for what the Assistant draws over the map. A caller gives a level and never
// a colour.
//
// A panel blurs what is behind it where the phone can blur the map: iOS 26 and later, with the system's Liquid Glass,
// which blurs as the screen is composed. Its own white then lies over the blur at the board's 50%. Android cannot
// blur the Kakao map, which draws on a surface of its own that a view's blur never sees (A04-03), nor can iOS before
// 26; there the panel is a denser white with no blur.
export function Glass({ level, style, children, ...view }: GlassProps): ReactElement {
  if (level !== 'panel' || !isLiquidGlassAvailable()) {
    return (
      <View {...view} style={[style, surfaces[level]]}>
        {children}
      </View>
    );
  }
  const { borderRadius } = StyleSheet.flatten(style) ?? {};
  return (
    <View {...view} style={[style, surfaces.panelShadow]}>
      <GlassView glassEffectStyle="regular" pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius }]} />
      <View style={[StyleSheet.absoluteFill, surfaces.panelOverBlur, { borderRadius }]} testID="glass-white" />
      {children}
    </View>
  );
}

const surfaces = StyleSheet.create({
  panel: {
    backgroundColor: glass.panel.ground,
    boxShadow: `${glass.panel.shadow}, ${glass.line}`,
  },
  // A blurred panel: the shadow on the panel, and the white and its line on a layer over the blur, which would hide
  // them if they were on the panel itself.
  panelShadow: { backgroundColor: 'transparent', boxShadow: glass.panel.shadow },
  panelOverBlur: { backgroundColor: glass.panel.overBlur, boxShadow: glass.line, pointerEvents: 'none' },
  inner: { backgroundColor: glass.inner.ground },
  field: { backgroundColor: glass.field.ground },
  mapChip: {
    backgroundColor: glass.mapChip.ground,
    borderWidth: 1,
    borderColor: glass.mapChip.rim,
    boxShadow: `${glass.mapChip.shadow}, ${glass.line}`,
  },
  darkChip: { backgroundColor: glass.darkChip.ground },
});
