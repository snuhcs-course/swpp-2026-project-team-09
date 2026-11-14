/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { AnswerReply } from '@/api/assistant-types';
import { Button, color, IconButton, space, text } from '@/design-system';
import type { ShownAnswer } from '@/features/assistant/use-shown-answer';
import { AnswerLines } from './answer-lines';
import { ConditionChips } from './condition-chips';
import { FriendChoices } from './friend-choices';
import { TimeBand } from './time-band';
import { type Corrections, useCorrections } from './use-corrections';

// "되돌리기" while a drag is kept, and the arrows with the count when the answer has more than one Plan.
function Steps({ shown, count }: { shown: ShownAnswer; count: number }): ReactElement | null {
  const { index, browse, recalculating, ghost, undo } = shown;
  if (ghost === null && count <= 1) {
    return null;
  }
  return (
    <View style={styles.steps}>
      {ghost === null ? null : (
        <Button disabled={recalculating} onPress={undo} variant="secondary">
          되돌리기
        </Button>
      )}
      {count > 1 ? (
        <View style={styles.arrows}>
          <IconButton
            disabled={recalculating}
            icon="chevronLeft"
            label="이전 후보"
            onPress={() => {
              browse(-1);
            }}
          />
          <Text style={styles.count}>{`${index + 1}/${count}`}</Text>
          <IconButton
            disabled={recalculating}
            icon="chevronRight"
            label="다음 후보"
            onPress={() => {
              browse(1);
            }}
          />
        </View>
      ) : null}
    </View>
  );
}

// Under the lines: the list of Friends while it is open, else the Plan's time band and the steps.
function Below({ shown, answer, fix }: { shown: ShownAnswer; answer: AnswerReply; fix: Corrections }): ReactElement {
  const { plan, recalculating, ghost } = shown;
  if (fix.adding) {
    return (
      <FriendChoices disabled={recalculating} friends={fix.choices} onChoose={fix.choose} onClose={fix.toggleAdding} />
    );
  }
  return (
    <>
      {plan === null ? null : (
        <TimeBand
          band={plan.band}
          disabled={recalculating}
          focus={fix.focus}
          ghost={ghost}
          onDrop={fix.drop}
          window={answer.input.window}
        />
      )}
      <Steps count={answer.plans.length} shown={shown} />
    </>
  );
}

// The answer on screen in the answer frame's card: its condition chips with "근거" at the row's right, the Plan's two
// lines or those that say why there is none, the basis while open, and the time band with the steps, or the list of
// Friends to add in their place. Each chip, a Friend chosen, and a drop of the band ask for a recalculation.
export function PlanCard({ shown, answer }: { shown: ShownAnswer; answer: AnswerReply }): ReactElement {
  const { plan, basisOpen, toggleBasis, recalculating } = shown;
  const fix = useCorrections(shown, answer.input);
  return (
    <View style={styles.plan}>
      <ConditionChips
        adding={fix.adding}
        basisOpen={plan !== null && basisOpen}
        chips={answer.chips}
        disabled={recalculating}
        onAdd={fix.toggleAdding}
        onBasis={plan === null ? null : toggleBasis}
        onOrigin={fix.chooseOrigin}
        onRemove={fix.remove}
        onUntil={fix.focusUntil}
      />
      <AnswerLines lines={plan?.lines ?? answer.noPlan?.lines ?? []} />
      {plan !== null && basisOpen ? (
        <View style={styles.basis}>
          {plan.basis.map((line) => (
            <Text key={line} style={styles.basisLine}>
              {line}
            </Text>
          ))}
        </View>
      ) : null}
      <Below answer={answer} fix={fix} shown={shown} />
    </View>
  );
}

const styles = StyleSheet.create({
  plan: { gap: space[3] },
  basis: { gap: space[1] },
  basisLine: { ...text.body, color: color.inkMuted },
  steps: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[2] },
  arrows: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[2], flex: 1 },
  count: { ...text.label, color: color.ink },
});
