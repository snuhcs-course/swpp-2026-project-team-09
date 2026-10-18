/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { apiClient } from '@/api/client';
import { PARTY_CHAT_KEY, partyChatQuery } from '@/api/queries';
import type { PartyMessage } from '@/api/quest-parts-types';
import { Avatar, ChatInput, color, font, radius, space, text, useToast } from '@/design-system';
import { koreaHourMinute } from '@/korea-time';

// "오후 5:02", as the frame's bubbles show the time.
function clockWords(instant: string): string {
  const [hour, minute] = koreaHourMinute(new Date(instant));
  const half = hour < 12 ? '오전' : '오후';
  const shown = hour % 12 === 0 ? 12 : hour % 12;
  return `${half} ${String(shown)}:${String(minute).padStart(2, '0')}`;
}

function Message({ message }: { message: PartyMessage }): ReactElement {
  const { from, words, sentAt } = message;
  if (from === null) {
    return (
      <View style={styles.mineLine} testID="party-chat-mine">
        <Text style={[styles.bubble, styles.mine]}>{words}</Text>
        <Text style={styles.time}>{clockWords(sentAt)}</Text>
      </View>
    );
  }
  return (
    <View style={styles.theirsLine} testID="party-chat-theirs">
      <Avatar name={from.name} size="sm" />
      <View style={styles.theirsWords}>
        <Text style={styles.name}>{from.name}</Text>
        <Text style={[styles.bubble, styles.theirs]}>{words}</Text>
        <Text style={styles.time}>{clockWords(sentAt)}</Text>
      </View>
    </View>
  );
}

// The room's `파티 채팅`: the conversation, and `파티에 메시지 보내기`. The phone keeps what the User sends until the
// main server carries the conversation, so the other members do not see it yet.
export function PartyChat({ questId }: { questId: string }): ReactElement {
  const queryClient = useQueryClient();
  const showToast = useToast();
  const messages = useQuery(partyChatQuery(questId)).data ?? [];
  const send = (words: string): void => {
    apiClient.sendPartyChat(questId, words).then(
      () => {
        void queryClient.invalidateQueries({ queryKey: [...PARTY_CHAT_KEY, questId] });
      },
      () => {
        showToast('메시지를 보내지 못했어요');
      },
    );
  };
  return (
    <View accessibilityLabel="파티 채팅" style={styles.section}>
      <Text accessibilityRole="header" style={styles.heading}>
        파티 채팅
      </Text>
      {messages.length === 0 ? null : (
        <View style={styles.messages}>
          {messages.map((message) => (
            <Message key={message.id} message={message} />
          ))}
        </View>
      )}
      <ChatInput onSend={send} placeholder="파티에 메시지 보내기" />
    </View>
  );
}

// The frame's corners: 16, and 6 at the corner toward the speaker.
const TAIL = 6;

const styles = StyleSheet.create({
  section: { gap: 10 },
  heading: { fontFamily: font.semiBold, fontSize: 18, lineHeight: 26, color: color.ink },
  messages: { gap: space[2], padding: space[3], borderRadius: radius.lg, backgroundColor: color.surfaceSubtle },
  theirsLine: { flexDirection: 'row', alignItems: 'flex-end', gap: space[2] },
  theirsWords: { gap: space[1], maxWidth: '80%' },
  mineLine: { alignItems: 'flex-end', gap: space[1] },
  name: { fontFamily: font.semiBold, fontSize: 12, lineHeight: 16, color: color.inkMuted },
  bubble: {
    ...text.bodyLg,
    maxWidth: '80%',
    paddingVertical: space[3],
    paddingHorizontal: space[4],
    borderRadius: 16,
    overflow: 'hidden',
  },
  theirs: {
    maxWidth: '100%',
    borderBottomLeftRadius: TAIL,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
    color: color.ink,
  },
  mine: { borderBottomRightRadius: TAIL, backgroundColor: color.snuBlue, color: color.onPrimary },
  time: { fontFamily: font.medium, fontSize: 12, lineHeight: 16, color: color.inkMuted },
});
