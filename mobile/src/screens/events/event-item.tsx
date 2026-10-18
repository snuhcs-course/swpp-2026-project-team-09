/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { ReactElement, ReactNode } from 'react';
import { type LayoutChangeEvent, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Badge, Button, cardStyles, color, Icon, type IconName, radius, space, text } from '@/design-system';
import type { EventView } from '@/features/events/adapter';

interface EventItemProps {
  event: EventView;
  // Opened from elsewhere at this event: a navy border and a glow.
  focused: boolean;
  onLayout: (y: number) => void;
  onRecruit: () => void;
  onMatch: () => void;
  onMatching: () => void;
  // Where the card is drawn outside the 행사 tab, as in the chat: a press on it opens the tab at this event.
  onPress?: () => void;
}

function Line({ icon, label, words }: { icon: IconName; label: string; words: string }): ReactElement {
  return (
    <View style={styles.line}>
      <Icon color={color.inkMuted} label={label} name={icon} size={16} />
      <Text style={styles.lineWords}>{words}</Text>
    </View>
  );
}

// `✦ AI 매칭`, or `매칭 중` with the look of a control that is done, which opens the User's requests.
function MatchButton({ waiting, onPress }: { waiting: boolean; onPress: () => void }): ReactElement {
  const ink = waiting ? color.inkMuted : color.snuBlue;
  return (
    <Pressable
      accessibilityLabel={waiting ? '매칭 중' : 'AI 매칭'}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.match, waiting && styles.matchWaiting, pressed && styles.matchPressed]}
    >
      <Icon color={ink} name="sparkle" size={16} />
      <Text style={[styles.matchWords, { color: ink }]}>{waiting ? '매칭 중' : 'AI 매칭'}</Text>
    </Pressable>
  );
}

interface CardProps {
  id: string;
  focused: boolean;
  onLayout: (y: number) => void;
  onPress: (() => void) | undefined;
  children: ReactNode;
}

// The card, which a press opens where it is drawn outside the tab. Its buttons stay buttons of their own: the card is
// not one control for a screen reader, and its title is the link that opens it.
function Card({ id, focused, onLayout, onPress, children }: CardProps): ReactElement {
  const shared = {
    onLayout: ({ nativeEvent }: LayoutChangeEvent): void => {
      onLayout(nativeEvent.layout.y);
    },
    style: [cardStyles.card, styles.card, focused && styles.focused],
    testID: `event-${id}`,
  };
  return onPress === undefined ? (
    <View {...shared}>{children}</View>
  ) : (
    <Pressable {...shared} accessible={false} onPress={onPress}>
      {children}
    </Pressable>
  );
}

// An event's card on the 행사 tab, the `Events` frame's.
export function EventItem(props: EventItemProps): ReactElement {
  const { event, focused, onLayout, onRecruit, onMatch, onMatching, onPress } = props;
  const { sourceUrl } = event;
  return (
    <Card focused={focused} id={event.id} onLayout={onLayout} onPress={onPress}>
      <View style={styles.top}>
        <View style={styles.badges}>
          {event.recruiting === 0 ? null : <Badge tone="party">{`같이 갈 파티 ${event.recruiting}개`}</Badge>}
          {event.mine ? (
            <Badge icon={false} tone="friend">
              내 파티
            </Badge>
          ) : null}
        </View>
        {event.source === null ? null : <Text style={styles.source}>{event.source}</Text>}
      </View>
      <Text accessibilityRole={onPress === undefined ? 'header' : 'link'} onPress={onPress} style={styles.title}>
        {event.title}
      </Text>
      <View style={styles.lines}>
        <Line icon="clock" label="시간" words={event.time} />
        {event.place === null ? null : <Line icon="pin" label="장소" words={event.place} />}
      </View>
      <View style={styles.actions}>
        {sourceUrl === null ? null : (
          <Button
            onPress={() => {
              void Linking.openURL(sourceUrl);
            }}
            variant="secondary"
          >
            자세히
          </Button>
        )}
        <View style={styles.grow}>
          <Button full icon="users" onPress={onRecruit}>
            파티 찾기/모집
          </Button>
        </View>
        <MatchButton onPress={event.matching ? onMatching : onMatch} waiting={event.matching} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10 },
  focused: {
    borderWidth: 2,
    borderColor: color.snuBlue,
    boxShadow: '0 0 0 4px rgba(0, 26, 114, 0.12)',
  },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[2] },
  badges: { flexDirection: 'row', flexWrap: 'wrap', flexShrink: 1, gap: 6 },
  source: { ...text.caption, color: color.inkMuted },
  title: { ...text.title, color: color.ink },
  lines: { gap: space[1] },
  line: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  lineWords: { ...text.body, flexShrink: 1, color: color.inkMuted },
  actions: { flexDirection: 'row', alignItems: 'center', gap: space[2], marginTop: space[1] },
  grow: { flex: 1 },
  match: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    height: 40,
    paddingHorizontal: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surface,
  },
  matchWaiting: { borderColor: 'transparent', backgroundColor: color.surfaceSunken },
  matchPressed: { backgroundColor: color.blue50 },
  matchWords: { ...text.label },
});
