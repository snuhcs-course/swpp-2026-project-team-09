import type { ReactElement } from 'react';
import { Pressable, type StyleProp, StyleSheet, Text, type ViewStyle } from 'react-native';
import { Icon, type IconName } from './icon';
import { color, font, radius, size as sizes, space, text } from './tokens';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps {
  // The label: a short Korean verb, such as "참여하기".
  children: string;
  // One `primary` per screen or sheet; everything else is `secondary` or `ghost`. `danger` is for an action that
  // revokes sharing or leaves a Party, and is always confirmed.
  variant?: Variant;
  // `md` is 40 points high inside a 48-point touch area; `lg` is the full-width button at the foot of a sheet or form.
  size?: 'md' | 'lg';
  // Stretches to the container's width.
  full?: boolean;
  // Shown before the label.
  icon?: IconName;
  disabled?: boolean;
  onPress?: () => void;
}

const LABEL_COLOR: Record<Variant, string> = {
  primary: color.onPrimary,
  secondary: color.snuBlue,
  ghost: color.blue600,
  danger: color.danger,
};

// The touch area of an `md` button reaches the design system's minimum without growing the button.
const MD_HEIGHT = 40;
const MD_HIT_SLOP = (sizes.touchMin - MD_HEIGHT) / 2;

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  full = false,
  icon,
  disabled = false,
  onPress,
}: ButtonProps): ReactElement {
  const labelColor = disabled ? color.inkMuted : LABEL_COLOR[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={size === 'md' ? MD_HIT_SLOP : undefined}
      onPress={onPress}
      style={({ pressed }): StyleProp<ViewStyle> => [
        styles.base,
        size === 'lg' ? styles.lg : styles.md,
        full ? styles.full : styles.hug,
        styles[variant],
        pressed && pressedStyles[variant],
        disabled && styles.disabled,
      ]}
    >
      {icon === undefined ? null : <Icon color={labelColor} name={icon} size={size === 'lg' ? 20 : 18} />}
      <Text numberOfLines={1} style={[size === 'lg' ? styles.labelLg : styles.label, { color: labelColor }]}>
        {children}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  md: { height: MD_HEIGHT, paddingHorizontal: space[4] },
  lg: { height: sizes.button, paddingHorizontal: space[5] },
  full: { alignSelf: 'stretch' },
  hug: { alignSelf: 'flex-start' },
  primary: { backgroundColor: color.snuBlue },
  secondary: { backgroundColor: color.surface, borderColor: color.borderStrong },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: color.surface, borderColor: color.danger },
  disabled: { backgroundColor: color.surfaceSunken, borderColor: 'transparent' },
  label: { ...text.label },
  labelLg: { fontFamily: font.semiBold, fontSize: 16, lineHeight: 24 },
});

// Pressed: a fill darkens, and a ground is tinted.
const pressedStyles = StyleSheet.create({
  primary: { backgroundColor: color.snuBluePressed },
  secondary: { backgroundColor: color.blue50 },
  ghost: { backgroundColor: color.blue50 },
  danger: { backgroundColor: color.dangerSoft },
});
