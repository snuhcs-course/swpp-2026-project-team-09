import { type ReactElement, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Icon } from './icon';
import { color, font, radius, space, text } from './tokens';

interface ChatInputProps {
  placeholder?: string;
  // Quick prompts for the moment, in a row above that scrolls sideways. A press sends one.
  suggestions?: readonly string[];
  disabled?: boolean;
  onSend?: (message: string) => void;
  // The map's entry point opens the chat when the input is touched.
  onFocus?: () => void;
}

const SEND_SIZE = 40;

// The pill-shaped composer above the bottom navigation. The send button is its only fill in the key colour.
export function ChatInput({
  placeholder = '무엇이든 부탁해 보세요',
  suggestions = [],
  disabled = false,
  onSend,
  onFocus,
}: ChatInputProps): ReactElement {
  const [message, setMessage] = useState('');
  const [focused, setFocused] = useState(false);
  const cannotSend = disabled || message.trim() === '';
  const send = (): void => {
    onSend?.(message.trim());
    setMessage('');
  };
  return (
    <View style={styles.wrap}>
      <Suggestions disabled={disabled} onSend={onSend} suggestions={suggestions} />
      <View style={[styles.bar, focused && styles.focused]}>
        <TextInput
          accessibilityLabel="메시지"
          editable={!disabled}
          onBlur={() => {
            setFocused(false);
          }}
          onChangeText={setMessage}
          onFocus={() => {
            setFocused(true);
            onFocus?.();
          }}
          onSubmitEditing={cannotSend ? undefined : send}
          placeholder={placeholder}
          placeholderTextColor={color.inkMuted}
          returnKeyType="send"
          style={styles.input}
          value={message}
        />
        <SendButton disabled={cannotSend} onPress={send} />
      </View>
    </View>
  );
}

function SendButton({ disabled, onPress }: { disabled: boolean; onPress: () => void }): ReactElement {
  return (
    <Pressable
      accessibilityLabel="보내기"
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={space[1]}
      onPress={onPress}
      style={[styles.send, disabled && styles.sendDisabled]}
    >
      <Icon color={disabled ? color.inkMuted : color.onPrimary} name="send" size={18} />
    </Pressable>
  );
}

interface SuggestionsProps {
  suggestions: readonly string[];
  disabled: boolean;
  onSend?: (message: string) => void;
}

function Suggestions({ suggestions, disabled, onSend }: SuggestionsProps): ReactElement | null {
  if (suggestions.length === 0) {
    return null;
  }
  return (
    <ScrollView
      accessibilityLabel="추천 입력"
      contentContainerStyle={styles.suggestions}
      horizontal
      keyboardShouldPersistTaps="handled"
      showsHorizontalScrollIndicator={false}
    >
      {suggestions.map((suggestion) => (
        <Pressable
          accessibilityRole="button"
          disabled={disabled}
          hitSlop={space[2]}
          key={suggestion}
          onPress={() => onSend?.(suggestion)}
          style={styles.suggestion}
        >
          <Text style={styles.suggestionText}>{suggestion}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[2] },
  suggestions: { gap: space[2] },
  suggestion: {
    justifyContent: 'center',
    height: 32,
    paddingHorizontal: space[3],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  suggestionText: { fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: color.blue600 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingVertical: space[1],
    paddingRight: space[1],
    paddingLeft: space[4],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surfaceSubtle,
  },
  focused: { borderColor: color.focusRing },
  input: {
    ...text.bodyLg,
    flex: 1,
    height: SEND_SIZE,
    paddingVertical: 0,
    color: color.ink,
  },
  send: {
    alignItems: 'center',
    justifyContent: 'center',
    width: SEND_SIZE,
    height: SEND_SIZE,
    borderRadius: radius.full,
    backgroundColor: color.snuBlue,
  },
  sendDisabled: { backgroundColor: color.surfaceSunken },
});
