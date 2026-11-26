/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AnswerReply, Cuisine, Plan } from '@/api/assistant-types';
import { color, font, radius, RoundNumber, space, text } from '@/design-system';
import { addedWalk, fadedPlan, travelWords } from '@/features/assistant/answer-walks';
import { kindShown, serves } from '@/features/assistant/meal-kinds';
import { dishWords, priceWords } from '@/features/assistant/meal-menus';
import type { ShownAnswer } from '@/features/assistant/use-shown-answer';
import { withParticle } from '@/features/map/short-name';
import { koreaClock } from '@/korea-time';
import { KindChips } from './kind-chips';

// The raised card of a meal answer (board E3): every candidate as a row, the kinds of food over them as the filter.

export interface CandidateRow {
  // As the map numbers it.
  number: number;
  planId: string;
  name: string;
  // The way this choice adds to the User's day, "걸음 16분", or "이동 16분 · 셔틀" with a leg by shuttle, or when the User
  // is there, "11:53 도착", when where they start is not known.
  when: string;
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

function rowOf(plan: Plan, index: number, kind: Cuisine | null): CandidateRow {
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
    dishes: plan.menu === undefined ? null : dishWords(plan.menu, kind),
    price: plan.menu === undefined ? null : priceWords(plan.menu),
    startAt: plan.startAt,
  };
}

// A meal answer with a Plan, whose raised card is the list, though it holds one place.
export function mealCard(answer: AnswerReply | null): boolean {
  return answer?.input.kind === 'meal' && answer.plans.length > 0;
}

// The places the list offers ("8곳 목록"), as its first line and "전체" count them: the candidates, which the answer
// on screen holds only as they can be done (`offeredAnswer`). The places closed for the meal stand apart at the list's
// end and are not counted.
export function listedCount(answer: AnswerReply): number {
  return answer.plans.length;
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
export function candidateRowsOf(answer: AnswerReply | null): CandidateRow[] {
  if (answer === null || !mealCard(answer)) {
    return [];
  }
  const kind = kindShown(answer);
  const rows = answer.plans
    .map((plan, index) => ({ plan, row: rowOf(plan, index, kind) }))
    .filter(({ plan }) => kind === null || serves(plan, kind))
    .map(({ row }) => row);
  // Only where the User starts is known is the main server's order the least walking. Otherwise it stands as it came:
  // without a walk anywhere, the walk on to the next item, the earliest start, the longest time to eat (P05 ticket 40);
  // with a way on alone, those where everyone has thirty minutes first (P05 ticket 45). An order of the phone's would
  // scramble it.
  return byWalking(answer)
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
// being unknown, the main server's order of its pick first ("추천 순").
export function listOrderWords(answer: AnswerReply): string {
  if (byWalking(answer)) {
    return '걸음이 적은 순';
  }
  return walksKnown(answer) ? '추천 순' : '일찍 여는 순';
}

const BADGE = 22;
const BADGE_RIM = 1.5;

// A row's number, as the map numbers it: soft coral with a coral rim, the chosen one solid coral (P04 ticket 85).
function RowNumber({ number, chosen }: { number: number; chosen: boolean }): ReactElement {
  return (
    <View style={[styles.badge, chosen && styles.chosenBadge]}>
      <RoundNumber
        inside={BADGE - 2 * BADGE_RIM}
        number={number}
        style={[styles.number, chosen && styles.chosenNumber]}
      />
    </View>
  );
}

// A row's way in ink, or the clock time when the User is there in gold (P04 ticket 85).
function WayLine({ row }: { row: CandidateRow }): ReactElement {
  return (
    <Text
      numberOfLines={1}
      style={[styles.when, row.clock && styles.clock]}
      testID={`meal-row-${String(row.number)}-when`}
    >
      {row.when}
    </Text>
  );
}

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
      <RowNumber chosen={chosen} number={number} />
      <View style={styles.middle}>
        <Text numberOfLines={1} style={styles.name}>
          {name}
        </Text>
        <WayLine row={row} />
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

// A Restaurant closed for the meal: its name and its notice, grey, not numbered, and no press.
function ClosedRow({ name, notice }: { name: string; notice: string }): ReactElement {
  return (
    <View
      accessibilityLabel={`${name} · ${notice}`}
      accessible
      style={[styles.row, styles.faded]}
      testID="meal-closed-row"
    >
      <View style={[styles.badge, styles.closedBadge]} />
      <View style={styles.middle}>
        <Text numberOfLines={1} style={styles.name}>
          {name}
        </Text>
        <Text numberOfLines={2} style={styles.dishes}>
          {notice}
        </Text>
      </View>
    </View>
  );
}

function Heading({ words }: { words: string }): ReactElement {
  return (
    <Text accessibilityRole="header" style={styles.heading}>
      {words}
    </Text>
  );
}

interface MealListProps {
  answer: AnswerReply;
  shown: Pick<ShownAnswer, 'index' | 'openMenu' | 'chooseKind'>;
  // A Plan is being sent or is made, or a recalculation is on its way: nothing is chosen, as on the map.
  busy: boolean;
}

// The kinds of food on top, then a row per candidate; the chosen one is marked. The answer on screen holds only the
// places that can be done (`offeredAnswer`, P04 ticket 71): asked, the Assistant says why one is missing. The Restaurants closed for the
// meal end the list under "쉬는 곳". A press on a row chooses that place,
// as a press on its tag does, and opens its menu (board E4).
export function MealList({ answer, shown, busy }: MealListProps): ReactElement | null {
  if (!mealCard(answer)) {
    return null;
  }
  const chosen = answer.plans[shown.index]?.id;
  const rows = candidateRowsOf(answer);

  const closed = answer.closed ?? [];
  const row = (one: CandidateRow): ReactElement => (
    <Row
      chosen={one.planId === chosen}
      disabled={busy}
      key={one.planId}
      onPress={() => {
        shown.openMenu(one.planId);
      }}
      row={one}
    />
  );
  return (
    <View style={styles.list} testID="meal-list">
      <Text numberOfLines={1} style={styles.order} testID="meal-list-order">
        {orderLineOf(answer, rows.length)}
      </Text>
      <KindChips answer={answer} disabled={busy} onChoose={shown.chooseKind} />
      {rows.map((one) => row(one))}
      {closed.length === 0 ? null : <Heading words={CLOSED_HEADING} />}
      {closed.map(({ place, notices }) => (
        <ClosedRow key={`${place.placeId}:${place.label}`} name={place.label} notice={notices.join(' ')} />
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
  // The chosen Restaurant and the numbers in a meal answer's coral (P04 ticket 85), as on the map; times keep gold.
  chosen: { borderColor: color.meal, backgroundColor: color.mealSoft },
  pressed: { opacity: 0.6 },
  faded: { opacity: 0.45 },
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    width: BADGE,
    height: BADGE,
    marginTop: 2,
    borderRadius: radius.full,
    borderWidth: BADGE_RIM,
    borderColor: color.meal,
    backgroundColor: color.mealSoft,
  },
  chosenBadge: { backgroundColor: color.meal },
  chosenNumber: { color: color.onPrimary },
  closedBadge: { borderColor: color.inkSubtle, backgroundColor: color.inkSubtle },
  heading: { ...text.caption, marginTop: space[2], color: color.inkMuted },
  // On the list's left edge, above the kinds.
  order: { ...text.caption, color: color.inkMuted },
  number: { ...text.micro, color: color.meal },
  middle: { flex: 1, gap: 2 },
  name: { ...text.body, fontFamily: font.bold, color: color.ink },
  // The way this choice adds in ink, as the name; gold is for clock times alone (P04 ticket 85).
  when: { ...text.caption, fontFamily: font.semiBold, color: color.ink },
  clock: { color: color.quest },
  dishes: { ...text.caption, color: color.inkMuted },
  price: { ...text.caption, color: color.inkMuted },
});
