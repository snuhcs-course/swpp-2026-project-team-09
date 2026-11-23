/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AnswerReply, Plan } from '@/api/assistant-types';
import { Button, color, font, space, text } from '@/design-system';
import { startOf } from '@/features/assistant/answer-walks';
import { bandIsFixed } from '@/features/assistant/row-four-inputs';
import type { ShownAnswer } from '@/features/assistant/use-shown-answer';
import { koreaClock } from '@/korea-time';
import { useOpenFriendProfile } from '../friend-profile';
import { PlanFlagRows } from './mark-card';
import { type BandFocus, type Corrections, useCorrections } from './use-corrections';

const ME_ID = 'answer:me';
const PERSON_ID = 'answer:person:';

interface MarkRowsProps {
  id: string;
  shown: ShownAnswer;
  answer: AnswerReply;
  plan: Plan;
  focus: BandFocus;
  // Closes the answer, as the frame's ✕: taking out a meet's only Friend goes back to that Friend's card.
  onClose: () => void;
  // Closes the mark's card.
  onDone: () => void;
}

interface ChangeProps {
  fix: Corrections;
  busy: boolean;
  onDone: () => void;
}

// The User's start: where they set out from, and 장소 선택 to set out from another building, as the origin chip.
function StartRows({ answer, fix, busy, onDone }: ChangeProps & { answer: AnswerReply }): ReactElement {
  const origin = answer.chips.find(({ kind }) => kind === 'origin')?.text ?? '지금 있는 곳에서';
  // An events or party answer's start is read-only, as its origin chip was.
  const fixed = bandIsFixed(answer.input.kind);
  return (
    <View style={styles.rows}>
      <Text style={styles.title}>{`출발 · ${origin}`}</Text>
      {fixed ? null : (
        <Button
          disabled={busy}
          full
          onPress={() => {
            onDone();
            fix.chooseOrigin();
          }}
          variant="secondary"
        >
          다른 건물에서 출발
        </Button>
      )}
    </View>
  );
}

// A small pressable word of a face's card.
function FaceAction(props: { words: string; label: string; disabled?: boolean; onPress: () => void }): ReactElement {
  const { words, label, disabled = false, onPress } = props;
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={FACE_SLOP}
      onPress={onPress}
      style={({ pressed }) => [styles.action, pressed && styles.pressed]}
    >
      <Text style={[styles.actionWords, disabled && styles.disabled]}>{words}</Text>
    </Pressable>
  );
}

// What a face says of where they set out from (`startOf`): the end of the Class or the Quest the answer set them out
// from ("12:15 302동 수업 끝"), its place, or their position; nothing when it is not known. An older thing of theirs,
// over before now, is never said.
function faceLineOf(plan: Plan, userId: string): string | null {
  const start = startOf(plan, userId);
  if (start === null) {
    return null;
  }
  if (start.kind === 'here') {
    return '지금 위치에서';
  }
  return start.kind === 'item' ? `${koreaClock(start.at)} ${start.label ?? '일정'} 끝` : `${start.place}에서`;
}

interface FaceProps extends ChangeProps {
  userId: string;
  name: string;
  line: string | null;
}

// A face of the Plan's people, in a small card beside it: the name, its line, its profile when they are a Friend, as
// their chip opens it, and 빼기, as its ✕.
function FaceRows({ userId, name, line, fix, busy, onDone }: FaceProps): ReactElement {
  const openProfile = useOpenFriendProfile();
  const profile = fix.friendIds.has(userId) ? openProfile : null;
  return (
    <View style={styles.face}>
      <Text style={styles.name}>{name}</Text>
      {line === null ? null : <Text style={styles.line}>{line}</Text>}
      <View style={styles.actions}>
        {profile === null ? null : (
          <FaceAction
            label={`${name} 프로필`}
            onPress={() => {
              onDone();
              profile(userId);
            }}
            words="프로필"
          />
        )}
        <FaceAction
          disabled={busy}
          label={`${name} 빼기`}
          onPress={() => {
            onDone();
            fix.remove(userId);
          }}
          words="빼기"
        />
      </View>
    </View>
  );
}

// What the card of a mark of the Plan holds: the pick's what the Plan makes, the User's start where they set out from
// with a way to change it, and a face of the Plan's people its profile and a way to take them out. Each change asks
// the same recalculation as the chip it stands in for, and closes the card.
export function MarkRows({ id, shown, answer, plan, focus, onClose, onDone }: MarkRowsProps): ReactElement {
  const fix = useCorrections(shown, answer.input, onClose, focus);
  const change = { fix, busy: shown.recalculating, onDone };
  if (id === ME_ID) {
    return <StartRows {...change} answer={answer} />;
  }
  if (id.startsWith(PERSON_ID)) {
    const userId = id.slice(PERSON_ID.length);
    const name = plan.parts.find((part) => part.userId === userId)?.name ?? '';
    return <FaceRows {...change} line={faceLineOf(plan, userId)} name={name} userId={userId} />;
  }
  return <PlanFlagRows answer={answer} plan={plan} />;
}

// The words are about 20 high and 30 wide: this reaches the design system's 44 by 44 press area.
const FACE_SLOP = 12;

const styles = StyleSheet.create({
  face: { gap: 2 },
  name: { ...text.label, fontFamily: font.semiBold, color: color.ink },
  line: { ...text.caption, color: color.inkMuted },
  actions: { flexDirection: 'row', gap: space[3], paddingTop: space[1] },
  action: { paddingVertical: 2 },
  actionWords: { ...text.label, color: color.snuBlue },
  disabled: { color: color.inkMuted },
  pressed: { opacity: 0.6 },
  rows: { gap: space[3] },
  title: { ...text.title, color: color.ink },
});
