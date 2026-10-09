/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { router, useLocalSearchParams } from 'expo-router';
import { type ReactElement, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  color,
  font,
  Icon,
  mapText,
  questTone,
  radius,
  shadow,
  space,
  text,
  textHalo,
  useToast,
} from '@/design-system';
import type { QuestRowView } from '@/features/quests/adapter';
import { useQuestRows } from '@/features/quests/use-quest-rows';
import { listRows, LISTS, listsTop, type Room } from './layout';
import { CollapseButton, RowWindow } from './list-parts';
import type { MainMap } from './use-main-map';
import type { Selection } from './use-selection';

interface QuestListProps {
  map: MainMap;
  selection: Selection;
  // The room the list has: its window is lower on a low screen.
  room: Room;
}

interface RowsProps {
  rows: readonly QuestRowView[];
  shown: number;
  onPress: (row: QuestRowView) => void;
}

interface QuestRowProps {
  row: QuestRowView;
  // Where the row is in the list, for the rail that joins the rows' rounds: it starts at the first row's round and
  // ends at the last one's. A list of one row has none.
  first: boolean;
  last: boolean;
  onPress: () => void;
}

// The pill at the list's head: "퀘스트", the number of today's Quests, and the round button that opens the Quest list
// on the whole screen. The pill itself takes no press.
function QuestPill({ count, onFullScreen }: { count: number | null; onFullScreen: () => void }): ReactElement {
  return (
    <View style={styles.pill}>
      <View style={styles.pillLabel}>
        <Icon color={color.quest} name="flag" size={16} />
        <Text style={styles.pillName}>퀘스트</Text>
        {count === null ? null : (
          <Text style={styles.pillCount} testID="quest-count">
            {count}
          </Text>
        )}
      </View>
      <Pressable
        accessibilityLabel="퀘스트 전체 화면으로 열기"
        accessibilityRole="button"
        hitSlop={space[2]}
        onPress={onFullScreen}
        style={({ pressed }) => [styles.fullScreen, pressed && styles.fullScreenPressed]}
      >
        <Icon color={color.ink} name="expand" size={16} />
      </Pressable>
    </View>
  );
}

// One Quest of today: its words at the left of the round that holds its icon, both in the colour of its tone. The
// rail runs behind the round.
function QuestRow({ row, first, last, onPress }: QuestRowProps): ReactElement {
  const tint = questTone[row.tone];
  return (
    <Pressable
      accessibilityLabel={[row.kicker, row.title, row.meta].filter((part) => part !== '').join(' · ')}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.row}
    >
      <View style={styles.words}>
        <Text numberOfLines={1} style={[styles.kicker, { color: tint }]}>
          {row.kicker}
        </Text>
        <Text numberOfLines={1} style={styles.title}>
          {row.title}
        </Text>
        <Text numberOfLines={1} style={styles.meta}>
          {row.meta}
        </Text>
      </View>
      <View style={styles.nodeColumn}>
        {first && last ? null : (
          <View
            style={[styles.rail, { top: first ? LISTS.row / 2 : 0, bottom: last ? LISTS.row / 2 : -LISTS.rowGap }]}
          />
        )}
        <View style={[styles.node, { backgroundColor: tint }]}>
          <Icon color={color.onPrimary} name={row.icon} size={16} />
        </View>
      </View>
    </Pressable>
  );
}

// What a press on a row does. A class's row brings the map to its place at the "names" level, closes an open card
// as the frame does, and says the class and the place. Any other row opens the Quest's room.
function usePress({ map, selection }: Pick<QuestListProps, 'map' | 'selection'>): (row: QuestRowView) => void {
  const showToast = useToast();
  return (row) => {
    if (row.kind !== 'class') {
      router.push(`/room/${row.id}`);
      return;
    }
    if (row.position !== null) {
      map.goTo(row.position, 'names');
    }
    selection.close();
    showToast(row.place === '' ? row.title : `${row.title} · ${row.place}`);
  };
}

// A class pressed on the Quest list on the whole screen comes back by the main screen's address, `/main?quest=…`:
// the map goes to it as for a press of its row here, once the rows are known.
function useAskedQuest(rows: readonly QuestRowView[] | undefined, press: (row: QuestRowView) => void): void {
  const { quest } = useLocalSearchParams<{ quest?: string }>();
  useEffect(() => {
    if (quest === undefined || rows === undefined) {
      return;
    }
    router.setParams({ quest: undefined });
    const row = rows.find(({ id }) => id === quest);
    if (row !== undefined) {
      press(row);
    }
  }, [quest, rows, press]);
}

// The Quest list of the `Main` frame, at the right over the map: the round button that collapses the list, the pill,
// and today's Quests joined by the rail, in a window of up to three rows. Without a Quest it says so.
export function QuestList({ map, selection, room }: QuestListProps): ReactElement {
  const rows = useQuestRows().data;
  const [open, setOpen] = useState(true);
  const press = usePress({ map, selection });
  useAskedQuest(rows, press);
  const { top } = useSafeAreaInsets();
  const shown = listRows(room, top).quests;
  return (
    <View style={[styles.list, { top: listsTop(top) }]} testID="quest-list">
      <View style={styles.header}>
        <CollapseButton
          list="퀘스트 목록"
          onPress={() => {
            setOpen(!open);
          }}
          open={open}
          pill="right"
        />
        <QuestPill
          count={rows?.length ?? null}
          onFullScreen={() => {
            router.push('/quests');
          }}
        />
      </View>
      {open && rows !== undefined ? <Rows onPress={press} rows={rows} shown={shown} /> : null}
    </View>
  );
}

function Rows({ rows, shown, onPress }: RowsProps): ReactElement | null {
  if (rows.length === 0) {
    return <Text style={styles.empty}>오늘 일정 없음</Text>;
  }
  if (shown === 0) {
    return null;
  }
  return (
    <View style={styles.rows}>
      <RowWindow
        rows={rows.map((row, index) => (
          <QuestRow
            first={index === 0}
            key={row.id}
            last={index === rows.length - 1}
            onPress={() => {
              onPress(row);
            }}
            row={row}
          />
        ))}
        shown={shown}
        side="right"
        testID="quest-rows"
      />
    </View>
  );
}

const HEADER_GAP = 6;
const FULL_SCREEN = 32;
const NODE = 28;
const RAIL = 2;
// The frame keeps a title inside 146.
const TITLE_WIDTH = 146;

const styles = StyleSheet.create({
  list: {
    position: 'absolute',
    right: LISTS.side,
    alignItems: 'flex-end',
    width: LISTS.questsWidth,
    gap: LISTS.gap,
    pointerEvents: 'box-none',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: HEADER_GAP, pointerEvents: 'box-none' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[2],
    height: LISTS.header,
    paddingRight: space[1],
    paddingLeft: 14,
    borderRadius: radius.full,
    backgroundColor: color.surface,
    boxShadow: shadow.float,
  },
  pillLabel: { flexDirection: 'row', alignItems: 'center', gap: HEADER_GAP },
  pillName: { ...text.label, color: color.ink },
  pillCount: { ...text.label, fontFamily: font.medium, color: color.inkMuted },
  fullScreen: {
    alignItems: 'center',
    justifyContent: 'center',
    width: FULL_SCREEN,
    height: FULL_SCREEN,
    borderRadius: radius.full,
    backgroundColor: color.surfaceSubtle,
  },
  fullScreenPressed: { backgroundColor: color.surfaceSunken },
  rows: { alignSelf: 'stretch', pointerEvents: 'box-none' },
  // A row is as wide as its words and its round, at the right, and no wider than its column: the map beside it takes
  // the touch.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: space[2],
    maxWidth: '100%',
    height: LISTS.row,
  },
  words: { alignItems: 'flex-end', flexShrink: 1 },
  kicker: { ...mapText.rowKicker, ...textHalo },
  title: { ...mapText.rowTitle, ...textHalo, maxWidth: TITLE_WIDTH, color: color.ink },
  meta: { ...mapText.rowLine, ...textHalo, color: color.inkMuted },
  nodeColumn: { alignItems: 'center', justifyContent: 'center', width: NODE, height: LISTS.row },
  rail: {
    position: 'absolute',
    left: (NODE - RAIL) / 2,
    width: RAIL,
    backgroundColor: color.inkMuted,
    boxShadow: shadow.mapRail,
  },
  node: {
    alignItems: 'center',
    justifyContent: 'center',
    width: NODE,
    height: NODE,
    borderRadius: radius.full,
    boxShadow: shadow.mapMark,
  },
  empty: {
    ...mapText.empty,
    ...textHalo,
    alignSelf: 'flex-end',
    paddingVertical: space[2],
    paddingHorizontal: space[1],
    color: color.inkMuted,
    pointerEvents: 'none',
  },
});
