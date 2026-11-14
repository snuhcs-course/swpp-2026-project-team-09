/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { AnswerLine, ConditionChip } from '@/api/assistant-types';
import type { PlanQuest } from '@/api/plan-quest-types';
import { Button, space } from '@/design-system';
import { type Standing, standingWords } from '@/features/assistant/invited-friends';
import { koreaClock } from '@/korea-time';
import { AnswerLines } from './answer-lines';
import { ReadOnlyChip } from './condition-chips';
import { QuestSteps } from './quest-steps';

interface InvitedCardProps {
  chips: readonly ConditionChip[];
  // The start of the Plan that was sent.
  startAt: string;
  made: PlanQuest;
  standings: ReadonlyMap<string, Standing>;
  onClose: () => void;
}

function linesOf(startAt: string): AnswerLine[] {
  return [
    [{ text: '파티를 만들고 초대를 보냈어요', strong: false }],
    [
      { text: '답이 없어도 ', strong: false },
      { text: koreaClock(startAt), strong: true },
      { text: '에 가면 돼요', strong: false },
    ],
  ];
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
// two lines that say the invitations went out and when to be there, the Quest's steps in order, and "닫기".
export function InvitedCard({ chips, startAt, made, standings, onClose }: InvitedCardProps): ReactElement {
  return (
    <View style={styles.card} testID="invited-card">
      <SentChips chips={chips} standings={standings} />
      <AnswerLines lines={linesOf(startAt)} />
      <QuestSteps steps={made.quest.subQuests} />
      <View style={styles.buttons}>
        <Button onPress={onClose} variant="secondary">
          닫기
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: space[3] },
  chips: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  buttons: { flexDirection: 'row' },
});
