/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { now } from '@/clock';
import {
  color,
  EmptyState,
  ErrorState,
  EventCard,
  font,
  FullScreenPanel,
  Icon,
  IconButton,
  LoadingState,
  radius,
  SearchField,
  space,
} from '@/design-system';
import { eventTime, toEventViews } from '@/features/events/adapter';
import { useEventSources } from '@/features/events/use-events';
import type { FormEvent } from '@/features/party/making';
import { FieldHead } from './field-head';

// "오늘 18:00–20:00 · 301동 대강당"
function lineOf(event: FormEvent): string {
  const time = eventTime(event, now());
  return event.place === null ? time : `${time} · ${event.place}`;
}

interface PickerProps {
  onPick: (event: FormEvent) => void;
  onBack: () => void;
}

function Events({ search, onPick }: { search: string; onPick: (event: FormEvent) => void }): ReactElement {
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
    <View style={styles.list}>
      {views.map((view) => {
        const event = events.find(({ id }) => id === view.id);
        return event === undefined ? null : (
          <Pressable
            accessibilityLabel={`행사 · ${view.title}`}
            accessibilityRole="button"
            key={view.id}
            onPress={() => {
              onPick({ ...event, source: view.source });
            }}
          >
            <EventCard
              source={view.source ?? undefined}
              time={view.time}
              title={view.title}
              venue={view.place ?? undefined}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

// The event picker of 파티 만들기: the 행사 list's cards without their buttons, and its search.
export function EventPicker({ onPick, onBack }: PickerProps): ReactElement {
  const [search, setSearch] = useState('');
  return (
    <FullScreenPanel leave={{ kind: 'back', onPress: onBack }} title="행사">
      <View style={styles.picker}>
        <SearchField label="행사 검색어" onChangeText={setSearch} placeholder="행사 검색" value={search} />
        <Events onPick={onPick} search={search} />
      </View>
    </FullScreenPanel>
  );
}

interface FieldProps {
  event: FormEvent | null;
  onChoose: () => void;
  onClear: () => void;
}

// `관련 행사`: `행사 선택`, or the chosen event in a navy box with ✕ `행사 빼기`.
export function EventField({ event, onChoose, onClear }: FieldProps): ReactElement {
  return (
    <View style={styles.field}>
      <FieldHead label="관련 행사" />
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
        <View style={styles.chosen} testID="chosen-event">
          <View style={styles.chosenWords}>
            {event.source === null ? null : <Text style={styles.source}>{event.source}</Text>}
            <Text style={styles.title}>{event.title}</Text>
            <Text style={styles.line}>{lineOf(event)}</Text>
          </View>
          <IconButton icon="x" label="행사 빼기" onPress={onClear} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  picker: { gap: space[4], padding: space[4] },
  list: { gap: space[3] },
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
  chosenWords: { flex: 1, gap: 2 },
  source: { fontFamily: font.medium, fontSize: 12, lineHeight: 16, color: color.inkMuted },
  title: { fontFamily: font.semiBold, fontSize: 16, lineHeight: 22, color: color.ink },
  line: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: color.inkMuted },
});
