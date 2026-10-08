import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chip, color, font, Icon, IconButton, SearchField, size, space } from '@/design-system';
import type { EventFilter } from '@/features/events/adapter';

// The 행사 tab's app bar and filters, as the `Events` frame draws them.

const FILTERS: readonly { key: EventFilter; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'today', label: '오늘' },
  { key: 'week', label: '이번 주' },
  { key: 'recruiting', label: '파티 모집 중' },
];

// The sparkle that opens the AI 매칭 신청 list, with a navy count of the waiting requests.
export function MatchingButton({ count }: { count: number }): ReactElement {
  return (
    <Pressable
      accessibilityLabel={count === 0 ? 'AI 매칭 신청 내역' : `AI 매칭 신청 내역 ${count}건`}
      accessibilityRole="button"
      onPress={() => {
        router.push('/matching');
      }}
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
    >
      <Icon color={color.ink} name="sparkle" size={22} />
      {count === 0 ? null : (
        <View style={styles.count}>
          <Text style={styles.countWords}>{count}</Text>
        </View>
      )}
    </Pressable>
  );
}

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
      {FILTERS.map(({ key, label }) => (
        <Chip
          key={key}
          onPress={() => {
            onFilter(key);
          }}
          selected={key === filter}
        >
          {label}
        </Chip>
      ))}
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
  iconButton: { alignItems: 'center', justifyContent: 'center', width: size.touchMin, height: size.touchMin },
  pressed: { backgroundColor: color.surfaceSunken, borderRadius: size.touchMin / 2 },
  count: {
    position: 'absolute',
    top: 6,
    right: 4,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: color.snuBlue,
  },
  countWords: { fontFamily: font.bold, fontSize: 11, lineHeight: 14, color: color.onPrimary },
  filtersScroll: { flexGrow: 0 },
  filters: { alignItems: 'center', gap: space[2], minHeight: 56, paddingHorizontal: space[4] },
});
