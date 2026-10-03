import { type ReactElement, useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { color, radius, size, space, text } from './tokens';

interface SwitchProps {
  label: string;
  // What turning it on means, in one sentence. A sharing switch names who will see the location.
  description?: string;
  // The switch shows what it is given. A press asks for the other state through `onChange` and changes nothing by
  // itself, so that the owner can ask the User first.
  checked: boolean;
  onChange?: (checked: boolean) => void;
}

const TRACK_WIDTH = 52;
const TRACK_HEIGHT = 32;
const KNOB = 20;
const KNOB_TRAVEL = 20;
const SLIDE_MS = 150;

// An on/off control for settings, above all Location Sharing.
export function Switch({ label, description, checked, onChange }: SwitchProps): ReactElement {
  const reduceMotion = useReduceMotion();
  const [position] = useState(() => new Animated.Value(checked ? 1 : 0));
  useEffect(() => {
    const slide = Animated.timing(position, {
      toValue: checked ? 1 : 0,
      duration: reduceMotion ? 0 : SLIDE_MS,
      useNativeDriver: true,
    });
    slide.start();
    return (): void => {
      slide.stop();
    };
  }, [checked, position, reduceMotion]);
  return (
    <Pressable
      accessibilityHint={description}
      accessibilityLabel={label}
      accessibilityRole="switch"
      accessibilityState={{ checked }}
      onPress={() => onChange?.(!checked)}
      style={styles.row}
    >
      <View style={styles.words}>
        <Text style={styles.label}>{label}</Text>
        {description === undefined ? null : <Text style={styles.description}>{description}</Text>}
      </View>
      <View style={[styles.track, checked && styles.trackOn]}>
        <Animated.View
          style={[
            styles.knob,
            checked && styles.knobOn,
            {
              transform: [{ translateX: position.interpolate({ inputRange: [0, 1], outputRange: [0, KNOB_TRAVEL] }) }],
            },
          ]}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[4],
    minHeight: size.touchMin,
  },
  words: { flex: 1, gap: 2 },
  label: { ...text.body, color: color.ink },
  description: { ...text.caption, color: color.inkMuted },
  track: {
    justifyContent: 'center',
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    paddingHorizontal: 4,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceSubtle,
  },
  trackOn: { borderColor: color.snuBlue, backgroundColor: color.snuBlue },
  knob: {
    width: KNOB,
    height: KNOB,
    borderRadius: radius.full,
    backgroundColor: color.borderStrong,
  },
  knobOn: { backgroundColor: color.onPrimary },
});
