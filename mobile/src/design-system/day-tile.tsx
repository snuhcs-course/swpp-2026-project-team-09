/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { color, font } from './tokens';

interface DayTileProps {
  // "오늘", "내일", or the weekday, "목".
  top: string;
  // The day of the month.
  date: number;
  // 0 for Sunday, which is in red, and 6 for Saturday, in blue.
  weekday: number;
  // What a screen reader says: "10월 6일 화요일".
  label: string;
  selected: boolean;
  onPress: () => void;
}

const SUNDAY = 0;
const SATURDAY = 6;

// A day to choose, as the date sheet of the `PartyCreate` frame draws it: 52 by 60, the day's name over its number,
// the chosen one in navy.
export function DayTile({ top, date, weekday, label, selected, onPress }: DayTileProps): ReactElement {
  const ink = selected
    ? color.onPrimary
    : weekday === SUNDAY
      ? color.danger
      : weekday === SATURDAY
        ? color.blue600
        : color.ink;
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.tile, selected && styles.selected]}
    >
      <Text style={[styles.top, { color: ink }]}>{top}</Text>
      <Text style={[styles.date, { color: ink }]}>{date}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    width: 52,
    height: 60,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  selected: { borderColor: color.snuBlue, backgroundColor: color.snuBlue },
  top: { fontFamily: font.medium, fontSize: 12, lineHeight: 16, opacity: 0.8 },
  date: { fontFamily: font.bold, fontSize: 18, lineHeight: 24 },
});
