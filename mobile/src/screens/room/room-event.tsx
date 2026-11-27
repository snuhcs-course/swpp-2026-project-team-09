/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { type ReactElement, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { color, Icon, space } from '@/design-system';
import { useEventView } from '@/features/events/use-events';
import { EventDetailSheet } from '../events/event-detail-sheet';
import { InfoLine } from '../party/post-content';

// The Global Event a Quest is for, as the last line of the head's time and place box: its title in blue with a ›. A
// press shows the 행사 tab's detail sheet over the room, without its party button, as the User is in a 파티 for it. An
// event the 행사 tab's list does not hold, such as one that ended, keeps the title the Quest holds, without the › and
// without a press.
export function RoomEvent({ event }: { event: { id: string; title: string } }): ReactElement {
  const view = useEventView(event.id);
  const [open, setOpen] = useState(false);
  const title = view?.title ?? event.title;
  const label = `행사 · ${title}`;
  const line = (
    <InfoLine event icon="calendar">
      {title}
    </InfoLine>
  );
  return (
    <>
      {view === null ? (
        <View accessibilityLabel={label} accessible>
          {line}
        </View>
      ) : (
        <Pressable
          accessibilityLabel={label}
          accessibilityRole="button"
          hitSlop={{ top: space[2], bottom: space[2] }}
          onPress={() => {
            setOpen(true);
          }}
          style={styles.row}
        >
          <View style={styles.grow}>{line}</View>
          <Icon color={color.blue600} name="chevronRight" size={16} testID="event-chevron" />
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

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  grow: { flex: 1 },
});
