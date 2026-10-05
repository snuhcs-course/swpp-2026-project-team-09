import { type ReactElement, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Icon } from './icon';
import { color, font, radius, space, text } from './tokens';

interface ChatInputProps {
  placeholder?: string;
  // Quick prompts for the moment, in a row above that scrolls sideways. A press sends one.
  suggestions?: readonly string[];
  // Greys the send button: nothing typed is sent while the owner is busy with the message before.
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
      style={({ pressed }) => [styles.send, pressed && styles.sendPressed, disabled && styles.sendDisabled]}
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
      contentContainerStyle={styles.suggestions}
      horizontal
      style={styles.suggestionScroller}
      keyboardShouldPersistTaps="handled"
      showsHorizontalScrollIndicator={false}
    >
      {suggestions.map((suggestion) => (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled }}
          disabled={disabled}
          hitSlop={SUGGESTION_HIT_SLOP}
          key={suggestion}
          onPress={() => onSend?.(suggestion)}
          style={({ pressed }) => [styles.suggestion, pressed && styles.suggestionPressed]}
        >
          <Text style={styles.suggestionText}>{suggestion}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

// A suggestion is 32 high: its touch area grows above and below, not into its neighbours.
const SUGGESTION_REACH = space[2];
const SUGGESTION_HIT_SLOP = { top: SUGGESTION_REACH, bottom: SUGGESTION_REACH };

const styles = StyleSheet.create({
  wrap: { gap: space[2] },
  // A scrolling row cuts a touch area off at its own edge. The row is taller than its pills by the reach above and
  // below them, and takes that much less room around it, so that nothing moves.
  suggestionScroller: { marginVertical: -SUGGESTION_REACH },
  suggestions: { gap: space[2], paddingVertical: SUGGESTION_REACH },
  suggestion: {
    justifyContent: 'center',
    height: 32,
    paddingHorizontal: space[3],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  suggestionPressed: { backgroundColor: color.blue50 },
  suggestionText: { ...text.label, fontFamily: font.medium, color: color.blue600 },
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
  focused: { borderColor: color.focusRing, boxShadow: `0 0 0 1px ${color.focusRing}` },
  input: {
    ...text.bodyLg,
    flex: 1,
    // Without it the web keeps the field at its own width and pushes the send button out of the bar.
    minWidth: 0,
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
  sendPressed: { backgroundColor: color.snuBluePressed },
  sendDisabled: { backgroundColor: color.surfaceSunken },
});
