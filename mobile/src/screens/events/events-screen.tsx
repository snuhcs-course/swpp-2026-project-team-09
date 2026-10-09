import { router } from 'expo-router';
import { type ReactElement, useCallback, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import type { Quest } from '@/api/types';
import { EmptyState, ErrorState, IconButton, LoadingState, space } from '@/design-system';
import { type EventFilter, type EventSources, type RecruitRowView, toEventViews } from '@/features/events/adapter';
import { useEventSources } from '@/features/events/use-events';
import { openPost } from '../party/post-card';
import { TabScreen } from '../shell/tab-screen';
import { EventItem } from './event-item';
import { Filters, MatchingButton, SearchBar } from './events-bar';
import { MatchingSheet } from './matching-sheet';
import { RecruitingSheet } from './recruiting-sheet';
import { useEventActions } from './use-event-actions';
import { type Focus, useFocus } from './use-focus';
import { useOpenPartyCreate } from './use-party-create';

interface Picked {
  id: string;
  title: string;
}

interface ListProps extends Omit<Focus, 'focused'> {
  sources: EventSources;
  filter: EventFilter;
  search: string;
  focused: string | null;
  onRecruit: (event: Picked) => void;
  onMatch: (event: Picked) => void;
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
          onMatching={() => {
            router.push('/matching');
          }}
          onRecruit={() => {
            onRecruit(event);
          }}
        />
      ))}
    </ScrollView>
  );
}

// The sheets the cards open: 파티 찾기/모집, whose rows open the recruiting posts, and AI 매칭.
interface Sheets {
  recruitEvent: Picked | null;
  matchEvent: Picked | null;
  setRecruitEvent: (event: Picked | null) => void;
  setMatchEvent: (event: Picked | null) => void;
  onRow: (row: RecruitRowView) => void;
  onRecruit: (eventId: string) => void;
}

function useSheets(): Sheets {
  const [recruitEvent, setRecruitEvent] = useState<Picked | null>(null);
  const [matchEvent, setMatchEvent] = useState<Picked | null>(null);
  const openPartyCreate = useOpenPartyCreate();
  return {
    recruitEvent,
    matchEvent,
    setRecruitEvent,
    setMatchEvent,
    // A Quest the User holds opens its room; another's opens its recruiting post, where the User joins or asks to.
    onRow: (row) => {
      setRecruitEvent(null);
      if (row.held) {
        router.push(`/room/${row.questId}`);
        return;
      }
      openPost(row.questId);
    },
    // A User who holds the event's 파티 with others is led to it; anyone else recruits.
    onRecruit: (eventId) => {
      setRecruitEvent(null);
      openPartyCreate(eventId);
    },
  };
}

function EventSheets({ sheets, quests }: { sheets: Sheets; quests: readonly Quest[] }): ReactElement {
  const actions = useEventActions();
  return (
    <>
      <RecruitingSheet
        event={sheets.recruitEvent}
        onClose={() => {
          sheets.setRecruitEvent(null);
        }}
        onRecruit={sheets.onRecruit}
        onRow={sheets.onRow}
        quests={quests}
      />
      <MatchingSheet
        event={sheets.matchEvent}
        onClose={() => {
          sheets.setMatchEvent(null);
        }}
        onSubmit={(globalEventId, groupSize) => {
          sheets.setMatchEvent(null);
          void actions.requestMatching(globalEventId, groupSize);
        }}
      />
    </>
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
  const sheets = useSheets();
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
