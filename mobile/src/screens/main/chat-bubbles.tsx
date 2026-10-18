/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { type ReactElement, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { MapLayer } from '@/api/assistant-types';
import { Button, color, font, Icon, type IconName, radius, space, text } from '@/design-system';
import type { ChatBubble } from '@/features/assistant/use-chat';
import { ChatEventCards, type EventCardActions } from './chat-event-cards';

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

// The map button of each layer, with the layer's own icon.
const MAP_BUTTONS: Record<MapLayer, { label: string; icon: IconName }> = {
  dining: { label: '지도에서 식당 보기', icon: 'meal' },
  shuttle: { label: '지도에서 셔틀 보기', icon: 'bus' },
};

interface BubbleProps {
  bubble: ChatBubble;
  // 다시 시도 under a failure the Assistant may get over, while it is the last bubble.
  onRetry: (() => void) | null;
  onShowLayer: (layer: MapLayer) => void;
  eventActions: EventCardActions;
}

function Bubble({
  bubble: { role, text: words, cards, mapButtons, failure },
  onRetry,
  onShowLayer,
  eventActions,
}: BubbleProps): ReactElement {
  const mine = role === 'user';
  // Only under an answer: a failure has none.
  const layers = failure === null ? mapButtons : [];
  const events = failure === null ? cards.filter(({ kind }) => kind === 'globalEvent') : [];
  return (
    <View
      style={[styles.bubble, mine ? styles.mine : styles.theirs]}
      testID={mine ? 'user-bubble' : 'assistant-bubble'}
    >
      <Text style={[styles.words, mine && styles.mineWords]}>{words}</Text>
      {events.length === 0 ? null : <ChatEventCards actions={eventActions} cards={events} />}
      {layers.map((layer) => (
        <View key={layer} style={styles.below}>
          <Button
            icon={MAP_BUTTONS[layer].icon}
            onPress={() => {
              onShowLayer(layer);
            }}
            variant="secondary"
          >
            {MAP_BUTTONS[layer].label}
          </Button>
        </View>
      ))}
      {onRetry === null ? null : (
        <View style={styles.below}>
          <Button onPress={onRetry} variant="secondary">
            다시 시도
          </Button>
        </View>
      )}
    </View>
  );
}

interface ChatBubblesProps {
  bubbles: readonly ChatBubble[];
  waiting: boolean;
  onRetry: () => void;
  // A map button: shows that layer on the map.
  onShowLayer: (layer: MapLayer) => void;
  // What the event cards of the answers do.
  eventActions: EventCardActions;
  // How far from the sheet's bottom the last bubble ends, clear of the AI input.
  under: number;
}

// The conversation: the User's bubbles at the right, the Assistant's at the left, and "···" while the Assistant
// works. It keeps the latest in view.
export function ChatBubbles(props: ChatBubblesProps): ReactElement {
  const { bubbles, waiting, onRetry, onShowLayer, eventActions, under } = props;
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
      {bubbles.map((bubble, index) => (
        <Bubble
          bubble={bubble}
          eventActions={eventActions}
          key={bubble.id}
          onRetry={bubble.failure === 'unavailable' && index === bubbles.length - 1 && !waiting ? onRetry : null}
          onShowLayer={onShowLayer}
        />
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
  // 다시 시도 and the map buttons.
  below: { marginTop: space[2] },
  waiting: { ...text.bodyLg, fontFamily: font.bold, letterSpacing: 3.2, color: color.inkMuted },
});
