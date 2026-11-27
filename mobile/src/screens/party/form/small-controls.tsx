/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { color, font, Icon, type IconName, radius } from '@/design-system';

// The small controls of '파티 설정': a two-part toggle and the stepper's round buttons.

interface ToggleProps<Key extends string> {
  label: string;
  options: readonly { key: Key; label: string; icon?: IconName }[];
  selected: Key;
  onSelect: (key: Key) => void;
}

// A small two-part toggle: a grey track and the chosen part white and raised.
export function SmallToggle<Key extends string>({
  label,
  options,
  selected,
  onSelect,
}: ToggleProps<Key>): ReactElement {
  return (
    <View accessibilityLabel={label} accessibilityRole="radiogroup" style={styles.track}>
      {options.map((option) => {
        const on = option.key === selected;
        return (
          <Pressable
            accessibilityLabel={option.label}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            key={option.key}
            onPress={() => {
              Keyboard.dismiss();
              onSelect(option.key);
            }}
            style={[styles.part, on && styles.partOn]}
          >
            {option.icon === undefined ? null : (
              <Icon color={on ? color.snuBlue : color.inkMuted} name={option.icon} size={12} />
            )}
            <Text style={[styles.partWords, on && styles.partWordsOn]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function StepButton({ icon, label, onPress, disabled }: StepButtonProps): ReactElement {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={STEP_SLOP}
      onPress={onPress}
      style={[styles.step, disabled && styles.stepOff]}
    >
      <Icon color={disabled ? color.inkFaint : color.ink} name={icon} size={16} />
    </Pressable>
  );
}

interface StepButtonProps {
  icon: 'minus' | 'plus';
  label: string;
  onPress: () => void;
  disabled: boolean;
}

const STEP = 32;
const STEP_SLOP = (48 - STEP) / 2;
const TOGGLE = 30;

const styles = StyleSheet.create({
  step: {
    alignItems: 'center',
    justifyContent: 'center',
    width: STEP,
    height: STEP,
    borderWidth: 1,
    borderColor: color.borderStrong,
    borderRadius: radius.full,
  },
  stepOff: { borderColor: color.border },
  track: {
    flexDirection: 'row',
    height: TOGGLE,
    padding: 2,
    borderRadius: radius.sm + 2,
    backgroundColor: color.surfaceSunken,
  },
  part: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
  },
  partOn: { backgroundColor: color.surface, boxShadow: '0 1px 2px rgba(14, 19, 48, 0.12)' },
  partWords: { fontFamily: font.medium, fontSize: 13, lineHeight: 18, color: color.inkMuted },
  partWordsOn: { fontFamily: font.bold, color: color.snuBlue },
});
