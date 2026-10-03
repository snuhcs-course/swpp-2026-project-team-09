import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { color, radius, space, text } from './tokens';

interface ChatBubbleProps {
  // The User's messages are on the right in the key colour, the assistant's on the left.
  role: 'user' | 'assistant';
  children: string;
  time?: string;
}

// One message of the AI chat. What the assistant is about to do goes in an ActionConfirm, never only in a bubble.
export function ChatBubble({ role, children, time }: ChatBubbleProps): ReactElement {
  const own = role === 'user';
  return (
    <View style={[styles.message, own ? styles.own : styles.other]}>
      <View style={[styles.bubble, own ? styles.ownBubble : styles.otherBubble]}>
        <Text style={[styles.words, own && styles.ownWords]}>{children}</Text>
      </View>
      {time === undefined ? null : <Text style={styles.time}>{time}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  message: { gap: space[1], maxWidth: '84%' },
  own: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  other: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble: {
    paddingVertical: space[3],
    paddingHorizontal: space[4],
    borderRadius: radius.lg,
  },
  ownBubble: { backgroundColor: color.snuBlue, borderBottomRightRadius: radius.sm },
  otherBubble: { backgroundColor: color.blue50, borderBottomLeftRadius: radius.sm },
  words: { ...text.bodyLg, color: color.ink },
  ownWords: { color: color.onPrimary },
  time: { ...text.caption, color: color.inkMuted },
});
