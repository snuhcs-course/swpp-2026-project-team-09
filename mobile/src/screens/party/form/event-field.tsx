/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-19  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { type ReactElement, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { GlobalEvent } from '@/api/types';
import { now } from '@/clock';
import {
  color,
  EmptyState,
  ErrorState,
  eventText,
  font,
  FullScreenPanel,
  Icon,
  IconButton,
  LoadingState,
  radius,
  SearchField,
  space,
} from '@/design-system';
import { EVENT_SEARCH_HINT, eventTime, type EventView, toEventViews } from '@/features/events/adapter';
import { useEventSources } from '@/features/events/use-events';
import type { FormEvent } from '@/features/party/making';
import { EventDetailSheet } from '../../events/event-detail-sheet';
import { EventFact, PLACE_LINES, TITLE_LINES } from '../../events/event-row';
import { FieldHead } from './field-head';

// "오늘 18:00–20:00 · 301동 대강당"
function lineOf(event: FormEvent): string {
  const time = eventTime(event, now());
  return event.place === null ? time : `${time} · ${event.place}`;
}

function eventOf(events: readonly GlobalEvent[], id: string): GlobalEvent | undefined {
  return events.find((event) => event.id === id);
}

// The event whose sheet is open: as the sheet shows it, and as the form takes it.
interface Opened {
  view: EventView;
  event: FormEvent;
}

interface EventsProps {
  search: string;
  chosen: FormEvent | null;
  onOpen: (opened: Opened) => void;
}

// Every event, as the 행사 tab orders them by their start, or with a search those that match it.
function Events({ search, chosen, onOpen }: EventsProps): ReactElement {
  const sources = useEventSources();
  if (sources.data === undefined) {
    return sources.isError ? <ErrorState onRetry={sources.refetch} /> : <LoadingState />;
  }
  const { events } = sources.data;
  const views = toEventViews(sources.data, 'all', search);
  if (events.length === 0) {
    return <EmptyState words="예정된 행사가 없어요" />;
  }
  if (views.length === 0) {
    return <EmptyState words="검색 결과가 없어요" />;
  }
  return (
    <View>
      {views.map((view) => {
        const event = eventOf(events, view.id);
        return event === undefined ? null : (
          <PickerRow
            chosen={chosen?.id === view.id}
            key={view.id}
            onOpen={() => {
              onOpen({ view, event: { ...event, source: view.source } });
            }}
            view={view}
          />
        );
      })}
    </View>
  );
}

// An event's row, as the 행사 tab's (P06 ticket 15): the date column, a rule, the title on up to two lines, and the time
// and the place on lines of their own. The chosen one is light blue with a navy check.
function PickerRow({ view, chosen, onOpen }: { view: EventView; chosen: boolean; onOpen: () => void }): ReactElement {
  return (
    <Pressable
      accessibilityLabel={`행사 · ${view.title}`}
      accessibilityRole="button"
      accessibilityState={{ selected: chosen }}
      onPress={onOpen}
      style={[styles.row, chosen && styles.rowChosen]}
    >
      <View style={styles.date}>
        <Text style={styles.day}>{view.date.day}</Text>
        <Text numberOfLines={1} style={styles.dayLine}>
          {view.date.line}
        </Text>
      </View>
      <View style={styles.rule} />
      <View style={styles.rowWords}>
        <Text lineBreakStrategyIOS="hangul-word" numberOfLines={TITLE_LINES} style={styles.rowTitle}>
          {view.title}
        </Text>
        <EventFact icon="clock" lines={1} words={view.hours} />
        {view.place === null ? null : <EventFact icon="pin" lines={PLACE_LINES} words={view.place} />}
      </View>
      {chosen ? (
        <View style={styles.check}>
          <Icon color={color.onPrimary} name="check" size={14} />
        </View>
      ) : null}
    </Pressable>
  );
}

interface PickerProps {
  // The event chosen before: its row is marked, and its sheet says "선택됨".
  chosen: FormEvent | null;
  onPick: (event: FormEvent) => void;
  onBack: () => void;
}

// 관련 행사 고르기, the event picker of 파티 만들기: the search and every event in one list. A row opens the 행사 tab's
// sheet over it, whose "이 행사 추가" picks the event.
export function EventPicker({ chosen, onPick, onBack }: PickerProps): ReactElement {
  const [search, setSearch] = useState('');
  const [opened, setOpened] = useState<Opened | null>(null);
  return (
    <FullScreenPanel leave={{ kind: 'back', onPress: onBack }} title="관련 행사 고르기">
      <View style={styles.picker}>
        <SearchField label="행사 검색" onChangeText={setSearch} placeholder={EVENT_SEARCH_HINT} value={search} />
        <Events chosen={chosen} onOpen={setOpened} search={search} />
      </View>
      <EventDetailSheet
        action={{
          kind: 'add',
          chosen: opened !== null && opened.event.id === chosen?.id,
          onPress: () => {
            if (opened !== null) {
              onPick(opened.event);
            }
          },
        }}
        event={opened?.view ?? null}
        onClose={() => {
          setOpened(null);
        }}
      />
    </FullScreenPanel>
  );
}

interface FieldProps {
  event: FormEvent | null;
  // The edited Quest's own event, which stays.
  locked: boolean;
  onChoose: () => void;
  onClear: () => void;
}

// `관련 행사`: `행사 선택`, or the chosen event in a navy box, which opens the picker again, with ✕ `행사 빼기`. An
// edited Quest's own event is shown alone: the main server cannot change it.
export function EventField({ event, locked, onChoose, onClear }: FieldProps): ReactElement {
  return (
    <View style={styles.field}>
      <FieldHead icon="ticket" label="관련 행사" />
      {event === null ? (
        <Pressable
          accessibilityLabel="관련 행사 선택"
          accessibilityRole="button"
          onPress={onChoose}
          style={styles.choose}
        >
          <Text style={styles.chooseWords}>행사 선택</Text>
          <Icon color={color.inkMuted} name="chevronRight" size={18} />
        </Pressable>
      ) : (
        <View style={[styles.chosen, locked && styles.locked]} testID="chosen-event">
          <Pressable
            accessibilityLabel={locked ? `관련 행사 ${event.title}` : `관련 행사 ${event.title}, 다른 행사 선택`}
            accessibilityRole={locked ? 'text' : 'button'}
            disabled={locked}
            onPress={onChoose}
            style={styles.chosenWords}
          >
            <Text style={styles.title}>{event.title}</Text>
            <Text style={styles.line}>{lineOf(event)}</Text>
          </Pressable>
          {locked ? (
            <View style={styles.lock}>
              <Icon color={color.inkMuted} label="바꿀 수 없어요" name="lock" size={18} />
            </View>
          ) : (
            <IconButton icon="x" label="행사 빼기" onPress={onClear} />
          )}
        </View>
      )}
    </View>
  );
}

// The picker's date column keeps its own width, wider than the 행사 tab's. The check sits level with the title's first
// line.
const DATE_WIDTH = 72;
const CHECK = 24;
const CHECK_DROP = (eventText.title.lineHeight - CHECK) / 2;

const styles = StyleSheet.create({
  picker: { gap: space[2], padding: space[4] },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: space[3],
    paddingHorizontal: space[3],
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  rowChosen: { backgroundColor: color.blue50 },
  date: { width: DATE_WIDTH },
  day: { ...eventText.day, color: color.ink },
  dayLine: { ...eventText.dayLine, color: color.inkMuted },
  rule: {
    alignSelf: 'stretch',
    width: 1,
    marginVertical: space[1],
    marginRight: space[4],
    backgroundColor: color.border,
  },
  // Clear of the check.
  rowWords: { flex: 1, minWidth: 0, gap: space[1], paddingRight: space[8] },
  rowTitle: { ...eventText.title, color: color.ink },
  check: {
    position: 'absolute',
    top: space[3] + CHECK_DROP,
    right: space[3],
    alignItems: 'center',
    justifyContent: 'center',
    width: CHECK,
    height: CHECK,
    borderRadius: radius.full,
    backgroundColor: color.snuBlue,
  },
  field: { gap: space[2] },
  choose: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 50,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.md,
    backgroundColor: color.surface,
  },
  chooseWords: { fontFamily: font.regular, fontSize: 16, lineHeight: 24, color: color.inkSubtle },
  chosen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingLeft: 14,
    paddingVertical: space[2],
    borderWidth: 2,
    borderColor: color.snuBlue,
    borderRadius: radius.md,
    backgroundColor: color.surface,
  },
  locked: { borderWidth: 1, borderColor: color.border, backgroundColor: color.surfaceSubtle },
  lock: { alignItems: 'center', justifyContent: 'center', width: 48, height: 48 },
  chosenWords: { flex: 1, gap: 2 },
  title: { fontFamily: font.semiBold, fontSize: 16, lineHeight: 22, color: color.ink },
  line: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: color.inkMuted },
});
