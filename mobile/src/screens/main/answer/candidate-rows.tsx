/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { color, font, MEAL_NUMBER, radius, RoundNumber, space, text } from '@/design-system';
import type { CandidateRow } from './meal-list';

// The rows of a meal answer's list (moved out of `meal-list.tsx` for its length, P10 ticket 18): a candidate's row, a
// place closed or none may use, and a heading over them.

const BADGE = 22;
const BADGE_RIM = 1.5;

// A row's number, as the map numbers it: soft coral with a coral rim, the chosen one solid coral (P04 ticket 85); a study
// answer's in the study colours (P10 ticket 18).
function RowNumber({ number, chosen, study }: { number: number; chosen: boolean; study: boolean }): ReactElement {
  return (
    <View
      style={[
        styles.badge,
        study && styles.studyBadge,
        chosen && (study ? styles.studyChosenBadge : styles.chosenBadge),
      ]}
    >
      <RoundNumber
        inside={BADGE - 2 * BADGE_RIM}
        number={number}
        style={[styles.number, study && styles.studyNumber, chosen && styles.chosenNumber]}
      />
    </View>
  );
}

// A row's way in ink, or the clock time when the User is there in gold (P04 ticket 85).
function WayLine({ row, when }: { row: CandidateRow; when: string }): ReactElement {
  return (
    <Text
      numberOfLines={1}
      style={[styles.when, row.clock && styles.clock]}
      testID={`meal-row-${String(row.number)}-when`}
    >
      {when}
    </Text>
  );
}

export function Row({
  row,
  chosen,
  study,
  disabled,
  onPress,
}: {
  row: CandidateRow;
  chosen: boolean;
  study: boolean;
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
        chosen && (study ? styles.studyChosen : styles.chosen),
        row.faded && !chosen && styles.faded,
        pressed && styles.pressed,
      ]}
      testID={`meal-row-${String(number)}`}
    >
      <RowNumber chosen={chosen} number={number} study={study} />
      <View style={styles.middle}>
        <Text numberOfLines={1} style={styles.name}>
          {name}
        </Text>
        {when === null ? null : <WayLine row={row} when={when} />}
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

// A Restaurant closed for the meal: its name and its notice, grey, not numbered, and no press. A place a study answer
// cannot offer, as only its students may use it, is the same at the list's very end (P10 ticket 18).
export function ClosedRow({
  name,
  notice,
  testID = 'meal-closed-row',
}: {
  name: string;
  notice: string;
  testID?: string;
}): ReactElement {
  return (
    <View accessibilityLabel={`${name} · ${notice}`} accessible style={[styles.row, styles.faded]} testID={testID}>
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

export function Heading({ words }: { words: string }): ReactElement {
  return (
    <Text accessibilityRole="header" style={styles.heading}>
      {words}
    </Text>
  );
}

const styles = StyleSheet.create({
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
  // A study answer's place, in the study colours as on the map (P10 ticket 18).
  studyChosen: { borderColor: color.svcStudy, backgroundColor: color.svcStudySoft },
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
  studyBadge: { borderColor: color.svcStudy, backgroundColor: color.svcStudySoft },
  studyChosenBadge: { backgroundColor: color.svcStudy },
  chosenNumber: { color: color.onPrimary },
  closedBadge: { borderColor: color.inkSubtle, backgroundColor: color.inkSubtle },
  heading: { ...text.caption, marginTop: space[2], color: color.inkMuted },
  // The map's round's number, so that the two read as the same mark (P04 ticket 91).
  number: { fontFamily: font.bold, fontSize: MEAL_NUMBER, color: color.meal },
  studyNumber: { color: color.svcStudy },
  middle: { flex: 1, gap: 2 },
  name: { ...text.body, fontFamily: font.bold, color: color.ink },
  // The way this choice adds in ink, as the name; gold is for clock times alone (P04 ticket 85).
  when: { ...text.caption, fontFamily: font.semiBold, color: color.ink },
  clock: { color: color.quest },
  dishes: { ...text.caption, color: color.inkMuted },
  price: { ...text.caption, color: color.inkMuted },
});
