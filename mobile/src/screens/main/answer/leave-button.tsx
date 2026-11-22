/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { now } from '@/clock';
import { color, radius, space, text } from '@/design-system';
import { leaveOnScreen, leaveWhen } from '@/features/assistant/use-quest-leaving';
import type { ChatSheetControl } from '../chat-sheet';

// 취소하기 or 나가기 of the latest reply (P04 ticket 24): a row of the dock's width, between the line and the input, and
// under the words in the raised card. At its left what it cancels, the Quest's title, cut in the middle when long, and
// its start, never cut; at its right the label in the danger colour. One press does it: the question and the row that
// names the Quest are the confirmation. It takes no press while the request is on its way and is gone once taken.
export function LeaveRow({ control }: { control: ChatSheetControl }): ReactElement | null {
  const shown = control.framed ? leaveOnScreen(control.chat.bubbles) : null;
  const state = shown === null ? null : control.leave.stateOf(shown.bubbleId, shown.offer.questId);
  if (shown === null || state === 'left') {
    return null;
  }
  const { bubbleId, offer } = shown;
  const sending = state === 'sending';
  const disabled = sending || control.chat.waiting;
  const when = leaveWhen(offer.startsAt, now());
  const label = sending ? `${offer.label === '나가기' ? '나가는' : '취소하는'} 중이에요` : offer.label;
  return (
    <Pressable
      accessibilityLabel={`${offer.label}, ${offer.title} · ${when}`}
      accessibilityRole="button"
      accessibilityState={{ disabled, busy: sending }}
      disabled={disabled}
      onPress={() => {
        control.leave.leave(bubbleId, offer);
      }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed, disabled && styles.disabled]}
      testID="leave-quest"
    >
      <Text ellipsizeMode="middle" numberOfLines={1} style={styles.title}>
        {offer.title}
      </Text>
      <Text numberOfLines={1} style={styles.when}>{` · ${when}`}</Text>
      <Text numberOfLines={1} style={[styles.label, disabled && styles.muted]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingHorizontal: space[3],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.danger,
    backgroundColor: color.surface,
  },
  pressed: { backgroundColor: color.dangerSoft },
  disabled: { backgroundColor: color.surfaceSunken, borderColor: 'transparent' },
  title: { ...text.body, flexShrink: 1, color: color.ink },
  when: { ...text.body, flexShrink: 0, color: color.ink },
  label: { ...text.label, flexShrink: 0, marginLeft: 'auto', paddingLeft: space[3], color: color.danger },
  muted: { color: color.inkMuted },
});
