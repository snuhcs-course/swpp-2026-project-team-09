/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-08  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { type ReactElement, useCallback, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { EmptyState, ErrorState, IconButton, LoadingState, space } from '@/design-system';
import { type EventFilter, type EventSources, toEventViews } from '@/features/events/adapter';
import { useEventSources } from '@/features/events/use-events';
import { TabScreen } from '../shell/tab-screen';
import { EventItem } from './event-item';
import { Filters, MatchingButton, SearchBar } from './events-bar';
import { EventSheets, openMatchingRequests, type PickedEvent, useEventSheets } from './event-sheets';
import { type Focus, useFocus } from './use-focus';

interface ListProps extends Omit<Focus, 'focused'> {
  sources: EventSources;
  filter: EventFilter;
  search: string;
  focused: string | null;
  onRecruit: (event: PickedEvent) => void;
  onMatch: (event: PickedEvent) => void;
}

function List({ sources, filter, search, focused, scroll, onCardAt, onRecruit, onMatch }: ListProps): ReactElement {
  const views = toEventViews(sources, filter, search);
  if (sources.events.length === 0) {
    return <EmptyState words="예정된 행사가 없어요" />;
  }
  if (views.length === 0) {
    return <EmptyState words="검색 결과가 없어요" />;
  }
  return (
    <ScrollView contentContainerStyle={styles.list} ref={scroll}>
      {views.map((event) => (
        <EventItem
          event={event}
          focused={event.id === focused}
          key={event.id}
          onLayout={(y) => {
            onCardAt(event.id, y);
          }}
          onMatch={() => {
            onMatch(event);
          }}
          onMatching={openMatchingRequests}
          onRecruit={() => {
            onRecruit(event);
          }}
        />
      ))}
    </ScrollView>
  );
}

interface EventsScreenProps {
  // An event to show marked, from its address: `/events?focus=<id>`.
  focus?: string;
  onFocused: () => void;
}

// The 행사 tab, the `Events` frame: the published Global Events, their 파티 and AI 매칭.
export function EventsScreen({ focus, onFocused }: EventsScreenProps): ReactElement {
  const { data, isPending, refetch } = useEventSources();
  const [filter, setFilter] = useState<EventFilter>('all');
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
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
        <>
          <MatchingButton count={data?.matching.length ?? 0} />
          <IconButton
            icon="search"
            label="행사 검색"
            onPress={() => {
              setSearching(true);
            }}
          />
        </>
      }
      bar={searching ? <SearchBar onClose={showAll} onSearch={setSearch} search={search} /> : undefined}
      title="행사"
    >
      <Filters filter={filter} onFilter={setFilter} />
      {data === undefined && isPending ? <LoadingState /> : null}
      {data === undefined && !isPending ? <ErrorState onRetry={refetch} /> : null}
      {data === undefined ? null : (
        <List
          {...focusing}
          filter={filter}
          onMatch={sheets.setMatchEvent}
          onRecruit={sheets.setRecruitEvent}
          search={search}
          sources={data}
        />
      )}
      <EventSheets quests={quests} sheets={sheets} />
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  list: { gap: space[3], paddingHorizontal: space[4], paddingBottom: space[6] },
});
