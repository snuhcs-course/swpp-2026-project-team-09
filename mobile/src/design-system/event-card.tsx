import type { ReactElement, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Badge } from './badge';
import { cardStyles } from './card';
import { Chip } from './chip';
import { Icon, type IconName } from './icon';
import { color, space, text } from './tokens';

export type EventKind = 'official' | 'private' | 'party' | 'quest';

const KIND_LABEL: Record<EventKind, string> = {
  official: '공식 행사',
  private: '내 일정',
  party: '파티',
  quest: '퀘스트',
};

interface EventCardProps {
  title: string;
  // Drives the badge.
  kind?: EventKind;
  // Written as "10월 2일 (목) 18:00–20:00".
  time?: string;
  // A building number and a room, such as "301동 118호".
  venue?: string;
  eligibility?: string;
  // Where an official event came from. Always shown for one.
  source?: string;
  // Hashtags, each with its `#`.
  tags?: readonly string[];
  // Up to two Buttons, the primary one last.
  actions?: ReactNode;
  // Over the map: no outline, and a shadow.
  floating?: boolean;
}

function MetaLine({ icon, label, children }: { icon: IconName; label: string; children: string }): ReactElement {
  return (
    <View style={styles.metaLine}>
      <Icon color={color.inkMuted} label={label} name={icon} size={16} />
      <Text style={styles.metaText}>{children}</Text>
    </View>
  );
}

// The summary of an event, in the map's sheet, in a list and in a chat result.
export function EventCard({
  title,
  kind = 'official',
  time,
  venue,
  eligibility,
  source,
  tags = [],
  actions,
  floating = false,
}: EventCardProps): ReactElement {
  return (
    <View style={[cardStyles.card, floating && cardStyles.floating, styles.event]}>
      <View style={styles.top}>
        <Badge tone={kind}>{KIND_LABEL[kind]}</Badge>
        {source === undefined ? null : <Text style={styles.source}>{source}</Text>}
      </View>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <View style={styles.meta}>
        {time === undefined ? null : (
          <MetaLine icon="clock" label="시간">
            {time}
          </MetaLine>
        )}
        {venue === undefined ? null : (
          <MetaLine icon="pin" label="장소">
            {venue}
          </MetaLine>
        )}
        {eligibility === undefined ? null : (
          <MetaLine icon="info" label="대상">
            {eligibility}
          </MetaLine>
        )}
      </View>
      {tags.length === 0 ? null : (
        <View style={styles.tags}>
          {tags.map((tag) => (
            <Chip key={tag}>{tag}</Chip>
          ))}
        </View>
      )}
      {actions === undefined ? null : <View style={styles.actions}>{actions}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  event: { gap: space[2] },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[2],
  },
  source: { ...text.caption, color: color.inkMuted },
  title: { ...text.title, color: color.ink },
  meta: { gap: space[1] },
  metaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
  metaText: { ...text.body, flexShrink: 1, color: color.inkMuted },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[2],
  },
  actions: {
    flexDirection: 'row',
    gap: space[2],
    marginTop: space[2],
  },
});
