/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { AnswerLine, ConditionChip } from '@/api/assistant-types';
import type { SubQuest } from '@/api/types';
import { space } from '@/design-system';
import { type Standing, standingWords } from '@/features/assistant/invited-friends';
import {
  invitedNamesOf,
  invitedPlaceOf,
  invitedWordOf,
  nextLineOf,
  sentLineOf,
} from '@/features/assistant/invited-words';
import { koreaClock } from '@/korea-time';
import { AnswerLines } from './answer-lines';
import { ReadOnlyChip } from './condition-chips';
import { QuestSteps } from './quest-steps';

interface InvitedCardProps {
  chips: readonly ConditionChip[];
  // The made Quest's title, which names its meal ("302동식당에서 점심").
  title: string;
  // What "today" is for the day word: the answer's own now, as its bar and its flags have it, or the phone's.
  now: Date;
  // The start of the Plan that was sent.
  startAt: string;
  steps: readonly SubQuest[];
  standings: ReadonlyMap<string, Standing>;
  // A refusal's lines, which stand in place of the card's first (board n8b).
  over?: readonly AnswerLine[];
}

// With Friends invited, whom and to what, then when and where (P04 ticket 23): "민수에게 점심 초대를 보냈어요" and
// "12:15 302동식당 · 수락하면 알려 드려요". A party posted with nobody invited (P02 ticket 30) says so, and when to
// be there.
function linesOf({ chips, title, now, startAt, steps, standings }: InvitedCardProps): AnswerLine[] {
  if (standings.size > 0) {
    return [
      [{ text: sentLineOf(invitedNamesOf(chips), invitedWordOf(title)), strong: false }],
      nextLineOf(startAt, invitedPlaceOf(title, steps, startAt), now),
    ];
  }
  return [
    [{ text: '파티를 모집했어요', strong: false }],
    [
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
// two lines that say whom the invitations went to and when and where, and the Quest's steps in order. It closes by the
// card's ✕ (P04 ticket 52). A Quest made from a Plan opened again from the everyday map has the same card.
export function InvitedCard(props: InvitedCardProps): ReactElement {
  const { chips, steps, standings, over = [] } = props;
  return (
    <View style={styles.card} testID="invited-card">
      <SentChips chips={chips} standings={standings} />
      <AnswerLines lines={[...over, ...linesOf(props).slice(over.length)]} />
      <QuestSteps steps={steps} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: space[3] },
  chips: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
});
