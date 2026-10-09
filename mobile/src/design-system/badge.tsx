// AI-generated with Claude Opus 5.5, 2026-10-05, prompted by AhnJinYoung, reviewed by Jaehyun0320 in #50
import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icon, type IconName } from './icon';
import { color, font, halo, radius, space, text } from './tokens';

export type BadgeTone =
  'official' | 'private' | 'party' | 'friend' | 'quest' | 'live' | 'warning' | 'danger' | 'neutral';

interface BadgeProps {
  children: string;
  tone?: BadgeTone;
  // Another icon than the tone's own, or `false` for none.
  icon?: IconName | false;
}

const TONES: Record<BadgeTone, { background: string; ink: string; icon?: IconName }> = {
  official: { background: color.officialSoft, ink: color.snuBlue, icon: 'calendar' },
  private: { background: color.privateSoft, ink: color.private, icon: 'lock' },
  party: { background: color.partySoft, ink: color.party, icon: 'users' },
  friend: { background: color.friendSoft, ink: color.friend, icon: 'user' },
  quest: { background: color.questSoft, ink: color.quest, icon: 'flag' },
  live: { background: color.friendSoft, ink: color.live },
  warning: { background: color.warningSoft, ink: color.warning, icon: 'alert' },
  danger: { background: color.dangerSoft, ink: color.danger, icon: 'alert' },
  neutral: { background: color.surfaceSubtle, ink: color.inkMuted },
};

// A small label for a category or a state. A category's tone carries its icon, so that the category is never told by
// colour alone. `live` shows a dot and reads "공유 중" or "위치 공유 중".
export function Badge({ children, tone = 'neutral', icon }: BadgeProps): ReactElement {
  const { background, ink, icon: toneIcon } = TONES[tone];
  const shownIcon = icon === false ? undefined : (icon ?? toneIcon);
  return (
    <View style={[styles.badge, { backgroundColor: background }]}>
      {tone === 'live' ? <View style={styles.liveDot} /> : null}
      {tone !== 'live' && shownIcon !== undefined ? <Icon color={ink} name={shownIcon} size={12} /> : null}
      <Text numberOfLines={1} style={[styles.label, { color: ink }]}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: space[1],
    height: 22,
    paddingHorizontal: space[2],
    borderRadius: radius.sm,
  },
  label: { ...text.caption, fontFamily: font.semiBold },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: color.live,
    boxShadow: `0 0 0 3px ${halo.live}`,
  },
});
