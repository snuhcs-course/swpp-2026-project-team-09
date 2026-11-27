/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { AnswerLine, PlacePoint, Plan } from '@/api/assistant-types';
import type { TakenAlone } from '@/api/plan-quest-types';
import { Button, color, space, text } from '@/design-system';
import { AnswerLines } from './answer-lines';
import { useRowFourActions } from './row-four-actions';

interface TakenCardProps {
  taken: TakenAlone;
  // The Plan taken, whose Place "길 안내" guides the User to.
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

// The card of a Plan taken alone with "여기로" (boards s4 and s4b, the design's 6.3 Alone 3; board 5 of the 2026-11-22
// redesign): where the User goes and whether they will be told when to leave. Each button does what its word says:
// "확인", the main one, closes the answer; "길 안내" starts the route guidance to the Place, and while it cannot start
// (off campus, or without the location) it is disabled with the reason under it, in place of a toast; none when the
// User is there already. "다시 고르기" is a small text button under them.
export function TakenCard({ taken, plan, dropping, onAgain, onClose, over = [] }: TakenCardProps): ReactElement {
  const { guide, cannotGuide } = useRowFourActions();
  const to = walkTo(plan);
  return (
    <View style={styles.card} testID="taken-card">
      <AnswerLines lines={[...over, ...taken.lines.slice(over.length)]} refusal={over.length} />
      <View style={styles.buttons}>
        {to === null ? null : (
          <View style={styles.guide}>
            <Button
              disabled={dropping || cannotGuide !== null}
              full
              onPress={() => {
                guide(to);
              }}
              variant="secondary"
            >
              길 안내
            </Button>
          </View>
        )}
        <View style={styles.main}>
          <Button disabled={dropping} full onPress={onClose}>
            확인
          </Button>
        </View>
      </View>
      {to === null || cannotGuide === null ? null : <Text style={styles.why}>{cannotGuide}</Text>}
      <View style={styles.again}>
        <Button disabled={dropping} onPress={onAgain} variant="ghost">
          다시 고르기
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: space[3] },
  buttons: { flexDirection: 'row', gap: space[2] },
  guide: { flex: 1 },
  main: { flex: 2 },
  why: { ...text.caption, marginTop: -space[2], color: color.inkMuted },
  again: { alignItems: 'center', marginTop: -space[2] },
});
