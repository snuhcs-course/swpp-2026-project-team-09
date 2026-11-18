/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-22  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, eventText, eventTone, IconButton, radius, SearchField, size, space } from '@/design-system';
import type { EventFilter } from '@/features/events/adapter';

// The 행사 tab's app bar and filters, as the `Events` frame draws them.

const FILTERS: readonly { key: EventFilter; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'today', label: '오늘' },
  { key: 'week', label: '이번 주' },
  { key: 'recruiting', label: '파티 모집 중' },
];

interface SearchBarProps {
  search: string;
  onSearch: (words: string) => void;
  onClose: () => void;
}

// The search field in place of the title, and ✕ that closes it.
export function SearchBar({ search, onSearch, onClose }: SearchBarProps): ReactElement {
  const { top } = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingTop: top }]}>
      <View style={styles.barRow}>
        <View style={styles.field}>
          <SearchField label="행사 검색어" onChangeText={onSearch} placeholder="행사 검색" value={search} />
        </View>
        <IconButton icon="x" label="검색 닫기" onPress={onClose} />
      </View>
    </View>
  );
}

// The `Events` frame's filters: words on the white ground, the chosen one bold in navy on light blue.
export function Filters({
  filter,
  onFilter,
}: {
  filter: EventFilter;
  onFilter: (filter: EventFilter) => void;
}): ReactElement {
  return (
    <ScrollView
      contentContainerStyle={styles.filters}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.filtersScroll}
    >
      {FILTERS.map(({ key, label }) => {
        const chosen = key === filter;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: chosen }}
            key={key}
            onPress={() => {
              onFilter(key);
            }}
            style={[styles.filter, chosen && styles.chosen]}
          >
            <Text style={chosen ? styles.chosenWords : styles.words}>{label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: color.surface, borderBottomWidth: 1, borderBottomColor: color.border },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    height: size.appBar,
    paddingRight: space[2],
    paddingLeft: space[4],
  },
  field: { flex: 1 },
  // The row is 60 high: the room above and below the filters is padding on the scroller, as in `ChipRow`, so that
  // Android keeps it.
  filtersScroll: { flexGrow: 0, paddingVertical: 10 },
  filters: { alignItems: 'center', gap: space[1], paddingHorizontal: space[4] },
  filter: { justifyContent: 'center', height: 40, paddingHorizontal: space[4], borderRadius: radius.md },
  chosen: { backgroundColor: eventTone.chosen },
  words: { ...eventText.filter, color: color.inkMuted },
  chosenWords: { ...eventText.filterChosen, color: color.snuBlue },
});
