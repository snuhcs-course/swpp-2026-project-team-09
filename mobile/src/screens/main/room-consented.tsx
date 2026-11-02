/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { useQueryClient } from '@tanstack/react-query';
import { type ReactElement, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { type RoomAsk, ROOM_INBOX_KEY, roomRequests } from '@/api/room-requests';
import { Button, color, radius, shadow, space, text } from '@/design-system';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// The consent notice once the User consented, at the top of the main screen while the request gathers: what they
// consented to, and 철회, which withdraws the consent and so dissolves the request for everyone.

export const WITHDRAW = '철회';

// "11월 3일 15:00–16:00".
export function whenOf({ date, start, minutes }: RoomAsk): string {
  const [, month = '', day = ''] = date.split('-');
  const [hours = 0, mins = 0] = start.split(':').map(Number);
  const endMinutes = hours * 60 + mins + minutes;
  const end = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;
  return `${Number(month)}월 ${Number(day)}일 ${start}–${end}`;
}

export function consentedWords(ask: RoomAsk): string {
  return `${ask.requester.name}님의 ${ask.space.name} ${whenOf(ask)} 예약에 학번 제공을 동의했어요`;
}

export function ConsentedNotice({ ask }: { ask: RoomAsk }): ReactElement {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const { top } = useSafeAreaInsets();
  const withdraw = async (): Promise<void> => {
    setBusy(true);
    try {
      await roomRequests.decline(ask.requestId);
    } finally {
      setBusy(false);
      void queryClient.invalidateQueries({ queryKey: ROOM_INBOX_KEY });
    }
  };
  return (
    <View style={[styles.notice, { top: top + space[10] }]} testID="room-consented">
      <Text style={styles.words}>{consentedWords(ask)}</Text>
      <Button disabled={busy} onPress={() => void withdraw()} variant="secondary">
        {WITHDRAW}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    position: 'absolute',
    right: space[4],
    left: space[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    padding: space[3],
    borderRadius: radius.lg,
    backgroundColor: color.surface,
    boxShadow: shadow.mapCard,
  },
  words: { ...text.body, flex: 1, color: color.ink },
});
