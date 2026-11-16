/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { AnswerLine, ConditionChip } from '@/api/assistant-types';
import type { SubQuest } from '@/api/types';
import { Button, space } from '@/design-system';
import { type Standing, standingWords } from '@/features/assistant/invited-friends';
import { goingTo } from '@/features/assistant/taken-lines';
import { koreaClock } from '@/korea-time';
import { AnswerLines } from './answer-lines';
import { ReadOnlyChip } from './condition-chips';
import { QuestSteps } from './quest-steps';

interface InvitedCardProps {
  chips: readonly ConditionChip[];
  // The start of the Plan that was sent.
  startAt: string;
  steps: readonly SubQuest[];
  standings: ReadonlyMap<string, Standing>;
  // A refusal's lines, which stand in place of the card's first (board n8b).
  over?: readonly AnswerLine[];
  // Where a Quest the User holds alone goes, which is no 파티 (P05-14); null for a party.
  alone?: string | null;
  onClose: () => void;
}

// A party posted with nobody invited (P02 ticket 30) says so, and when to be there; a Quest held alone, where it goes.
function linesOf(startAt: string, invited: boolean, alone: string | null): AnswerLine[] {
  const when = [
    { text: koreaClock(startAt), strong: true },
    { text: '에 가면 돼요', strong: false },
  ];
  if (alone !== null) {
    return [goingTo(alone), when];
  }
  return invited
    ? [[{ text: '파티를 만들고 초대를 보냈어요', strong: false }], [{ text: '답이 없어도 ', strong: false }, ...when]]
    : [[{ text: '파티를 모집했어요', strong: false }], when];
}

// The conditions as they were sent: no chip takes a press, and a person's chip says how the Friend stands.
function SentChips({ chips, standings }: Pick<InvitedCardProps, 'chips' | 'standings'>): ReactElement {
  return (
    <ScrollView contentContainerStyle={styles.chips} horizontal showsHorizontalScrollIndicator={false}>
      {chips.map((chip) => {
        const standing = chip.userId === null ? undefined : standings.get(chip.userId);
        const words = standing === undefined ? chip.text : `${chip.text} · ${standingWords(standing)}`;
        return (
          <ReadOnlyChip
            key={`${chip.kind}-${chip.userId ?? chip.text}`}
            label={words}
            marked={standing?.state === 'accepted'}
          />
        );
      })}
    </ScrollView>
  );
}

// The card of the answer on screen once its Plan was made into a Quest: the conditions with how each Friend stands,
// two lines that say the invitations went out and when to be there, the Quest's steps in order, and "닫기" across the
// card, where "이대로 초대" stood. A Quest made from a Plan opened again from the everyday map has the same card.
export function InvitedCard(props: InvitedCardProps): ReactElement {
  const { chips, startAt, steps, standings, over = [], alone = null, onClose } = props;
  const lines = linesOf(startAt, standings.size > 0, alone);
  return (
    <View style={styles.card} testID="invited-card">
      <SentChips chips={chips} standings={standings} />
      <AnswerLines lines={[...over, ...lines.slice(over.length)]} />
      <QuestSteps steps={steps} />
      <Button full onPress={onClose} variant="secondary">
        닫기
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: space[3] },
  chips: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
});
