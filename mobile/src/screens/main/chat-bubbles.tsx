/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { type ReactElement, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { color, font, radius, space, text } from '@/design-system';
import type { ChatBubble } from '@/features/assistant/use-chat';

// The examples of the empty chat, which replace the frame's library seats. A press sends its words.
export const CHAT_EXAMPLES = ['식사 메뉴 추천', '현재 통학/순환 셔틀 위치', '파티 찾기'] as const;

// The empty chat: the greeting, where what the User writes goes, and the examples.
export function ChatEmpty({ onSend }: { onSend: (text: string) => void }): ReactElement {
  return (
    <View style={styles.empty}>
      <Text accessibilityRole="header" style={styles.greeting}>
        무엇을 도와드릴까요?
      </Text>
      <Text style={styles.notice}>대화 내용은 AI 제공자에게 전송돼요</Text>
      <View style={styles.examples}>
        {CHAT_EXAMPLES.map((example) => (
          <Pressable
            accessibilityRole="button"
            key={example}
            onPress={() => {
              onSend(example);
            }}
            style={({ pressed }) => [styles.example, pressed && styles.examplePressed]}
          >
            <Text style={styles.exampleText}>{example}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function Bubble({ role, text: words }: Pick<ChatBubble, 'role' | 'text'>): ReactElement {
  const mine = role === 'user';
  return (
    <View
      style={[styles.bubble, mine ? styles.mine : styles.theirs]}
      testID={mine ? 'user-bubble' : 'assistant-bubble'}
    >
      <Text style={[styles.words, mine && styles.mineWords]}>{words}</Text>
    </View>
  );
}

// The conversation: the User's bubbles at the right, the Assistant's at the left, and "···" while the Assistant
// works. It keeps the latest in view.
export function ChatBubbles({ bubbles, waiting }: { bubbles: readonly ChatBubble[]; waiting: boolean }): ReactElement {
  const scroller = useRef<ScrollView>(null);
  return (
    <ScrollView
      contentContainerStyle={styles.bubbles}
      keyboardShouldPersistTaps="handled"
      onContentSizeChange={() => {
        scroller.current?.scrollToEnd({ animated: true });
      }}
      ref={scroller}
    >
      {bubbles.map(({ id, role, text: words }) => (
        <Bubble key={id} role={role} text={words} />
      ))}
      {waiting ? (
        <View accessibilityLabel="답변을 기다리는 중" style={[styles.bubble, styles.theirs]} testID="waiting-bubble">
          <Text style={styles.words}>···</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

// A bubble leaves a quarter of the width to the other side.
const BUBBLE_WIDTH = '78%';

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[2], padding: space[6] },
  greeting: { ...text.title, color: color.ink, textAlign: 'center' },
  notice: { ...text.caption, color: color.inkMuted, textAlign: 'center' },
  examples: { alignItems: 'center', gap: space[2], marginTop: space[4] },
  example: {
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: space[4],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  examplePressed: { backgroundColor: color.blue50 },
  exampleText: { ...text.label, fontFamily: font.medium, color: color.blue600 },
  bubbles: { gap: space[2], padding: space[4] },
  bubble: { maxWidth: BUBBLE_WIDTH, paddingHorizontal: space[3], paddingVertical: space[2], borderRadius: radius.lg },
  mine: { alignSelf: 'flex-end', borderBottomRightRadius: radius.sm, backgroundColor: color.snuBlue },
  theirs: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: radius.sm,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  words: { ...text.body, color: color.ink },
  mineWords: { color: color.onPrimary },
});
