/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-17  Opus 5.5   prompted by fyoon46
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, type StyleProp, StyleSheet, Text, type ViewStyle } from 'react-native';
import { Icon, type IconName } from './icon';
import { WaitingDots } from './waiting-dots';
import { color, font, radius, size as sizes, space, text, tutorialTone } from './tokens';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'destructive' | 'done';

interface CommonProps {
  // One `primary` per screen or sheet; everything else is `secondary` or `ghost`. `danger` is for an action that
  // revokes sharing or leaves a Party, and is always confirmed; `destructive`, red and filled, is the answer of a
  // dialog that confirms it. `done`, green and filled, says a 새내기 튜토리얼 quest is done (✓ 완료).
  variant?: Variant;
  // `md` is 40 points high inside a 48-point touch area; `lg` is the full-width button at the foot of a sheet or form;
  // `bar` is the answer's main button beside the AI input: the input's own height and fully rounded corners.
  size?: 'md' | 'lg' | 'bar';
  // Stretches to the container's width.
  full?: boolean;
  // Stands in the middle of the container's width, where it would otherwise stand at its start.
  centred?: boolean;
  // Shown before the label.
  icon?: IconName;
  disabled?: boolean;
  // What it asked is on its way: the dots stand in place of the label, in its colour, and it takes no press.
  busy?: boolean;
  onPress?: () => void;
}

type ButtonProps = CommonProps &
  (
    | {
        // The label: a short Korean verb, such as "참여하기".
        children: string;
        // A fuller accessible name where the label alone is ambiguous, such as one of many cards' "관심 없음".
        label?: string;
      }
    // Without words, an `md` button is the icon alone in a square of 40, such as the 파티 member row's, and `label`
    // is what a screen reader says.
    | { children?: undefined; icon: IconName; label: string; size?: 'md'; full?: false }
  );

const LABEL_COLOR: Record<Variant, string> = {
  primary: color.onPrimary,
  secondary: color.snuBlue,
  ghost: color.blue600,
  danger: color.danger,
  destructive: color.onPrimary,
  done: color.onPrimary,
};

// The touch area of an `md` button reaches the design system's minimum without growing the button.
const MD_HEIGHT = 40;
// The AI input's height for one line (`AI_INPUT.height` of the main screen's layout).
const BAR_HEIGHT = 50;
const MD_HIT_SLOP = (sizes.touchMin - MD_HEIGHT) / 2;
const ICON_ALONE = 20;

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  full = false,
  centred = false,
  icon,
  disabled = false,
  busy = false,
  onPress,
  label,
}: ButtonProps): ReactElement {
  const labelColor = disabled ? color.inkMuted : LABEL_COLOR[variant];
  const alone = children === undefined;
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      hitSlop={size === 'md' ? MD_HIT_SLOP : undefined}
      onPress={onPress}
      style={({ pressed }): StyleProp<ViewStyle> => [
        styles.base,
        styles[size],
        full ? styles.full : styles.hug,
        alone && styles.alone,
        centred && !full && styles.centred,
        styles[variant],
        pressed && pressedStyles[variant],
        disabled && styles.disabled,
      ]}
    >
      {busy ? (
        <WaitingDots label={`${label ?? children ?? ''} · 보는 중`} tint={labelColor} />
      ) : (
        <>
          {icon === undefined ? null : (
            <Icon color={labelColor} name={icon} size={alone ? ICON_ALONE : size === 'md' ? 18 : 20} />
          )}
          {alone ? null : (
            <Text numberOfLines={1} style={[size === 'md' ? styles.label : styles.labelLg, { color: labelColor }]}>
              {children}
            </Text>
          )}
        </>
      )}
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
  bar: { height: BAR_HEIGHT, paddingHorizontal: space[5], borderRadius: radius.full },
  full: { alignSelf: 'stretch' },
  hug: { alignSelf: 'flex-start' },
  alone: { width: MD_HEIGHT, paddingHorizontal: 0 },
  centred: { alignSelf: 'center' },
  primary: { backgroundColor: color.snuBlue },
  secondary: { backgroundColor: color.surface, borderColor: color.borderStrong },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: color.surface, borderColor: color.danger },
  destructive: { backgroundColor: color.danger },
  done: { backgroundColor: tutorialTone.done },
  disabled: { backgroundColor: color.surfaceSunken, borderColor: 'transparent' },
  label: { ...text.label },
  labelLg: { ...text.bodyLg, fontFamily: font.semiBold },
});

// Pressed: a fill darkens, and a ground is tinted.
const pressedStyles = StyleSheet.create({
  primary: { backgroundColor: color.snuBluePressed },
  secondary: { backgroundColor: color.blue50 },
  ghost: { backgroundColor: color.blue50 },
  danger: { backgroundColor: color.dangerSoft },
  destructive: { opacity: 0.85 },
  done: { opacity: 0.85 },
});
