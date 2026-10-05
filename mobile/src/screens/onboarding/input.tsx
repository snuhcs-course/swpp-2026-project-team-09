import { type ReactElement, type RefObject, useState } from 'react';
import { type StyleProp, StyleSheet, TextInput, type TextStyle } from 'react-native';
import { color, radius, size, space, text } from '@/design-system';

// The design system's outline of a field that has the focus, as its TextField draws it.
const FOCUS_RING = `0 0 0 1px ${color.focusRing}`;

interface InputProps {
  // What a screen reader calls the field. The words above it are drawn by the screen.
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  onFocus?: () => void;
  // The keyboard's own button.
  onSubmit?: () => void;
  style?: StyleProp<TextStyle>;
  ref?: RefObject<TextInput | null>;
}

// A text input with the look of the design system's TextField and no label of its own: Onboarding's labels carry a
// badge, and its fields an icon or a button beside them.
export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  maxLength,
  onFocus,
  onSubmit,
  style,
  ref,
}: InputProps): ReactElement {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      accessibilityLabel={label}
      maxLength={maxLength}
      onBlur={() => {
        setFocused(false);
      }}
      onChangeText={onChangeText}
      onFocus={() => {
        setFocused(true);
        onFocus?.();
      }}
      onSubmitEditing={onSubmit}
      placeholder={placeholder}
      placeholderTextColor={color.inkMuted}
      ref={ref}
      // The keyboard stays for the next interest; a field without a button of its own closes it.
      submitBehavior={onSubmit === undefined ? 'blurAndSubmit' : 'submit'}
      style={[styles.input, focused && styles.focused, style]}
      value={value}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    ...text.bodyLg,
    minHeight: size.touchMin,
    paddingVertical: space[3],
    paddingHorizontal: space[4],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.borderStrong,
    color: color.ink,
    backgroundColor: color.surface,
  },
  focused: { borderColor: color.focusRing, boxShadow: FOCUS_RING },
});
