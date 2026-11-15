/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { FriendLevel } from '@/api/types';
import { color, font, radius, shadow, size, space } from '@/design-system';

const TRACK_PADDING = 3;

const LEVELS: readonly { level: FriendLevel; words: string }[] = [
  { level: 'timetable', words: '시간표만' },
  { level: 'building', words: '지금 있는 건물' },
  { level: 'exact', words: '정확한 위치' },
];

interface LevelTrackProps {
  // The group's name, such as "민수님에게 보일 위치".
  label: string;
  // The level shown chosen, or none.
  level: FriendLevel | null;
  onChoose: (level: FriendLevel) => void;
  // While the Master Switch is off: 시간표만 shown chosen, the off look, and no press. `level` is kept for later.
  masterOff?: boolean;
}

// The three levels as cells of one width in a track, whatever the length of their words.
export function LevelTrack({ label, level, onChoose, masterOff = false }: LevelTrackProps): ReactElement {
  const shown = masterOff ? 'timetable' : level;
  return (
    <View
      accessibilityLabel={label}
      accessibilityRole="radiogroup"
      accessibilityState={{ disabled: masterOff }}
      style={[styles.track, masterOff && styles.trackOff]}
    >
      {LEVELS.map(({ level: each, words }) => {
        const chosen = each === shown;
        return (
          <Pressable
            accessibilityLabel={words}
            accessibilityRole="radio"
            accessibilityState={{ checked: chosen, disabled: masterOff }}
            aria-checked={chosen}
            disabled={masterOff}
            key={each}
            onPress={() => {
              onChoose(each);
            }}
            style={[styles.cell, chosen && styles.cellOn]}
          >
            <Text numberOfLines={1} style={[styles.cellWords, chosen && styles.cellWordsOn]}>
              {words}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    padding: TRACK_PADDING,
    borderRadius: radius.md,
    backgroundColor: color.surfaceSunken,
  },
  trackOff: { opacity: 0.5 },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    // The track is as high as the smallest touch area.
    minHeight: size.touchMin - 2 * TRACK_PADDING,
    paddingHorizontal: space[1],
    borderRadius: radius.md - TRACK_PADDING,
  },
  cellOn: { backgroundColor: color.surface, boxShadow: shadow.card },
  cellWords: { fontFamily: font.medium, fontSize: 13, lineHeight: 18, color: color.inkMuted },
  cellWordsOn: { fontFamily: font.bold, color: color.snuBlue },
});
