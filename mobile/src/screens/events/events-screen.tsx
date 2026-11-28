/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-08  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-16  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ChipRow, color, EmptyState, ErrorState, LoadingState, NO_RESULTS, type RowChip, space } from '@/design-system';
import {
  EVENT_SEARCH_HINT,
  type EventFilter,
  type EventSources,
  type EventView,
  NO_STARRED,
  NO_STARRED_LINE,
  toEventViews,
} from '@/features/events/adapter';
import type { Quest } from '@/api/types';
import { useEventSources } from '@/features/events/use-events';
import { showFind } from '../party/use-party-actions';
import { TabScreen, type TabSearch } from '../shell/tab-screen';
import { EventDetailSheet } from './event-detail-sheet';
import { EventRow } from './event-row';
import { EventSheets, type EventSheetsState, type PickedEvent, useEventSheets } from './event-sheets';
import { type Focus, useFocus } from './use-focus';
import { useStarred } from './use-starred';

// The `Events` frame's filters, in the app's one row of filters.
const FILTERS: readonly RowChip<EventFilter>[] = [
  { key: 'all', label: '전체' },
  { key: 'today', label: '오늘' },
  { key: 'week', label: '이번 주' },
  { key: 'recruiting', label: '파티 모집 중' },
];

interface ListProps extends Omit<Focus, 'focused'> {
  sources: EventSources;
  filter: EventFilter;
  search: string;
  // The starred events alone, while the ☆ is on.
  kept: ReadonlySet<string> | null;
  focused: string | null;
  onOpen: (event: EventView) => void;
  onParty: (event: PickedEvent) => void;
}

// What the list says when nothing is left: the search's 결과 없음, the ☆'s words, or the filter's.
function Empty({ filter, search, kept }: Pick<ListProps, 'filter' | 'search' | 'kept'>): ReactElement {
  if (search.trim() !== '') {
    return <EmptyState words={NO_RESULTS} />;
  }
  if (kept !== null) {
    return <EmptyState line={NO_STARRED_LINE} words={NO_STARRED[filter]} />;
  }
  return <EmptyState words="해당하는 행사가 없어요" />;
}

function List({ sources, filter, search, kept, focused, scroll, onCardAt, onOpen, onParty }: ListProps): ReactElement {
  const views = toEventViews(sources, filter, search, kept);
  // Without any event, the tab says what it is for, and leads to the 파티 one can join meanwhile (HE H7).
  if (sources.events.length === 0) {
    return (
      <EmptyState action={{ label: '파티 찾기', onPress: showFind }} words="여기서는 학교 행사를 모아 볼 수 있어요" />
    );
  }
  if (views.length === 0) {
    return <Empty filter={filter} kept={kept} search={search} />;
  }
  return (
    <ScrollView contentContainerStyle={styles.list} ref={scroll}>
      {views.map((event) => (
        <EventRow
          event={event}
          focused={event.id === focused}
          key={event.id}
          onLayout={(y) => {
            onCardAt(event.id, y);
          }}
          onOpen={() => {
            onOpen(event);
          }}
          onParty={() => {
            onParty(event);
          }}
        />
      ))}
    </ScrollView>
  );
}

interface SheetsProps {
  opened: EventView | null;
  onOpen: (event: EventView | null) => void;
  sheets: EventSheetsState;
  quests: readonly Quest[];
}

// The detail sheet of the row pressed, whose party button leads on to 파티 찾기/모집.
function Sheets({ opened, onOpen, sheets, quests }: SheetsProps): ReactElement {
  return (
    <>
      <EventDetailSheet
        event={opened}
        onClose={() => {
          onOpen(null);
        }}
        action={{
          kind: 'party',
          onPress: (event) => {
            onOpen(null);
            sheets.setRecruitEvent(event);
          },
        }}
      />
      <EventSheets quests={quests} sheets={sheets} />
    </>
  );
}

interface EventsScreenProps {
  // An event to show marked, from its address: `/events?focus=<id>`.
  focus?: string;
  onFocused: () => void;
}

// The app bar's search: its words, or null while the title shows; ✕ also sets the filters back to 전체.
function searchOf(words: string | null, onWords: (words: string | null) => void): TabSearch {
  return { label: '행사 검색', field: '행사 검색어', placeholder: EVENT_SEARCH_HINT, words, onWords };
}

// The 행사 tab, the `Events` frame: the published Global Events, one row each, and their 파티. A row opens the
// `EventsDetail` sheet.
export function EventsScreen({ focus, onFocused }: EventsScreenProps): ReactElement {
  const { data, isPending, refetch } = useEventSources();
  const [filter, setFilter] = useState<EventFilter>('all');
  // The words searched, or null while the title shows.
  const [search, setSearch] = useState<string | null>(null);
  const [opened, setOpened] = useState<EventView | null>(null);
  const showAll = useCallback(() => {
    setFilter('all');
    setSearch(null);
  }, []);
  const focusing = useFocus(focus, data !== undefined, onFocused, showAll);
  const quests = data?.quests ?? [];
  const sheets = useEventSheets();
  const starred = useStarred(data?.events);
  return (
    <TabScreen
      search={searchOf(search, (words) => {
        if (words === null) {
          showAll();
        } else {
          setSearch(words);
        }
      })}
      title="행사"
      toggle={{ icon: 'star', label: '별표한 행사만 보기', on: starred.on, onToggle: starred.turn }}
    >
      <View style={styles.ground}>
        <ChipRow chips={FILTERS} onSelect={setFilter} selected={filter} />
        {data === undefined && isPending ? <LoadingState /> : null}
        {data === undefined && !isPending ? <ErrorState onRetry={refetch} /> : null}
        {data === undefined ? null : (
          <List
            {...focusing}
            filter={filter}
            kept={starred.kept}
            onOpen={setOpened}
            onParty={sheets.setRecruitEvent}
            search={search ?? ''}
            sources={data}
          />
        )}
      </View>
      <Sheets onOpen={setOpened} opened={opened} quests={quests} sheets={sheets} />
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  // The frame draws the tab white under its app bar.
  ground: { flex: 1, backgroundColor: color.surface },
  list: { paddingHorizontal: space[4], paddingBottom: space[6] },
});
