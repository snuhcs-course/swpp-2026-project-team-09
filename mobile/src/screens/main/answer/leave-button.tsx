/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import type { LeaveQuestOffer } from '@/api/leave-quest-types';
import { now } from '@/clock';
import { color, radius, space, text } from '@/design-system';
import { leaveWhen } from '@/features/assistant/use-quest-leaving';
import type { ChatSheetControl } from '../chat-sheet';

interface LeaveButtonProps {
  control: ChatSheetControl;
  bubbleId: number;
  offer: LeaveQuestOffer;
}

// 취소하기 or 나가기 over what it cancels: the Quest's title and its start ("저녁 약속 · 오늘(일) 18:00").
export function LeaveButton({ control, bubbleId, offer }: LeaveButtonProps): ReactElement {
  const sending = control.leave.stateOf(bubbleId, offer.questId) === 'sending';
  const disabled = sending || control.chat.waiting;
  const what = `${offer.title} · ${leaveWhen(offer.startsAt, now())}`;
  const label = sending ? `${offer.label === '나가기' ? '나가는' : '취소하는'} 중이에요` : offer.label;
  return (
    <Pressable
      accessibilityLabel={`${offer.label}, ${what}`}
      accessibilityRole="button"
      accessibilityState={{ disabled, busy: sending }}
      disabled={disabled}
      onPress={() => {
        control.leave.leave(bubbleId, offer);
      }}
      style={({ pressed }) => [styles.leave, pressed && styles.pressed, disabled && styles.disabled]}
      testID="leave-quest"
    >
      <Text numberOfLines={1} style={[styles.label, disabled && styles.muted]}>
        {label}
      </Text>
      <Text numberOfLines={1} style={styles.what}>
        {what}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  leave: {
    maxWidth: 180,
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: space[3],
    paddingVertical: space[1],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.danger,
    backgroundColor: color.surface,
  },
  pressed: { backgroundColor: color.dangerSoft },
  disabled: { backgroundColor: color.surfaceSunken, borderColor: 'transparent' },
  label: { ...text.label, color: color.danger },
  muted: { color: color.inkMuted },
  what: { ...text.caption, color: color.inkMuted },
});
