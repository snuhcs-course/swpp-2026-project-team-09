/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { type ReactElement, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Icon } from './icon';
import { color, radius, size, space, text } from './tokens';

// A second point of outline drawn outside the border, so that focus moves nothing.
const FOCUS_RING = `0 0 0 1px ${color.focusRing}`;

interface TextFieldProps {
  // Always visible. A placeholder is an example, not a label.
  label: string;
  value: string;
  onChangeText?: (value: string) => void;
  // An example, prefixed "예:".
  placeholder?: string;
  helper?: string;
  // Replaces the helper and turns the outline to the danger colour.
  error?: string;
  multiline?: boolean;
  disabled?: boolean;
  maxLength?: number;
}

// A labelled text input for the profile, the creation of an event and settings.
export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  helper,
  error,
  multiline = false,
  disabled = false,
  maxLength,
}: TextFieldProps): ReactElement {
  const [focused, setFocused] = useState(false);
  const help = error ?? helper;
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityHint={help}
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        editable={!disabled}
        maxLength={maxLength}
        multiline={multiline}
        onBlur={() => {
          setFocused(false);
        }}
        onChangeText={onChangeText}
        onFocus={() => {
          setFocused(true);
        }}
        placeholder={placeholder}
        placeholderTextColor={color.inkMuted}
        style={[
          styles.input,
          multiline && styles.multiline,
          error !== undefined && styles.invalid,
          focused && styles.focused,
          disabled && styles.disabled,
        ]}
        value={value}
      />
      {help === undefined ? null : (
        <View style={styles.help}>
          {error === undefined ? null : <Icon color={color.danger} name="alert" size={14} />}
          <Text style={[styles.helpText, error !== undefined && styles.errorText]}>{help}</Text>
        </View>
      )}
    </View>
  );
}

const MULTILINE_HEIGHT = 96;

const styles = StyleSheet.create({
  field: { gap: space[1] },
  label: { ...text.label, color: color.ink },
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
  multiline: { minHeight: MULTILINE_HEIGHT, textAlignVertical: 'top' },
  focused: { borderColor: color.focusRing, boxShadow: FOCUS_RING },
  invalid: { borderColor: color.danger },
  disabled: { color: color.inkMuted, backgroundColor: color.surfaceSunken },
  help: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
  },
  helpText: { ...text.caption, flexShrink: 1, color: color.inkMuted },
  errorText: { color: color.danger },
});
