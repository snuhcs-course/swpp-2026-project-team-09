import { type ReactElement, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Icon } from './icon';
import { color, radius, size, space, text } from './tokens';

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
          focused && styles.focused,
          error !== undefined && styles.invalid,
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
  focused: { borderWidth: 2, borderColor: color.focusRing },
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
