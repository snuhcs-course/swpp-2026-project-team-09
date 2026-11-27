/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { AnswerReply, Cuisine, Plan } from '@/api/assistant-types';
import { color, space, text } from '@/design-system';
import { addedWalk, fadedPlan, travelWords } from '@/features/assistant/answer-walks';
import { kindShown, serves } from '@/features/assistant/meal-kinds';
import { studyAlone } from '@/features/assistant/meal-marks';
import { dishWords, priceWords } from '@/features/assistant/meal-menus';
import {
  fitDishWords,
  fittingPlans,
  PRICED_ORDER_WORDS,
  pricedOrder,
  showsFitDish,
} from '@/features/assistant/meal-price';
import type { ShownAnswer } from '@/features/assistant/use-shown-answer';
import { withParticle } from '@/features/map/short-name';
import { koreaClock } from '@/korea-time';
import { ClosedRow, Heading, Row } from './candidate-rows';
import { KindChips } from './kind-chips';
import { OverPriceRows } from './over-price-rows';
import { droppedRowsOf, hasKind, STUDY_ORDER_WORDS, type StudyKind, studyRowOf } from './study-rows';

// The raised card of a meal answer (board E3): every candidate as a row, the kinds of food over them as the filter.

export interface CandidateRow {
  // As the map numbers it.
  number: number;
  planId: string;
  name: string;
  // The way this choice adds to the User's day, "걸음 16분", or "이동 16분 · 셔틀" with a leg by shuttle, or when the User
  // is there, "11:53 도착", when where they start is not known. Null for a study answer's place, whose way is at the
  // right (`price`) and whose space and hours are under its name (`dishes`, P10 ticket 18).
  when: string | null;
  // `when` is a clock time ("11:53 도착"), drawn in the time's gold; the way's words are ink (P04 ticket 85).
  clock: boolean;
  // In minutes, null when not known.
  walk: number | null;
  // It cannot be done in the time (`fadedPlan`): only the Assistant's pick can be, which the answer keeps though it
  // cannot (`offeredAnswer`), faded as on the map.
  faded: boolean;
  // "순살안동식찜닭 외 2", null without dishes.
  dishes: string | null;
  // "5,000원부터", null without prices.
  price: string | null;
  startAt: string;
}

// With a ceiling some fit, the row writes the dish its price speaks of and the price in place of its dishes (P04
// ticket 92).
function rowOf(plan: Plan, index: number, kind: Cuisine | null, fitDish: boolean): CandidateRow {
  const walk = addedWalk(plan);
  const way = travelWords(plan);
  return {
    number: index + 1,
    planId: plan.id,
    name: plan.place.label,
    when: way ?? `${koreaClock(plan.startAt)} 도착`,
    clock: way === null,
    walk,
    faded: fadedPlan(plan),
    dishes: fitDish ? fitDishWords(plan) : plan.menu === undefined ? null : dishWords(plan.menu, kind),
    price: fitDish || plan.menu === undefined ? null : priceWords(plan.menu),
    startAt: plan.startAt,
  };
}

// A meal answer with a Plan, whose raised card is the list, though it holds one place; or a study answer alone, whose
// places are listed as a meal's (P10 ticket 18).
export function mealCard(answer: AnswerReply | null): boolean {
  if (answer === null) {
    return false;
  }
  return (answer.input.kind === 'meal' && answer.plans.length > 0) || studyAlone(answer);
}

// A study answer's rows, of the kind of space chosen on the phone, in the main server's order.
function studyRowsOf(answer: AnswerReply, kind: StudyKind | null): CandidateRow[] {
  return answer.plans.flatMap((plan, index) => {
    if (kind !== null && !hasKind(plan, kind)) {
      return [];
    }
    const { detail, side, ...rest } = studyRowOf(plan, index);
    return [{ ...rest, when: null, clock: false, dishes: detail, price: side }];
  });
}

// The places the list offers ("8곳 목록"), as its first line and "전체" count them: the candidates, which the answer
// on screen holds only as they can be done (`offeredAnswer`). The places closed for the meal stand apart at the list's
// end and are not counted.
export function listedCount(answer: AnswerReply): number {
  return fittingPlans(answer).length;
}

// The line over the Restaurants closed for the meal (P04 ticket 71, board z1).
export const CLOSED_HEADING = '쉬는 곳';

// The Friends of the conditions with their particle, "김태현과"; null for none. A chip's name is before " · ".
export function withFriendsOf(answer: AnswerReply): string | null {
  const names = friendNamesOf(answer);
  return names.length === 0 ? null : withParticle(names.join(', '));
}

// The names of the Friends in the answer's Plan, from its people's chips.
export function friendNamesOf(answer: AnswerReply): string[] {
  return answer.chips.filter(({ kind }) => kind === 'person').map(({ text: words }) => words.split(' · ')[0] ?? words);
}

// The candidates of a meal answer with more than one, those of the kind on screen alone when one is chosen, the least
// walking first, then the earliest there, then the map's order; without any walking, in the main server's order. None
// for any other answer.
export function candidateRowsOf(answer: AnswerReply | null, studyKind: StudyKind | null = null): CandidateRow[] {
  if (answer === null || !mealCard(answer)) {
    return [];
  }
  if (answer.input.kind === 'study') {
    return studyRowsOf(answer, studyKind);
  }
  const kind = kindShown(answer);
  const fitDish = showsFitDish(answer);
  const rows = fittingPlans(answer)
    .map((plan, index) => ({ plan, row: rowOf(plan, index, kind, fitDish) }))
    .filter(({ plan }) => kind === null || serves(plan, kind))
    .map(({ row }) => row);
  // Only where the User starts is known is the main server's order the least walking. Otherwise it stands as it came:
  // without a walk anywhere, the walk on to the next item, the earliest start, the longest time to eat (P05 ticket 40);
  // with a way on alone, those where everyone has thirty minutes first (P05 ticket 45). An order of the phone's would
  // scramble it.
  return byWalking(answer) && !pricedOrder(answer)
    ? rows.toSorted(
        (one, other) =>
          (one.walk ?? Infinity) - (other.walk ?? Infinity) ||
          one.startAt.localeCompare(other.startAt) ||
          one.number - other.number,
      )
    : rows;
}

// Whether the User's walking is known for any of the answer's Plans: not when they have no starting place (tomorrow
// with no Class before the meal, a weekend, late at night off campus).
export function walksKnown(answer: AnswerReply): boolean {
  return answer.plans.some((plan) => addedWalk(plan) !== null);
}

// The raised list's first line (P04 ticket 50): how many places it shows, of the kind on screen when one is chosen, and
// how it is ordered ("11곳 · 걸음이 적은 순"). Not pressable: the grip's line says how to lower the card.
export function orderLineOf(answer: AnswerReply, shown: number): string {
  return `${String(shown)}곳 · ${listOrderWords(answer)}`;
}

// Whether the list is ordered by walking: where the User starts is known, and with it their walking.
function byWalking(answer: AnswerReply): boolean {
  const known = answer.plans.some((plan) => plan.parts.some(({ me, origin }) => me && origin !== null));
  return known && walksKnown(answer);
}

// How the raised list is ordered, which its first line says: by walking ("걸음이 적은 순"); without any walking, the main
// server's order, the earliest open first ("일찍 여는 순", P04 ticket 48); with a way on alone, where the User starts
// being unknown, the main server's order of its pick first ("추천 순"); by price as the main server ordered it ("싼 순",
// P04 ticket 92).
export function listOrderWords(answer: AnswerReply): string {
  if (answer.input.kind === 'study') {
    return STUDY_ORDER_WORDS;
  }
  if (pricedOrder(answer)) {
    return PRICED_ORDER_WORDS;
  }
  if (byWalking(answer)) {
    return '걸음이 적은 순';
  }
  return walksKnown(answer) ? '추천 순' : '일찍 여는 순';
}

interface MealListProps {
  answer: AnswerReply;
  shown: Pick<ShownAnswer, 'index' | 'openMenu' | 'chooseKind' | 'change'>;
  // A Plan is being sent or is made, or a recalculation is on its way: nothing is chosen, as on the map.
  busy: boolean;
}

// The kinds of food on top, then a row per candidate; the chosen one is marked. The answer on screen holds only the
// places that can be done (`offeredAnswer`, P04 ticket 71): asked, the Assistant says why one is missing. The Restaurants closed for the
// meal end the list under "쉬는 곳". A press on a row chooses that place,
// as a press on its tag does, and opens its menu (board E4).
export function MealList({ answer, shown, busy }: MealListProps): ReactElement | null {
  // A study answer's kind of space, chosen on the phone alone (P10 ticket 18).
  const [kind, setKind] = useState<StudyKind | null>(null);
  if (!mealCard(answer)) {
    return null;
  }
  const study = answer.input.kind === 'study';
  const chosen = answer.plans[shown.index]?.id;
  const rows = candidateRowsOf(answer, kind);

  const closed = answer.closed ?? [];
  // A press opens the place: a Restaurant's menu, or a study place's spaces (P10 ticket 19).
  const row = (one: CandidateRow): ReactElement => (
    <Row
      chosen={one.planId === chosen}
      disabled={busy}
      key={one.planId}
      onPress={() => {
        shown.openMenu(one.planId);
      }}
      row={one}
      study={study}
    />
  );
  return (
    <View style={styles.list} testID="meal-list">
      <Text numberOfLines={1} style={styles.order} testID="meal-list-order">
        {orderLineOf(answer, rows.length)}
      </Text>
      <KindChips
        answer={answer}
        change={shown.change}
        disabled={busy}
        onChoose={shown.chooseKind}
        study={study ? { chosen: kind, onChoose: setKind } : null}
      />
      {rows.map((one) => row(one))}
      <OverPriceRows answer={answer} />
      {closed.length === 0 ? null : (
        <View style={styles.list} testID="meal-closed-group">
          <Heading words={CLOSED_HEADING} />
          {closed.map(({ place, notices }) => (
            <ClosedRow key={`${place.placeId}:${place.label}`} name={place.label} notice={notices.join(' ')} />
          ))}
        </View>
      )}
      {study ? <DroppedRows answer={answer} /> : null}
    </View>
  );
}

// The places open but not for this User, faded at the very end, after 쉬는 곳 and outside its heading, with no heading of
// their own: they are not closed (P10 ticket 19).
function DroppedRows({ answer }: { answer: AnswerReply }): ReactElement | null {
  const rows = droppedRowsOf(answer);
  return rows.length === 0 ? null : (
    <View style={[styles.list, styles.apart]} testID="meal-dropped-group">
      {rows.map(({ key, name, reason }) => (
        <ClosedRow key={key} name={name} notice={reason} testID="meal-dropped-row" />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: space[1] },
  // As far from the group over it as a heading stands.
  apart: { marginTop: space[2] },
  // On the list's left edge, above the kinds.
  order: { ...text.caption, color: color.inkMuted },
});
