/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { type ReactElement, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { color, font, Icon, type IconName, radius, space, text } from '@/design-system';
import type { ChatBubble } from '@/features/assistant/use-chat';

// The examples of the empty chat, each with its icon on its layer's colour. They replace the frame's library seats,
// and 파티 찾기 takes the Party's colour. A press sends the words.
const CHAT_EXAMPLES: readonly { words: string; icon: IconName; tint: string }[] = [
  { words: '식사 메뉴 추천', icon: 'meal', tint: color.svcDining },
  { words: '현재 통학/순환 셔틀 위치', icon: 'bus', tint: color.svcShuttle },
  { words: '파티 찾기', icon: 'users', tint: color.party },
];

interface ChatEmptyProps {
  onSend: (text: string) => void;
  // How far from the sheet's bottom the content ends, clear of the AI input.
  under: number;
}

// The empty chat: the greeting, where what the User writes goes, and the examples as rows.
export function ChatEmpty({ onSend, under }: ChatEmptyProps): ReactElement {
  return (
    <ScrollView contentContainerStyle={[styles.empty, { paddingBottom: under }]} keyboardShouldPersistTaps="handled">
      <Text accessibilityRole="header" style={styles.greeting}>
        무엇을 도와드릴까요?
      </Text>
      <Text style={styles.notice}>대화 내용은 AI 제공자에게 전송돼요</Text>
      <View style={styles.examples}>
        {CHAT_EXAMPLES.map(({ words, icon, tint }) => (
          <Pressable
            accessibilityLabel={words}
            accessibilityRole="button"
            key={words}
            onPress={() => {
              onSend(words);
            }}
            style={({ pressed }) => [styles.example, pressed && styles.examplePressed]}
          >
            <View style={[styles.exampleIcon, { backgroundColor: tint }]}>
              <Icon color={color.onPrimary} name={icon} size={18} />
            </View>
            <Text style={styles.exampleText}>{words}</Text>
            <Icon color={color.inkMuted} name="chevronRight" size={18} />
          </Pressable>
        ))}
      </View>
    </ScrollView>
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

interface ChatBubblesProps {
  bubbles: readonly ChatBubble[];
  waiting: boolean;
  // How far from the sheet's bottom the last bubble ends, clear of the AI input.
  under: number;
}

// The conversation: the User's bubbles at the right, the Assistant's at the left, and "···" while the Assistant
// works. It keeps the latest in view.
export function ChatBubbles({ bubbles, waiting, under }: ChatBubblesProps): ReactElement {
  const scroller = useRef<ScrollView>(null);
  return (
    <ScrollView
      contentContainerStyle={[styles.bubbles, { paddingBottom: under }]}
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
          <Text style={styles.waiting}>···</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

// The frame's corners: 16, and 6 at the corner toward the speaker.
const TAIL = 6;
const EXAMPLE_ICON = 36;

const styles = StyleSheet.create({
  empty: { gap: space[3], paddingTop: space[4], paddingHorizontal: space[4] },
  greeting: { ...text.titleLg, color: color.ink },
  notice: { ...text.caption, marginTop: -space[2], color: color.inkMuted },
  examples: { gap: space[2] },
  example: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    minHeight: 56,
    paddingVertical: space[2],
    paddingHorizontal: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  examplePressed: { backgroundColor: color.blue50 },
  exampleIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: EXAMPLE_ICON,
    height: EXAMPLE_ICON,
    borderRadius: radius.md,
  },
  exampleText: { flex: 1, fontFamily: font.semiBold, fontSize: 15, lineHeight: 22, color: color.ink },
  bubbles: { gap: space[3], paddingTop: space[2], paddingHorizontal: space[4] },
  bubble: { paddingVertical: space[3], borderRadius: radius.lg },
  mine: {
    alignSelf: 'flex-end',
    maxWidth: '84%',
    paddingHorizontal: space[4],
    borderBottomRightRadius: TAIL,
    backgroundColor: color.snuBlue,
  },
  theirs: {
    alignSelf: 'flex-start',
    maxWidth: '92%',
    paddingHorizontal: 14,
    borderBottomLeftRadius: TAIL,
    backgroundColor: color.blue50,
  },
  words: { ...text.bodyLg, color: color.ink },
  mineWords: { color: color.onPrimary },
  waiting: { ...text.bodyLg, fontFamily: font.bold, letterSpacing: 3.2, color: color.inkMuted },
});
