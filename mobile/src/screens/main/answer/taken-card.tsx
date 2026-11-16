/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import type { AnswerLine, PlacePoint, Plan } from '@/api/assistant-types';
import type { TakenAlone } from '@/api/plan-quest-types';
import { Button, space } from '@/design-system';
import { AnswerLines } from './answer-lines';
import { useRowFourActions } from './row-four-actions';

interface TakenCardProps {
  taken: TakenAlone;
  // The Plan taken, whose Place "닫기" guides the User to.
  plan: Plan;
  dropping: boolean;
  onAgain: () => void;
  onClose: () => void;
  // A refusal's lines, which stand in place of the card's first.
  over?: readonly AnswerLine[];
}

// The Place the User walks to, null when they are there already.
function walkTo(plan: Plan): PlacePoint | null {
  return plan.parts.find(({ me }) => me)?.walkMinutes === 0 ? null : plan.place;
}

// The card of a Plan taken alone with "여기로" (boards s4 and s4b, the design's 6.3 Alone 3): where the User goes and
// whether they will be told when to leave, with "다시 고르기" and "닫기" side by side. "닫기" starts the route guidance
// to the Place, as a Lookup's "길 안내" does, or only closes when the User is there already.
export function TakenCard({ taken, plan, dropping, onAgain, onClose, over = [] }: TakenCardProps): ReactElement {
  const { guide } = useRowFourActions();
  const close = (): void => {
    const to = walkTo(plan);
    if (to === null) {
      onClose();
    } else {
      guide(to);
    }
  };
  return (
    <View style={styles.card} testID="taken-card">
      <AnswerLines lines={[...over, ...taken.lines.slice(over.length)]} />
      <View style={styles.buttons}>
        <View style={styles.cell}>
          <Button disabled={dropping} full onPress={onAgain} variant="secondary">
            다시 고르기
          </Button>
        </View>
        <View style={styles.cell}>
          <Button disabled={dropping} full onPress={close} variant="secondary">
            닫기
          </Button>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: space[3] },
  buttons: { flexDirection: 'row', gap: space[2] },
  cell: { flex: 1 },
});
