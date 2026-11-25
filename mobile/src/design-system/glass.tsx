/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-25  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { ReactElement, ReactNode } from 'react';
import { type StyleProp, StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';
import { glass } from './tokens';

// The glass layer's levels, from the outside in. What takes each is in the README's § Design system, Glass layer.
export type GlassLevel = 'panel' | 'inner' | 'field' | 'mapChip' | 'darkChip';

export const GLASS_LEVELS: readonly GlassLevel[] = ['panel', 'inner', 'field', 'mapChip', 'darkChip'];

interface GlassProps extends Omit<ViewProps, 'style' | 'children'> {
  level: GlassLevel;
  // The caller's layout: size, padding, radius, a border's width, how the children are laid out. The surface's
  // colours and shadow are the level's and win over the caller's.
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

// A see-through surface at a named level, for what the Assistant draws over the map. A caller gives a level and never
// a colour. The surface is drawn here alone, so that a blur (ticket A04-03) goes in behind the children here and no
// caller changes.
export function Glass({ level, style, children, ...view }: GlassProps): ReactElement {
  return (
    <View {...view} style={[style, surfaces[level]]}>
      {children}
    </View>
  );
}

const surfaces = StyleSheet.create({
  panel: {
    backgroundColor: glass.panel.ground,
    boxShadow: `${glass.panel.shadow}, ${glass.line}`,
  },
  inner: { backgroundColor: glass.inner.ground },
  field: { backgroundColor: glass.field.ground },
  mapChip: {
    backgroundColor: glass.mapChip.ground,
    borderColor: glass.mapChip.rim,
    boxShadow: `${glass.mapChip.shadow}, ${glass.line}`,
  },
  darkChip: { backgroundColor: glass.darkChip.ground },
});
