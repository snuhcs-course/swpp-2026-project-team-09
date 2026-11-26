/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by TaeHyun79
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { type ReactElement, useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { ChipRow, color, IconButton, SearchField, space } from '@/design-system';
import { BOARDS } from '@/features/party/boards';
import type { BoardFilter } from '@/features/party/finding';

const FILTERS: readonly { key: BoardFilter; label: string }[] = [
  { key: 'all', label: '전체' },
  ...BOARDS.map(({ key, name }) => ({ key, label: name })),
];

// The chips fade into the tab's grey ground before the magnifier's line, as the wireframe draws it, and scroll under
// the fade.
function EndFade(): ReactElement {
  // Unique on the page, and only letters, digits, `_` and `-`, as an SVG `url(#…)` needs.
  const id = `find-fade${useId().replaceAll(/[^\w-]/gu, '')}`;
  return (
    <Svg height="100%" pointerEvents="none" style={styles.fade} testID="find-filters-fade" width={FADE_WIDTH}>
      <Defs>
        <LinearGradient id={id} x1="0" x2="1" y1="0" y2="0">
          <Stop offset="0" stopColor={color.surfaceSubtle} stopOpacity={0} />
          <Stop offset="1" stopColor={color.surfaceSubtle} stopOpacity={1} />
        </LinearGradient>
      </Defs>
      <Rect fill={`url(#${id})`} height="100%" width={FADE_WIDTH} />
    </Svg>
  );
}

interface FindBarProps {
  board: BoardFilter;
  onBoard: (board: BoardFilter) => void;
  // The words searched, or null while the filters show.
  search: string | null;
  onSearch: (search: string | null) => void;
}

// 찾기's row under the tabs, which stays put while the cards scroll: the board filters, drawn as 내 파티's without
// counts, with the magnifier at their end; once it is pressed, the search field, whose ✕ brings the filters back at 전체.
export function FindBar({ board, onBoard, search, onSearch }: FindBarProps): ReactElement {
  if (search !== null) {
    return (
      <View style={styles.searchRow}>
        <View style={styles.grow}>
          <SearchField label="파티 검색어" onChangeText={onSearch} placeholder="파티 검색" value={search} />
        </View>
        <IconButton
          icon="x"
          label="검색 닫기"
          onPress={() => {
            onBoard('all');
            onSearch(null);
          }}
        />
      </View>
    );
  }
  return (
    <View style={styles.filterRow}>
      <View style={styles.grow}>
        <ChipRow chips={FILTERS} onSelect={onBoard} selected={board} />
        <EndFade />
      </View>
      <View style={styles.divider} />
      <IconButton
        icon="search"
        label="파티 검색"
        onPress={() => {
          onSearch('');
        }}
      />
    </View>
  );
}

// Both rows are 60 high, as `ChipRow` is: the field is 44 high.
const SEARCH_PADDING = 8;
const DIVIDER_HEIGHT = 24;
const FADE_WIDTH = 28;

const styles = StyleSheet.create({
  filterRow: { flexDirection: 'row', alignItems: 'center', paddingRight: space[2] },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    paddingVertical: SEARCH_PADDING,
    paddingRight: space[2],
    paddingLeft: space[4],
  },
  grow: { flex: 1 },
  divider: { width: 1, height: DIVIDER_HEIGHT, backgroundColor: color.border },
  fade: { position: 'absolute', top: 0, right: 0, bottom: 0 },
});
