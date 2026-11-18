/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-18  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { ActivityIndicator, Pressable, type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import {
  BottomSheet,
  cardStyles,
  color,
  Dialog,
  ErrorState,
  font,
  Icon,
  LoadingState,
  radius,
  space,
  text,
} from '@/design-system';
import { useTimetableVersions } from '@/features/timetable/use-versions';
import {
  PHONE_ONLY,
  READING,
  SEND,
  SEND_BODY,
  SEND_TITLE,
  useImportFromImage,
} from '@/features/timetable-ocr/use-import-from-image';
import { useWeek } from '@/features/timetable/use-week';
import { UnfinishedSwitch } from './unfinished-switch';
import { VersionMenu } from './version-menu';
import { WeekGrid } from './week-grid';

function openTimetable(): void {
  router.push('/me/timetable');
}

// The same 수업 수정 as the class's row in 시간표.
function openClass(classId: string): void {
  router.push({ pathname: '/me/timetable/class', params: { classId } });
}

// The 시간표 card: the User's week from the main server, the version it is, and the ways to fill it in.
export function WeekCard(): ReactElement {
  const { data, isPending, refetch } = useWeek();
  const versions = useTimetableVersions();
  const importing = useImportFromImage(versions);
  const tiles = [
    { icon: 'calendar', label: '직접 입력/수정', onPress: openTimetable, busy: false },
    { icon: 'plus', label: '이미지로 불러오기', onPress: importing.start, busy: importing.reading },
  ] as const;
  return (
    <View style={[cardStyles.card, styles.card]}>
      <View style={styles.head}>
        <Text accessibilityRole="header" style={styles.title}>
          시간표
        </Text>
        <VersionMenu versions={versions} />
      </View>
      <UnfinishedSwitch versions={versions} />
      {data === undefined ? null : <WeekGrid blocks={data} onOpenClass={openClass} />}
      {data === undefined && isPending ? <LoadingState /> : null}
      {data === undefined && !isPending ? <ErrorState onRetry={refetch} /> : null}
      <View style={styles.tiles}>
        {tiles.map(({ icon, label, onPress, busy }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ busy }}
            key={label}
            onPress={onPress}
            style={({ pressed }): StyleProp<ViewStyle> => [styles.tile, pressed && styles.pressed]}
          >
            <Icon color={color.snuBlue} name={icon} size={20} />
            <Text style={styles.tileWords}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <SendNotice answer={importing.answer} visible={importing.asking} />
      <BottomSheet label="시간표 읽기" onClose={ignore} open={importing.reading}>
        <View style={styles.reading} testID="timetable-reading">
          <ActivityIndicator color={color.snuBlue} />
          <Text style={styles.readingWords}>{READING}</Text>
        </View>
      </BottomSheet>
    </View>
  );
}

// The notice before the first send of a picture to the main server's AI (P15-52).
function SendNotice({ visible, answer }: { visible: boolean; answer: (send: boolean) => void }): ReactElement {
  return (
    <Dialog
      body={SEND_BODY}
      cancelLabel={PHONE_ONLY}
      confirmLabel={SEND}
      onCancel={() => {
        answer(false);
      }}
      onConfirm={() => {
        answer(true);
      }}
      title={SEND_TITLE}
      visible={visible}
    />
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
