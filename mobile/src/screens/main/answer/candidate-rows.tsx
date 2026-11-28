/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { color, font, kindTone, MEAL_NUMBER, radius, RoundNumber, space, text, type ToneKind } from '@/design-system';
import type { CandidateRow } from './meal-list';

// The rows of a meal answer's list (moved out of `meal-list.tsx` for its length, P10 ticket 18): a candidate's row, a
// place closed or none may use, and a heading over them.

const BADGE = 22;
const BADGE_RIM = 1.5;

// A row's number, as the map numbers it, in its answer's kind's colour (`kindTone`): soft in a rim, the chosen one
// solid (P04 ticket 85, P10 ticket 18).
function RowNumber({ number, chosen, tone }: { number: number; chosen: boolean; tone: ToneKind }): ReactElement {
  const { ink, soft } = kindTone[tone];
  return (
    <View style={[styles.badge, { borderColor: ink, backgroundColor: chosen ? ink : soft }]}>
      <RoundNumber
        inside={BADGE - 2 * BADGE_RIM}
        number={number}
        style={[styles.number, { color: chosen ? color.onPrimary : ink }]}
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
  tone,
  disabled,
  onPress,
}: {
  row: CandidateRow;
  chosen: boolean;
  // The answer's kind, whose colour the chosen row and the numbers take, as on the map.
  tone: ToneKind;
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
        chosen && { borderColor: kindTone[tone].ink, backgroundColor: kindTone[tone].soft },
        row.faded && !chosen && styles.faded,
        pressed && styles.pressed,
      ]}
      testID={`meal-row-${String(number)}`}
    >
      <RowNumber chosen={chosen} number={number} tone={tone} />
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
  },
  closedBadge: { borderColor: color.inkSubtle, backgroundColor: color.inkSubtle },
  heading: { ...text.caption, marginTop: space[2], color: color.inkMuted },
  // The map's round's number, so that the two read as the same mark (P04 ticket 91).
  number: { fontFamily: font.bold, fontSize: MEAL_NUMBER },
  middle: { flex: 1, gap: 2 },
  name: { ...text.body, fontFamily: font.bold, color: color.ink },
  // The way this choice adds in ink, as the name; gold is for clock times alone (P04 ticket 85).
  when: { ...text.caption, fontFamily: font.semiBold, color: color.ink },
  clock: { color: color.quest },
  dishes: { ...text.caption, color: color.inkMuted },
  price: { ...text.caption, color: color.inkMuted },
});
