/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 * 2026-10-28  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import type { ReactElement, ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { color, font, Icon, type IconName, radius, space, text } from '@/design-system';
import { Dismissing } from './chat-bubbles';

// The examples of the empty chat, each with its icon on its layer's colour. They replace the frame's library seats,
// and 파티 찾기 takes the Party's colour. A press sends the words.
const CHAT_EXAMPLES: readonly { words: string; icon: IconName; tint: string }[] = [
  { words: '식사 메뉴 추천', icon: 'meal', tint: color.svcDining },
  { words: '현재 통학/순환 셔틀 위치', icon: 'bus', tint: color.svcShuttle },
  { words: '파티 찾기', icon: 'users', tint: color.party },
];

interface ChatEmptyProps {
  onSend: (text: string) => void;
  // The grey suggestion over the examples, if any.
  suggestion?: ReactNode;
  // How far from the sheet's bottom the content ends, clear of the AI input.
  under: number;
}

// The empty chat: the greeting, where what the User writes goes, and the examples as rows. A drag puts the keyboard
// down, and so does a press that no example takes; a press on an example sends it at once, keyboard up or not.
export function ChatEmpty({ onSend, suggestion, under }: ChatEmptyProps): ReactElement {
  return (
    <ScrollView
      contentContainerStyle={[styles.fill, { paddingBottom: under }]}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      testID="chat-empty"
    >
      <Dismissing style={styles.empty}>
        <Text accessibilityRole="header" style={styles.greeting}>
          무엇을 도와드릴까요?
        </Text>
        <Text style={styles.notice}>대화 내용은 AI 제공자에게 전송돼요</Text>
        {suggestion}
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
      </Dismissing>
    </ScrollView>
  );
}

const EXAMPLE_ICON = 36;

const styles = StyleSheet.create({
  // The scroll view's content fills it, so that a press below the examples puts the keyboard down too.
  fill: { flexGrow: 1 },
  empty: { flexGrow: 1, gap: space[3], paddingTop: space[4], paddingHorizontal: space[4] },
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
});
