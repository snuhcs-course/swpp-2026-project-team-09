/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { AnswerReply, Plan } from '@/api/assistant-types';
import { Button, color, space, text } from '@/design-system';
import { bandIsFixed } from '@/features/assistant/row-four-inputs';
import type { ShownAnswer } from '@/features/assistant/use-shown-answer';
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

function CardButton({
  words,
  label,
  disabled = false,
  onPress,
}: {
  words: string;
  label: string;
  disabled?: boolean;
  onPress: () => void;
}): ReactElement {
  return (
    <View style={styles.button}>
      <Button disabled={disabled} full label={label} onPress={onPress} variant="secondary">
        {words}
      </Button>
    </View>
  );
}

// A face of the Plan's people: their profile when they are a Friend, as their chip opens it, and 빼기, as its ✕.
function FaceRows({ userId, name, fix, busy, onDone }: ChangeProps & { userId: string; name: string }): ReactElement {
  const openProfile = useOpenFriendProfile();
  const profile = fix.friendIds.has(userId) ? openProfile : null;
  return (
    <View style={styles.rows}>
      <Text style={styles.title}>{name}</Text>
      <View style={styles.buttons}>
        {profile === null ? null : (
          <CardButton
            label={`${name} 프로필`}
            onPress={() => {
              onDone();
              profile(userId);
            }}
            words="프로필"
          />
        )}
        <CardButton
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
    return <FaceRows {...change} name={name} userId={userId} />;
  }
  return <PlanFlagRows answer={answer} plan={plan} />;
}

const styles = StyleSheet.create({
  rows: { gap: space[3] },
  title: { ...text.title, color: color.ink },
  buttons: { flexDirection: 'row', gap: space[2] },
  button: { flex: 1 },
});
