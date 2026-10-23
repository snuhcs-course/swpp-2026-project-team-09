/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { ActivityIndicator, Pressable, type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import {
  BottomSheet,
  cardStyles,
  color,
  ErrorState,
  font,
  Icon,
  type IconName,
  LoadingState,
  radius,
  space,
  text,
  useNotReadyToast,
} from '@/design-system';
import { useTimetableVersions } from '@/features/timetable/use-versions';
import { READING, useImportFromImage } from '@/features/timetable-ocr/use-import-from-image';
import { useWeek } from '@/features/timetable/use-week';
import { UnfinishedSwitch } from './unfinished-switch';
import { VersionMenu } from './version-menu';
import { WeekGrid } from './week-grid';

// `직접 입력` opens the timetable, `이미지로 불러오기` reads a screenshot (or says that it is not ready where the build
// cannot read one), and `빈 시간 말하기` says that it is not ready.
type TileAction = 'open' | 'import' | 'not-ready';
const TILES: readonly { icon: IconName; label: string; action: TileAction }[] = [
  { icon: 'calendar', label: '직접 입력', action: 'open' },
  { icon: 'plus', label: '이미지로 불러오기', action: 'import' },
  { icon: 'chat', label: '빈 시간 말하기', action: 'not-ready' },
];

function openTimetable(): void {
  router.push('/me/timetable');
}

// The 시간표 card: the User's week from the main server, the version it is, and the three ways to fill it in.
export function WeekCard(): ReactElement {
  const { data, isPending, refetch } = useWeek();
  const showNotReady = useNotReadyToast();
  const versions = useTimetableVersions();
  const importing = useImportFromImage(versions);
  const actions: Record<TileAction, () => void> = {
    open: openTimetable,
    import: importing.start,
    'not-ready': showNotReady,
  };
  return (
    <View style={[cardStyles.card, styles.card]}>
      <View style={styles.head}>
        <Text accessibilityRole="header" style={styles.title}>
          시간표
        </Text>
        <VersionMenu versions={versions} />
      </View>
      <UnfinishedSwitch versions={versions} />
      {data === undefined ? null : <WeekGrid blocks={data} />}
      {data === undefined && isPending ? <LoadingState /> : null}
      {data === undefined && !isPending ? <ErrorState onRetry={refetch} /> : null}
      <View style={styles.tiles}>
        {TILES.map(({ icon, label, action }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ busy: action === 'import' && importing.reading }}
            key={label}
            onPress={actions[action]}
            style={({ pressed }): StyleProp<ViewStyle> => [styles.tile, pressed && styles.pressed]}
          >
            <Icon color={color.snuBlue} name={icon} size={20} />
            <Text style={styles.tileWords}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <BottomSheet label="시간표 읽기" onClose={ignore} open={importing.reading}>
        <View style={styles.reading} testID="timetable-reading">
          <ActivityIndicator color={color.snuBlue} />
          <Text style={styles.readingWords}>{READING}</Text>
        </View>
      </BottomSheet>
    </View>
  );
}

// The reading cannot be stopped halfway: the sheet stays until it is done.
function ignore(): void {
  // Nothing.
}

const styles = StyleSheet.create({
  card: { gap: space[3] },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: space[2] },
  title: { ...text.title, color: color.ink },
  tiles: { flexDirection: 'row', gap: space[2] },
  tile: {
    flex: 1,
    alignItems: 'center',
    gap: space[1],
    paddingVertical: 10,
    paddingHorizontal: space[1],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  pressed: { backgroundColor: color.blue50 },
  tileWords: { ...text.caption, fontFamily: font.semiBold, textAlign: 'center', color: color.snuBlue },
  reading: { alignItems: 'center', gap: space[3], paddingVertical: space[6] },
  readingWords: { ...text.bodyLg, fontFamily: font.semiBold, color: color.ink },
});
