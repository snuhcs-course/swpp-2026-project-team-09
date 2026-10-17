/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, color, Icon, radius, space, text } from '@/design-system';
import { NOT_MOVED, type TimetableVersions } from '@/features/timetable/use-versions';

// Under the week card's title while a switch of timetable versions stopped before every class was on the main server.
// 다시 시도 adds only the classes still missing.
export function UnfinishedSwitch({ versions }: { versions: TimetableVersions }): ReactElement | null {
  if (versions.view?.unfinished !== true) {
    return null;
  }
  return (
    <View accessibilityRole="alert" style={styles.unfinished} testID="unfinished-switch">
      <Icon color={color.danger} name="alert" size={16} />
      <Text style={styles.words}>{NOT_MOVED}</Text>
      <Button disabled={versions.busy} onPress={versions.retry} variant="secondary">
        다시 시도
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  unfinished: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    padding: space[3],
    borderRadius: radius.md,
    backgroundColor: color.dangerSoft,
  },
  words: { ...text.label, flex: 1, color: color.danger },
});
