/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { ReactElement, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { color, mapText, radius, text } from './tokens';

interface MapMarkBadgeProps {
  // A pin stands on its tip, so its box grows at the sides and the top; a dot sits on its middle and grows at every
  // side. Either way the point it stands on stays where it was.
  form: 'dot' | 'pin';
  // "!" at the upper left, outside the glyph and clear of a pin's count: something newly posted for the User.
  fresh?: boolean;
  // Drawn faint: shown for want of anything the User watches.
  faded?: boolean;
  // A tag with its name in it: faded less, so that the name stays readable over the map's own words.
  named?: boolean;
  children: ReactNode;
}

const BADGE = 14;
// As the "+" of a person's marker: the box grows this much, so that the badge lies outside the glyph and whole inside
// the box the picture is made from.
const BADGE_ROOM = 6;

// An interest mark around a place's pin or dot, or a group's, on the everyday map.
export function MapMarkBadge({
  form,
  fresh = false,
  faded = false,
  named = false,
  children,
}: MapMarkBadgeProps): ReactElement {
  const room = fresh ? BADGE_ROOM : 0;
  return (
    <View
      style={[
        styles.box,
        { paddingTop: room, paddingHorizontal: room, paddingBottom: form === 'dot' ? room : 0 },
        faded && (named ? styles.namedFaded : styles.faded),
      ]}
    >
      {children}
      {fresh ? (
        <View style={styles.badge}>
          <Text style={styles.mark}>!</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignSelf: 'flex-start' },
  faded: { opacity: 0.5 },
  namedFaded: { opacity: 0.75 },
  badge: {
    position: 'absolute',
    top: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    width: BADGE,
    height: BADGE,
    borderRadius: radius.full,
    backgroundColor: color.snuBlue,
  },
  mark: { ...text.micro, fontFamily: mapText.smallTitle.fontFamily, letterSpacing: 0, color: color.onPrimary },
});
