/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 * 2026-11-29  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { useIsFocused } from 'expo-router';
import type { ReactElement, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AppBar,
  color,
  IconButton,
  type IconName,
  SearchField,
  space,
  TAB_BAR_ROW,
  useToastAbove,
} from '@/design-system';
import { useBackToClose } from '@/hooks/use-back-to-close';
import { takenUnderToastOverNav } from './layout';

// A tab's search in its app bar, as 행사 and 파티 have it: the magnifier at the bar's top right, and once pressed the
// title's row is the field, which takes the focus at once, and ✕ "검색 닫기". The words narrow the tab's list together
// with its filters.
export interface TabSearch {
  // The magnifier's name, such as "행사 검색".
  label: string;
  // The field's name, such as "행사 검색어", and its grey words.
  field: string;
  placeholder: string;
  // The words searched, or null while the title shows.
  words: string | null;
  // '' when the magnifier opens the search, null when ✕ or Android's back closes it.
  onWords: (words: string | null) => void;
}

// A tab's switch in its app bar, left of the magnifier, such as 행사's ☆ that shows the starred events alone: its icon
// filled in navy while it is on.
export interface TabToggle {
  icon: IconName;
  // What a screen reader says, such as "별표한 행사만 보기", with whether it is on.
  label: string;
  on: boolean;
  onToggle: () => void;
}

interface TabScreenProps {
  title: string;
  // Muted words after the title, such as 오늘's date.
  aside?: string;
  // Beside the magnifier.
  actions?: ReactNode;
  search?: TabSearch;
  toggle?: TabToggle;
  children: ReactNode;
}

function SearchBar({ search, words }: { search: TabSearch; words: string }): ReactElement {
  const { top } = useSafeAreaInsets();
  const close = (): void => {
    search.onWords(null);
  };
  // Only while its tab is in front: the tabs behind it stay mounted.
  useBackToClose(useIsFocused(), close);
  return (
    <View style={[styles.bar, { paddingTop: top }]}>
      <View style={styles.barRow}>
        <View style={styles.field}>
          <SearchField
            autoFocus
            variant="bare"
            label={search.field}
            onChangeText={search.onWords}
            placeholder={search.placeholder}
            value={words}
          />
        </View>
        <IconButton icon="x" label="검색 닫기" onPress={close} />
      </View>
    </View>
  );
}

// A tab other than 지도, as the `Party`, `Events` and `Profile` frames draw it: the tab's app bar on the grey ground,
// and a toast 16 above the navigation while the tab is in front.
export function TabScreen({ title, aside, actions, search, toggle, children }: TabScreenProps): ReactElement {
  const { bottom } = useSafeAreaInsets();
  useToastAbove(takenUnderToastOverNav(bottom), useIsFocused());
  const magnifier =
    search === undefined ? null : (
      <IconButton
        icon="search"
        label={search.label}
        onPress={() => {
          search.onWords('');
        }}
      />
    );
  return (
    <View style={styles.screen}>
      {search === undefined || search.words === null ? (
        <AppBar
          actions={
            <>
              {toggle === undefined ? null : (
                <IconButton icon={toggle.icon} label={toggle.label} on={toggle.on} onPress={toggle.onToggle} />
              )}
              {magnifier}
              {actions}
            </>
          }
          aside={aside}
          title={title}
        />
      ) : (
        <SearchBar search={search} words={search.words} />
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surfaceSubtle },
  bar: { backgroundColor: color.surface, borderBottomWidth: 1, borderBottomColor: color.border },
  barRow: {
    ...TAB_BAR_ROW,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    paddingRight: space[2],
    // Where the title starts in the app bar.
    paddingLeft: space[5],
  },
  field: { flex: 1 },
});
