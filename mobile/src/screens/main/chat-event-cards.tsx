/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import type { GlobalEventCard } from '@/api/assistant-types';
import { space } from '@/design-system';
import { toEventViews } from '@/features/events/adapter';
import { useSourcesFor } from '@/features/events/use-events';
import { EventItem } from '../events/event-item';
import { openMatchingRequests, type PickedEvent } from '../events/event-sheets';
import { ChatTravelBox } from './chat-travel-box';

// What an event card of the chat does: a press opens the 행사 tab at the event, and its buttons open the tab's own
// sheets over the chat.
export interface EventCardActions {
  open: (globalEventId: string) => void;
  recruit: (event: PickedEvent) => void;
  match: (event: PickedEvent) => void;
}

interface ChatEventCardsProps {
  cards: readonly GlobalEventCard[];
  actions: EventCardActions;
}

function noPlace(): void {
  // The chat does not scroll to a card.
}

// The Global Events of an answer, as the 행사 tab's cards, with what the tab adds to them: its 파티 recruiting, the
// User's own, and a request for Matching that waits. A card also has its 이동 시간 box when it has one.
export function ChatEventCards({ cards, actions }: ChatEventCardsProps): ReactElement {
  const sources = useSourcesFor(cards.map(({ globalEvent }) => globalEvent));
  return (
    <View style={styles.cards}>
      {toEventViews(sources, 'all', '').map((event) => {
        const card = cards.find(({ globalEvent }) => globalEvent.id === event.id);
        return (
          <EventItem
            event={event}
            focused={false}
            key={event.id}
            onLayout={noPlace}
            onMatch={() => {
              actions.match(event);
            }}
            onMatching={openMatchingRequests}
            onPress={() => {
              actions.open(event.id);
            }}
            onRecruit={() => {
              actions.recruit(event);
            }}
          >
            {card === undefined ? null : <ChatTravelBox box={card} />}
          </EventItem>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  cards: { gap: space[2], marginTop: space[2] },
});
