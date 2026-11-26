/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { useQuery } from '@tanstack/react-query';
import { type ReactElement, useState } from 'react';
import { Pressable, View } from 'react-native';
import { globalEventAnnouncersQuery } from '@/api/queries';
import { EventCard } from '@/design-system';
import { useEventView } from '@/features/events/use-events';
import { EventDetailSheet } from '../events/event-detail-sheet';

// The Global Event a Quest is for, as the design system's card. A press shows the 행사 tab's detail sheet over the
// room, without its party button, as the User is in a 파티 for it. An event the 행사 tab's list does not hold, such as
// one that ended, keeps the title the Quest holds and takes no press.
export function RoomEvent({ event }: { event: { id: string; title: string } }): ReactElement {
  const view = useEventView(event.id);
  const { data: announcers } = useQuery(globalEventAnnouncersQuery);
  const [open, setOpen] = useState(false);
  const label = `행사 · ${event.title}`;
  const card = (
    <EventCard
      source={announcers?.find(({ eventId }) => eventId === event.id)?.announcer}
      time={view?.time}
      title={view?.title ?? event.title}
      venue={view?.place ?? undefined}
    />
  );
  return (
    <>
      {view === null ? (
        <View accessibilityLabel={label} accessible>
          {card}
        </View>
      ) : (
        <Pressable
          accessibilityLabel={label}
          accessibilityRole="button"
          onPress={() => {
            setOpen(true);
          }}
        >
          {card}
        </Pressable>
      )}
      <EventDetailSheet
        event={open ? view : null}
        onClose={() => {
          setOpen(false);
        }}
      />
    </>
  );
}
