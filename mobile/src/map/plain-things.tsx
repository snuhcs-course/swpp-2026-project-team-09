/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-06  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { type ReactElement, type ReactNode, useEffect, useEffectEvent, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { LatLng } from '@/api/types';
import { color, font, radius, shadow } from '@/design-system';
import { LookView, standsOnTip } from './marker-looks';
import type { Point, Size } from './projection';
import type { MapMarker } from './types';

const STILL = { x: 0, y: 0 };

// How far from its position a thing is drawn while it glides there. It follows the rules of `MapAvatar`: a glide
// starts only when the position differs from the last target, and from where the thing is shown.
function useGlide(position: LatLng, glideMs: number, place: (position: LatLng) => Point): Animated.ValueXY {
  const [offset] = useState(() => new Animated.ValueXY());
  const target = useRef(position);
  const move = useEffectEvent(() => {
    const from = target.current;
    target.current = position;
    if (from.latitude === position.latitude && from.longitude === position.longitude) {
      return;
    }
    offset.stopAnimation((shown) => {
      if (glideMs <= 0) {
        offset.setValue(STILL);
        return;
      }
      const [before, after] = [place(from), place(position)];
      offset.setValue({ x: before.x + shown.x - after.x, y: before.y + shown.y - after.y });
      Animated.timing(offset, {
        toValue: STILL,
        duration: glideMs,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    });
  });
  useEffect(() => {
    move();
  }, [position.latitude, position.longitude]);
  return offset;
}

interface ThingProps {
  thing: MapMarker;
  // 0 for what does not glide, and for an Avatar while the phone asks for less motion.
  glideMs: number;
  // Where a position is in the view now.
  place: (position: LatLng) => Point;
  view: Size;
  onPress?: (id: string) => void;
}

// The look of a thing, unread: its name is said by what holds it.
function Look({ thing, onSize }: { thing: MapMarker; onSize: (size: Size) => void }): ReactElement {
  return (
    <View
      accessibilityElementsHidden
      aria-hidden
      importantForAccessibility="no-hide-descendants"
      onLayout={({ nativeEvent: { layout } }) => {
        onSize({ width: layout.width, height: layout.height });
      }}
    >
      <LookView look={thing.image.view} />
    </View>
  );
}

// What holds a thing's look and says its name: a button, or for a passive thing a picture that takes no press, so
// that a press on it reaches what is drawn under it.
function Held({
  thing,
  onPress,
  children,
}: Pick<ThingProps, 'thing' | 'onPress'> & { children: ReactNode }): ReactElement {
  const { id, name, image, passive } = thing;
  if (passive === true) {
    return (
      <View accessibilityLabel={name} accessibilityRole="image" accessible style={styles.passive} testID={image.look}>
        {children}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityLabel={name}
      accessibilityRole="button"
      hitSlop={HIT_SLOP}
      onPress={() => {
        onPress?.(id);
      }}
      testID={image.look}
    >
      {children}
    </Pressable>
  );
}

// A marker or an Avatar on the plain ground: the design system's own view of its look, standing on its position,
// with its text under it. One outside the view is not drawn, and stays in the tree under its name, so that a screen
// reader and a test reach everything the map was asked to show.
export function Thing({ thing, glideMs, place, view, onPress }: ThingProps): ReactElement {
  const { position, image, text: words, passive } = thing;
  const offset = useGlide(position, glideMs, place);
  const [box, setBox] = useState<Size>({ width: 0, height: 0 });
  const at = place(position);
  const seen = at.x >= 0 && at.x <= view.width && at.y >= 0 && at.y <= view.height;
  const top = at.y - (standsOnTip(image.view) ? box.height : box.height / 2);
  return (
    <Animated.View
      style={
        seen
          ? [
              styles.thing,
              passive === true && styles.passive,
              { left: at.x - box.width / 2, top, transform: offset.getTranslateTransform() },
            ]
          : styles.unseen
      }
    >
      <Held onPress={onPress} thing={thing}>
        {seen ? <Look onSize={setBox} thing={thing} /> : null}
      </Held>
      {seen && words !== undefined ? (
        <View style={styles.under}>
          <Text numberOfLines={1} style={styles.words}>
            {words}
          </Text>
        </View>
      ) : null}
    </Animated.View>
  );
}

const HIT_SLOP = 12;
const UNDER_WIDTH = 160;

const styles = StyleSheet.create({
  thing: { position: 'absolute' },
  passive: { pointerEvents: 'none' },
  // In the tree for a screen reader, and too small to see.
  unseen: { position: 'absolute', left: 0, top: 0, width: 1, height: 1, overflow: 'hidden' },
  under: {
    position: 'absolute',
    top: '100%',
    left: '50%',
    width: UNDER_WIDTH,
    marginLeft: -UNDER_WIDTH / 2,
    marginTop: 3,
    alignItems: 'center',
    pointerEvents: 'none',
  },
  // The `Main` frame's name under a marker: 11/16 in the bold weight on a white round, 3 under the marker's foot.
  words: {
    fontFamily: font.bold,
    fontSize: 11,
    lineHeight: 16,
    paddingVertical: 1,
    paddingHorizontal: 7,
    borderRadius: radius.full,
    color: color.ink,
    backgroundColor: color.surface,
    boxShadow: shadow.mapName,
  },
});
