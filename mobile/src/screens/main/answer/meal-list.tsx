/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AnswerReply, Cuisine, Plan } from '@/api/assistant-types';
import { color, font, radius, space, text } from '@/design-system';
import { addedWalk, fadedPlan } from '@/features/assistant/answer-walks';
import { kindShown, serves } from '@/features/assistant/meal-kinds';
import { dishWords, priceWords } from '@/features/assistant/meal-menus';
import type { ShownAnswer } from '@/features/assistant/use-shown-answer';
import { koreaClock } from '@/korea-time';
import { KindChips } from './kind-chips';

// The raised card of a meal answer (board E3): every candidate as a row, the kinds of food over them as the filter.

export interface CandidateRow {
  // As the map numbers it.
  number: number;
  planId: string;
  name: string;
  // The walking this choice adds to the User's day, "걸음 16분", or when the User is there, "11:53 도착", when where
  // they start is not known.
  when: string;
  // In minutes, null when not known.
  walk: number | null;
  // It does not fit the band or its walking is long: faded, as on the map, unless chosen.
  faded: boolean;
  // "순살안동식찜닭 외 2", null without dishes.
  dishes: string | null;
  // "5,000원부터", null without prices.
  price: string | null;
  startAt: string;
}

function rowOf(plan: Plan, index: number, kind: Cuisine | null): CandidateRow {
  const walk = addedWalk(plan);
  return {
    number: index + 1,
    planId: plan.id,
    name: plan.place.label,
    when: walk === null ? `${koreaClock(plan.startAt)} 도착` : `걸음 ${String(walk)}분`,
    walk,
    faded: fadedPlan(plan),
    dishes: plan.menu === undefined ? null : dishWords(plan.menu, kind),
    price: plan.menu === undefined ? null : priceWords(plan.menu),
    startAt: plan.startAt,
  };
}

// A meal answer with more than one candidate, whose raised card lists them.
export function mealListed(answer: AnswerReply | null): boolean {
  return answer?.input.kind === 'meal' && answer.plans.length > 1;
}

// The candidates of a meal answer with more than one, those of the kind on screen alone when one is chosen, the least
// walking first, then the earliest there, then the map's order. None for any other answer.
export function candidateRowsOf(answer: AnswerReply | null): CandidateRow[] {
  if (answer === null || !mealListed(answer)) {
    return [];
  }
  const kind = kindShown(answer);
  return answer.plans
    .map((plan, index) => ({ plan, row: rowOf(plan, index, kind) }))
    .filter(({ plan }) => kind === null || serves(plan, kind))
    .map(({ row }) => row)
    .toSorted(
      (one, other) =>
        (one.walk ?? Infinity) - (other.walk ?? Infinity) ||
        one.startAt.localeCompare(other.startAt) ||
        one.number - other.number,
    );
}

const BADGE = 22;

function Row({
  row,
  chosen,
  disabled,
  onPress,
}: {
  row: CandidateRow;
  chosen: boolean;
  disabled: boolean;
  onPress: () => void;
}): ReactElement {
  const { number, name, when, dishes, price } = row;
  const said = [`${String(number)} ${name}`, when, dishes, price, chosen ? '고른 곳' : null]
    .filter((words) => words !== null)
    .join(' · ');
  return (
    <Pressable
      accessibilityLabel={said}
      accessibilityRole="button"
      accessibilityState={{ selected: chosen, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        chosen && styles.chosen,
        row.faded && !chosen && styles.faded,
        pressed && styles.pressed,
      ]}
      testID={`meal-row-${String(number)}`}
    >
      <View style={[styles.badge, chosen && styles.chosenBadge]}>
        <Text style={styles.number}>{number}</Text>
      </View>
      <View style={styles.middle}>
        <Text numberOfLines={1} style={styles.name}>
          {name}
        </Text>
        <Text numberOfLines={1} style={styles.when}>
          {when}
        </Text>
        {dishes === null ? null : (
          <Text numberOfLines={1} style={styles.dishes}>
            {dishes}
          </Text>
        )}
      </View>
      {price === null ? null : <Text style={styles.price}>{price}</Text>}
    </Pressable>
  );
}

interface MealListProps {
  answer: AnswerReply;
  shown: Pick<ShownAnswer, 'index' | 'openMenu' | 'chooseKind'>;
  // A Plan is being sent or is made, or a recalculation is on its way: nothing is chosen, as on the map.
  busy: boolean;
}

// The kinds of food on top, then a row per candidate; the chosen one is marked. A press on a row chooses that place,
// as a press on its tag does, and opens its menu (board E4).
export function MealList({ answer, shown, busy }: MealListProps): ReactElement | null {
  const rows = candidateRowsOf(answer);
  const chosen = answer.plans[shown.index]?.id;
  if (rows.length === 0) {
    return null;
  }
  return (
    <View style={styles.list} testID="meal-list">
      <KindChips answer={answer} disabled={busy} onChoose={shown.chooseKind} />
      {rows.map((row) => (
        <Row
          chosen={row.planId === chosen}
          disabled={busy}
          key={row.planId}
          onPress={() => {
            shown.openMenu(row.planId);
          }}
          row={row}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: space[1] },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[3],
    paddingVertical: space[2],
    paddingHorizontal: space[2],
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  chosen: { borderColor: color.quest, backgroundColor: color.questSoft },
  pressed: { opacity: 0.6 },
  faded: { opacity: 0.45 },
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    width: BADGE,
    height: BADGE,
    marginTop: 2,
    borderRadius: radius.full,
    backgroundColor: color.snuBlue,
  },
  chosenBadge: { backgroundColor: color.quest },
  number: { ...text.micro, color: color.onPrimary },
  middle: { flex: 1, gap: 2 },
  name: { ...text.body, fontFamily: font.bold, color: color.ink },
  when: { ...text.caption, fontFamily: font.semiBold, color: color.quest },
  dishes: { ...text.caption, color: color.inkMuted },
  price: { ...text.caption, color: color.inkMuted },
});
