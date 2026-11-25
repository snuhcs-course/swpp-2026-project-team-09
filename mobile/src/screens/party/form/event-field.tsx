/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-19  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by Jaehyun0320
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
  eventTone,
  font,
  FullScreenPanel,
  Icon,
  IconButton,
  LoadingState,
  radius,
  SearchField,
  SegmentedTabs,
  space,
} from '@/design-system';
import { EVENT_SEARCH_HINT, eventTime, type EventView, toEventViews } from '@/features/events/adapter';
import { useEventSources } from '@/features/events/use-events';
import { EVENT_KINDS, type EventKind, eventKindOf } from '@/features/party/event-kinds';
import type { FormEvent } from '@/features/party/making';
import { FieldHead } from './field-head';

// "오늘 18:00–20:00 · 301동 대강당"
function lineOf(event: FormEvent): string {
  const time = eventTime(event, now());
  return event.place === null ? time : `${time} · ${event.place}`;
}

// "진로 · 컴퓨터공학부 공지"
function sourceLine(event: FormEvent): string {
  const kind = EVENT_KINDS.find(({ key }) => key === eventKindOf(event))?.label ?? '';
  return event.source === null ? kind : `${kind} · ${event.source}`;
}

function eventOf(events: readonly GlobalEvent[], id: string): GlobalEvent | undefined {
  return events.find((event) => event.id === id);
}

interface PickerProps {
  // The event chosen before, whose tab opens first.
  chosen: FormEvent | null;
  onPick: (event: FormEvent) => void;
  onBack: () => void;
}

interface EventsProps {
  kind: EventKind;
  search: string;
  chosen: FormEvent | null;
  onPick: (event: FormEvent) => void;
}

// The tab's events, or with a search the events of every tab that match it.
function Events({ kind, search, chosen, onPick }: EventsProps): ReactElement {
  const sources = useEventSources();
  if (sources.data === undefined) {
    return sources.isError ? <ErrorState onRetry={sources.refetch} /> : <LoadingState />;
  }
  const { events } = sources.data;
  const searching = search.trim() !== '';
  const views = toEventViews(sources.data, 'all', search).filter((view) => {
    const event = eventOf(events, view.id);
    return event !== undefined && (searching || eventKindOf(event) === kind);
  });
  if (events.length === 0) {
    return <EmptyState words="예정된 행사가 없어요" />;
  }
  if (views.length === 0) {
    return <EmptyState words={searching ? '검색 결과가 없어요' : '이 분류의 행사가 없어요'} />;
  }
  return (
    <View>
      {views.map((view) => {
        const event = eventOf(events, view.id);
        return event === undefined ? null : (
          <PickerRow
            chosen={chosen?.id === view.id}
            key={view.id}
            onPick={() => {
              onPick({ ...event, source: view.source });
            }}
            view={view}
          />
        );
      })}
    </View>
  );
}

// An event's row, shaped as the 행사 tab's: the date column, a rule, the source, the title on one line, and "time ·
// place". The chosen one is light blue with a navy check.
function PickerRow({ view, chosen, onPick }: { view: EventView; chosen: boolean; onPick: () => void }): ReactElement {
  const line = view.place === null ? view.hours : `${view.hours} · ${view.place}`;
  return (
    <Pressable
      accessibilityLabel={`행사 · ${view.title}`}
      accessibilityRole="button"
      accessibilityState={{ selected: chosen }}
      onPress={onPick}
      style={[styles.row, chosen && styles.rowChosen]}
    >
      <View style={[styles.date, { marginTop: view.source === null ? DAY_DROP - SOURCE_STEP : DAY_DROP }]}>
        <Text style={styles.day}>{view.date.day}</Text>
        <Text numberOfLines={1} style={styles.dayLine}>
          {view.date.line}
        </Text>
      </View>
      <View style={styles.rule} />
      <View style={styles.rowWords}>
        {view.source === null ? null : <Text style={styles.rowSource}>{view.source}</Text>}
        <Text numberOfLines={1} style={styles.rowTitle}>
          {view.title}
        </Text>
        <Text numberOfLines={1} style={styles.rowLine}>
          {line}
        </Text>
      </View>
      {chosen ? (
        <View style={styles.check}>
          <Icon color={color.onPrimary} name="check" size={14} />
        </View>
      ) : null}
    </Pressable>
  );
}

// 관련 행사 고르기, the event picker of 파티 만들기: the tabs 진로, 이벤트 and 축제, the search over all of them, and
// rows shaped as the 행사 tab's.
export function EventPicker({ chosen, onPick, onBack }: PickerProps): ReactElement {
  const [kind, setKind] = useState<EventKind>(chosen === null ? 'career' : eventKindOf(chosen));
  const [search, setSearch] = useState('');
  return (
    <FullScreenPanel leave={{ kind: 'back', onPress: onBack }} title="관련 행사 고르기">
      <SegmentedTabs onSelect={setKind} segments={EVENT_KINDS} selected={kind} />
      <View style={styles.picker}>
        <SearchField label="행사 검색" onChangeText={setSearch} placeholder={EVENT_SEARCH_HINT} value={search} />
        <Events chosen={chosen} kind={kind} onPick={onPick} search={search} />
      </View>
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
            <Text style={styles.source}>{sourceLine(event)}</Text>
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

// The frame's measures for the picker's rows: their padding, the date column and its day, the check's round.
const ROW_PADDING = 22;
const DATE_WIDTH = 72;
const DAY = { fontSize: 24, lineHeight: 30, letterSpacing: -0.48 };
// The day sits level with the title: lowered under a source's line, raised by that line and its gap without one.
const DAY_DROP = 18;
const SOURCE_STEP = eventText.source.lineHeight + space[1];
const CHECK = 24;

const styles = StyleSheet.create({
  picker: { gap: space[2], padding: space[4] },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: ROW_PADDING,
    paddingHorizontal: space[3],
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  rowChosen: { backgroundColor: color.blue50 },
  date: { width: DATE_WIDTH },
  day: { ...eventText.day, ...DAY, color: color.ink },
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
  rowSource: { ...eventText.source, color: color.inkMuted },
  rowTitle: { ...eventText.title, color: color.ink },
  rowLine: { ...eventText.line, color: eventTone.words },
  check: {
    position: 'absolute',
    top: ROW_PADDING + 2,
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
  source: { fontFamily: font.medium, fontSize: 12, lineHeight: 16, color: color.inkMuted },
  title: { fontFamily: font.semiBold, fontSize: 16, lineHeight: 22, color: color.ink },
  line: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: color.inkMuted },
});
