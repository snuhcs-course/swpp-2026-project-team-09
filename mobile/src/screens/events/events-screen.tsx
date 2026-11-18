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
 ******************************************************************************/

import { type ReactElement, useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { color, EmptyState, ErrorState, eventText, IconButton, LoadingState, space } from '@/design-system';
import { type EventFilter, type EventSources, type EventView, toEventViews } from '@/features/events/adapter';
import type { Quest } from '@/api/types';
import { useEventSources } from '@/features/events/use-events';
import { showFind } from '../party/use-party-actions';
import { TabScreen } from '../shell/tab-screen';
import { EventDetailSheet } from './event-detail-sheet';
import { EventRow } from './event-row';
import { Filters, SearchBar } from './events-bar';
import { EventSheets, type EventSheetsState, type PickedEvent, useEventSheets } from './event-sheets';
import { type Focus, useFocus } from './use-focus';

interface ListProps extends Omit<Focus, 'focused'> {
  sources: EventSources;
  filter: EventFilter;
  search: string;
  focused: string | null;
  onOpen: (event: EventView) => void;
  onParty: (event: PickedEvent) => void;
}

function List({ sources, filter, search, focused, scroll, onCardAt, onOpen, onParty }: ListProps): ReactElement {
  const views = toEventViews(sources, filter, search);
  // Without any event, the tab says what it is for, and leads to the 파티 one can join meanwhile (HE H7).
  if (sources.events.length === 0) {
    return (
      <EmptyState action={{ label: '파티 찾기', onPress: showFind }} words="여기서는 학교 행사를 모아 볼 수 있어요" />
    );
  }
  if (views.length === 0) {
    return <EmptyState words={search.trim() === '' ? '해당하는 행사가 없어요' : '검색 결과가 없어요'} />;
  }
  return (
    <ScrollView contentContainerStyle={styles.list} ref={scroll}>
      <Text accessibilityRole="header" style={styles.heading}>
        다가오는 행사
      </Text>
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
        onParty={(event) => {
          onOpen(null);
          sheets.setRecruitEvent(event);
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

// The 행사 tab, the `Events` frame: the published Global Events, one row each, and their 파티. A row opens the
// `EventsDetail` sheet.
export function EventsScreen({ focus, onFocused }: EventsScreenProps): ReactElement {
  const { data, isPending, refetch } = useEventSources();
  const [filter, setFilter] = useState<EventFilter>('all');
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [opened, setOpened] = useState<EventView | null>(null);
  const showAll = useCallback(() => {
    setFilter('all');
    setSearch('');
    setSearching(false);
  }, []);
  const focusing = useFocus(focus, data !== undefined, onFocused, showAll);
  const quests = data?.quests ?? [];
  const sheets = useEventSheets();
  return (
    <TabScreen
      actions={
        <IconButton
          icon="search"
          label="행사 검색"
          onPress={() => {
            setSearching(true);
          }}
        />
      }
      bar={searching ? <SearchBar onClose={showAll} onSearch={setSearch} search={search} /> : undefined}
      title="행사"
    >
      <View style={styles.ground}>
        <Filters filter={filter} onFilter={setFilter} />
        {data === undefined && isPending ? <LoadingState /> : null}
        {data === undefined && !isPending ? <ErrorState onRetry={refetch} /> : null}
        {data === undefined ? null : (
          <List
            {...focusing}
            filter={filter}
            onOpen={setOpened}
            onParty={sheets.setRecruitEvent}
            search={search}
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
  heading: { ...eventText.heading, marginTop: 6, color: color.inkMuted },
});
