import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from './icon';
import { color, radius, size as sizes, space, text } from './tokens';

interface ChipProps {
  // The text. A hashtag keeps its `#`.
  children: string;
  selected?: boolean;
  // `sm` is the smaller chip of a card's tags.
  size?: 'md' | 'sm';
  // Makes the chip a toggle.
  onPress?: () => void;
  // Adds an × that removes the chip, as in the editing of a profile's hashtags.
  onRemove?: () => void;
}

const REMOVE_ICON = 14;
const REMOVE_PADDING = 2;
// The × reaches the design system's smallest touch area without growing the chip.
const REMOVE_HIT_SLOP = (sizes.touchMin - REMOVE_ICON - 2 * REMOVE_PADDING) / 2;

// A pill for an interest hashtag or a map filter. The toggle and the × are separate controls, side by side, so that
// a screen reader reaches each.
export function Chip({ children, selected = false, size = 'md', onPress, onRemove }: ChipProps): ReactElement {
  const labelColor = selected ? color.snuBlue : color.ink;
  const label = (
    <>
      {selected && onRemove === undefined ? <Icon color={labelColor} name="check" size={14} /> : null}
      <Text numberOfLines={1} style={[size === 'sm' ? styles.labelSm : styles.label, { color: labelColor }]}>
        {children}
      </Text>
    </>
  );
  return (
    <View style={[styles.chip, size === 'sm' && styles.sm, selected && styles.selected]}>
      {onPress === undefined ? (
        label
      ) : (
        <Pressable
          accessibilityLabel={children}
          accessibilityRole="button"
          accessibilityState={{ selected }}
          hitSlop={space[2]}
          onPress={onPress}
          style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}
        >
          {label}
        </Pressable>
      )}
      {onRemove === undefined ? null : (
        <Pressable
          accessibilityLabel={`${children} 삭제`}
          accessibilityRole="button"
          hitSlop={REMOVE_HIT_SLOP}
          onPress={onRemove}
          style={styles.remove}
        >
          <Icon color={labelColor} name="x" size={REMOVE_ICON} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: space[1],
    height: 32,
    paddingHorizontal: space[3],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surface,
  },
  sm: { height: 28 },
  selected: {
    backgroundColor: color.blue100,
    borderColor: color.snuBlue,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
  },
  pressed: { opacity: 0.6 },
  label: { ...text.label },
  labelSm: { ...text.label, fontSize: 12 },
  remove: {
    marginRight: -space[1],
    padding: REMOVE_PADDING,
    borderRadius: radius.full,
  },
});
