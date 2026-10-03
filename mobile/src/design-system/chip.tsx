import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from './icon';
import { color, radius, space, text } from './tokens';

interface ChipProps {
  // The text. A hashtag keeps its `#`.
  children: string;
  selected?: boolean;
  // Makes the chip a toggle.
  onPress?: () => void;
  // Adds an × that removes the chip, as in the editing of a profile's hashtags.
  onRemove?: () => void;
}

// A pill for an interest hashtag or a map filter.
export function Chip({ children, selected = false, onPress, onRemove }: ChipProps): ReactElement {
  const labelColor = selected ? color.snuBlue : color.ink;
  const content = (
    <>
      {selected && onRemove === undefined ? <Icon color={labelColor} name="check" size={14} /> : null}
      <Text numberOfLines={1} style={[styles.label, { color: labelColor }]}>
        {children}
      </Text>
      {onRemove === undefined ? null : (
        <Pressable
          accessibilityLabel={`${children} 삭제`}
          accessibilityRole="button"
          hitSlop={space[2]}
          onPress={onRemove}
          style={styles.remove}
        >
          <Icon color={labelColor} name="x" size={14} />
        </Pressable>
      )}
    </>
  );
  const style = [styles.chip, selected && styles.selected];
  if (onPress === undefined) {
    return <View style={style}>{content}</View>;
  }
  return (
    <Pressable
      accessibilityLabel={children}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      hitSlop={space[2]}
      onPress={onPress}
      style={style}
    >
      {content}
    </Pressable>
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
  selected: {
    backgroundColor: color.blue100,
    borderColor: color.snuBlue,
  },
  label: { ...text.label },
  remove: {
    marginRight: -space[1],
    padding: 2,
    borderRadius: radius.full,
  },
});
