/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { type ReactElement, type RefObject, useState } from 'react';
import { type StyleProp, StyleSheet, TextInput, type TextStyle } from 'react-native';
import { color, radius, size, space, text } from '@/design-system';
import { cut } from './length';

// The frame's mark of the field that has the focus: the key colour's border and a pale ring around it.
const FOCUS_RING = `0 0 0 3px ${color.blue100}`;

interface InputProps {
  // What a screen reader calls the field. The words above it are drawn by the screen.
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  // The most characters the field takes. What is typed or pasted beyond it is dropped.
  most?: number;
  onFocus?: () => void;
  onBlur?: () => void;
  // The keyboard's own button.
  onSubmit?: () => void;
  // Tells a screen reader what is wrong with what was typed.
  hint?: string;
  style?: StyleProp<TextStyle>;
  ref?: RefObject<TextInput | null>;
}

// A text input as the `Onboarding` frame draws it, with no label of its own: Onboarding's labels carry a badge, and
// its fields an icon or a button beside them.
export function Input({ label, value, onChangeText, placeholder, most, style, ref, ...on }: InputProps): ReactElement {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      accessibilityHint={on.hint}
      accessibilityLabel={label}
      onBlur={() => {
        setFocused(false);
        on.onBlur?.();
      }}
      onChangeText={(typed) => {
        onChangeText(most === undefined ? typed : cut(typed, most));
      }}
      onFocus={() => {
        setFocused(true);
        on.onFocus?.();
      }}
      onSubmitEditing={on.onSubmit}
      placeholder={placeholder}
      placeholderTextColor={color.inkSubtle}
      ref={ref}
      // The keyboard stays for the next interest; a field without a button of its own closes it.
      submitBehavior={on.onSubmit === undefined ? 'blurAndSubmit' : 'submit'}
      style={[styles.input, focused && styles.focused, style]}
      value={value}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    ...text.bodyLg,
    height: size.touchMin,
    paddingVertical: 0,
    paddingHorizontal: space[4],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    color: color.ink,
    backgroundColor: color.surface,
    // The web's own outline of a focused field: the border and the ring say it here.
    outlineWidth: 0,
    outlineStyle: 'solid',
    outlineColor: 'transparent',
  },
  focused: { borderColor: color.snuBlue, boxShadow: FOCUS_RING },
});
