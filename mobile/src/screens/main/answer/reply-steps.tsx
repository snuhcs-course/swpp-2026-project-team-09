/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ReplyStep } from '@/api/assistant-types';
import { color, radius, space, text } from '@/design-system';

const BADGE = 20;

// HH:MM of a time in Korea with its offset, as the server sends it.
const clock = (at: string): string => at.slice(11, 16);

// "17:30–19:00", "19:04", or nothing.
export function stepTime({ startAt, endAt }: Pick<ReplyStep, 'startAt' | 'endAt'>): string | null {
  if (startAt === null) {
    return null;
  }
  return endAt === null ? clock(startAt) : `${clock(startAt)}–${clock(endAt)}`;
}

// What a step's second line says: why it was not done, else where its card is.
function noteOf(step: ReplyStep): string | null {
  if (step.status === 'not-done') {
    return step.reason ?? '하지 못했어요';
  }
  return step.shows?.kind === 'card' ? '예약 카드는 아래에 있어요' : null;
}

function StepRow({ step, order }: { step: ReplyStep; order: number }): ReactElement {
  const time = stepTime(step);
  const done = step.status === 'shown';
  const note = noteOf(step);
  const from = step.from === null ? '' : ` · ${step.from.label}에서`;
  return (
    <View style={styles.row} testID={`reply-step-${order}`}>
      <View style={[styles.badge, done ? styles.badgeDone : styles.badgeNot]}>
        <Text style={styles.badgeText}>{order}</Text>
      </View>
      <View style={styles.words}>
        <Text style={[styles.title, done ? null : styles.titleNot]}>
          {time === null ? '' : `${time} `}
          {step.title}
          {from}
        </Text>
        {note === null ? null : <Text style={done ? styles.note : styles.reason}>{note}</Text>}
      </View>
    </View>
  );
}

// The requests of a message that asked for several (P03), numbered in time order above the reply: each with its time,
// what it is and where it sets out from, and, for one that could not be done, why. The plan itself and the booking card
// stay where the card draws them.
export function ReplySteps({ steps }: { steps: readonly ReplyStep[] }): ReactElement | null {
  if (steps.length < 2) {
    return null;
  }
  return (
    <View style={styles.list} testID="reply-steps">
      {steps.map((step, index) => (
        // The steps have no id, and their order is their meaning.
        // oxlint-disable-next-line react/no-array-index-key
        <StepRow key={index} order={index + 1} step={step} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: space[2], paddingBottom: space[2], borderBottomWidth: 1, borderBottomColor: color.border },
  row: { flexDirection: 'row', gap: space[2], alignItems: 'flex-start' },
  badge: {
    width: BADGE,
    height: BADGE,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  badgeDone: { backgroundColor: color.quest },
  badgeNot: { backgroundColor: color.inkSubtle },
  badgeText: { ...text.caption, color: color.onPrimary },
  words: { flex: 1 },
  title: { ...text.label, color: color.ink },
  titleNot: { color: color.inkMuted },
  note: { ...text.caption, color: color.inkMuted },
  reason: { ...text.caption, color: color.warning },
});
