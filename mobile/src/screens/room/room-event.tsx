import { useQueries } from '@tanstack/react-query';
import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { Pressable } from 'react-native';
import { globalEventAnnouncersQuery, globalEventsQuery } from '@/api/queries';
import { now } from '@/clock';
import { EventCard } from '@/design-system';
import { eventTime } from '@/features/events/adapter';

// The Global Event a Quest is for, as the design system's card. A press opens the 행사 tab marked at it.
export function RoomEvent({ event }: { event: { id: string; title: string } }): ReactElement {
  const [events, announcers] = useQueries({ queries: [globalEventsQuery, globalEventAnnouncersQuery] });
  const known = events.data?.find(({ id }) => id === event.id);
  const source = announcers.data?.find(({ eventId }) => eventId === event.id)?.announcer;
  return (
    <Pressable
      accessibilityLabel={`행사 · ${event.title}`}
      accessibilityRole="button"
      onPress={() => {
        router.navigate({ pathname: '/events', params: { focus: event.id } });
      }}
    >
      <EventCard
        source={source}
        time={known === undefined ? undefined : eventTime(known, now())}
        title={known?.title ?? event.title}
        venue={known?.place ?? undefined}
      />
    </Pressable>
  );
}
