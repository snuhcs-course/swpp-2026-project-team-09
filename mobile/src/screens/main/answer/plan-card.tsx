/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, color, IconButton, space, text } from '@/design-system';
import type { ShownAnswer } from '@/features/assistant/use-shown-answer';
import { AnswerLines } from './answer-lines';

// The Plan on screen in the answer frame's card: "근거" at the right of the first row, the Plan's two lines, its basis
// while open, and the arrows with the count when the answer has more than one Plan.
export function PlanCard({ shown }: { shown: ShownAnswer }): ReactElement | null {
  const { answer, plan, index, browse, basisOpen, toggleBasis } = shown;
  if (answer === null || plan === null) {
    return null;
  }
  const count = answer.plans.length;
  return (
    <View style={styles.plan}>
      <View style={styles.top}>
        <Button onPress={toggleBasis} variant="ghost">
          {basisOpen ? '근거 접기' : '근거'}
        </Button>
      </View>
      <AnswerLines lines={plan.lines} />
      {basisOpen ? (
        <View style={styles.basis}>
          {plan.basis.map((line) => (
            <Text key={line} style={styles.basisLine}>
              {line}
            </Text>
          ))}
        </View>
      ) : null}
      {count > 1 ? (
        <View style={styles.arrows}>
          <IconButton
            icon="chevronLeft"
            label="이전 후보"
            onPress={() => {
              browse(-1);
            }}
          />
          <Text style={styles.count}>{`${index + 1}/${count}`}</Text>
          <IconButton
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

const styles = StyleSheet.create({
  plan: { gap: space[2] },
  top: { flexDirection: 'row', justifyContent: 'flex-end' },
  basis: { gap: space[1] },
  basisLine: { ...text.body, color: color.inkMuted },
  arrows: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[2] },
  count: { ...text.label, color: color.ink },
});
