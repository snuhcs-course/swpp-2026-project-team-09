/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-18  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { type ReactElement, type RefObject, useState } from 'react';
import { type KeyboardTypeOptions, type StyleProp, StyleSheet, TextInput, View, type ViewStyle } from 'react-native';
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
  // The phone's own keyboard for it, such as the digits' for a 학번.
  keyboardType?: KeyboardTypeOptions;
  // How far the words keep from the left and right edges, for an icon or a button drawn over the field.
  room?: { left: number; right: number };
  // The box's, such as its share of a row or a refused border.
  style?: StyleProp<ViewStyle>;
  ref?: RefObject<TextInput | null>;
}

// A text input as the `Onboarding` frame draws it, with no label of its own: Onboarding's labels carry a badge, and
// its fields an icon or a button beside them. The focus is marked on a box around the field: on Android a change
// of the field's own border or ring replaces its background, which puts its words back at the default side padding.
export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  most,
  room,
  style,
  ref,
  ...on
}: InputProps): ReactElement {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.box, focused && styles.focused, style]}>
      <TextInput
        accessibilityHint={on.hint}
        accessibilityLabel={label}
        keyboardType={on.keyboardType}
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
        style={[styles.input, room && { paddingLeft: room.left, paddingRight: room.right }]}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    height: size.touchMin,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  focused: { borderColor: color.snuBlue, boxShadow: FOCUS_RING },
  input: {
    ...text.bodyLg,
    flex: 1,
    paddingVertical: 0,
    paddingHorizontal: space[4],
    color: color.ink,
    // The web's own outline of a focused field: the box's border and ring say it here.
    outlineWidth: 0,
    outlineStyle: 'solid',
    outlineColor: 'transparent',
  },
});
