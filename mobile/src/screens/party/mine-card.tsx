/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-09  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-22  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar, Badge, color, font, Icon, radius, shadow, space } from '@/design-system';
import type { MineCardView } from '@/features/party/mine';

const TINT = {
  private: { ground: '#ECEEF3', edge: '#D8DCE5', soft: color.surface, ink: '#4A5166' },
  public: { ground: '#EFF6FE', edge: '#C3DBF5', soft: '#DCEBFB', ink: '#1D5FAE' },
} as const;

interface MineCardProps {
  card: MineCardView;
  onEnter: (card: MineCardView) => void;
  onDecline: (partyId: string) => void;
}

// A Party running without the User: navy with `거절` and `참여` while it waits for an answer, light with `참여` alone
// once declined.
function Strip({ card, onEnter, onDecline }: MineCardProps): ReactElement | null {
  const { strip } = card;
  if (strip === null) {
    return null;
  }
  return (
    <View style={[styles.strip, strip.declined && styles.stripDeclined]}>
      <Text numberOfLines={1} style={[styles.stripWords, strip.declined && styles.stripWordsDeclined]}>
        {strip.words}
      </Text>
      {strip.declined ? null : (
        <Pressable
          accessibilityLabel={`${card.title} 활성화 거절`}
          accessibilityRole="button"
          onPress={() => {
            onDecline(strip.partyId);
          }}
          style={styles.stripDecline}
        >
          <Text style={styles.stripDeclineWords}>거절</Text>
        </Pressable>
      )}
      <Pressable
        accessibilityLabel={`${card.title} 활성화 참여`}
        accessibilityRole="button"
        onPress={() => {
          onEnter(card);
        }}
        style={[styles.stripButton, strip.declined && styles.stripButtonDeclined]}
      >
        <Text style={[styles.stripButtonWords, strip.declined && styles.stripButtonWordsDeclined]}>참여</Text>
      </Pressable>
    </View>
  );
}

// `공개 파티` or `비공개 파티`, after its icon.
function Kind({ card, tint }: { card: MineCardView; tint: (typeof TINT)[keyof typeof TINT] }): ReactElement {
  return (
    <View style={[styles.kind, { backgroundColor: tint.soft }]}>
      <Icon color={tint.ink} name={card.private ? 'lock' : 'users'} size={12} />
      <Text style={[styles.kindWords, { color: tint.ink }]}>{card.private ? '비공개 파티' : '공개 파티'}</Text>
    </View>
  );
}

// The Holders' faces, the User first, and their names.
function People({ card, ground }: { card: MineCardView; ground: string }): ReactElement {
  return (
    <View style={styles.people}>
      <View style={styles.faces}>
        {card.faces.slice(0, 4).map((name, index) => (
          <View key={`${name}-${String(index)}`} style={[styles.face, { boxShadow: `0 0 0 2px ${ground}` }]}>
            <Avatar name={name} size="sm" />
          </View>
        ))}
      </View>
      <Text style={styles.peopleWords}>{card.people}</Text>
    </View>
  );
}

// The requests to join waiting for the Leader's answer: a red circle at the card's top right, none at 0.
function Waiting({ count }: { count: number }): ReactElement | null {
  if (count <= 0) {
    return null;
  }
  return (
    <View accessibilityLabel={`기다리는 참여 신청 ${String(count)}건`} accessible style={styles.waiting}>
      <Text style={styles.waitingWords}>{count}</Text>
    </View>
  );
}

// A card of 내 파티: tinted by its kind, outlined in navy while the User is in its Party. A past Quest's card opens
// nothing: its room is gone.
export function MineCard({ card, onEnter, onDecline }: MineCardProps): ReactElement {
  const tint = TINT[card.private ? 'private' : 'public'];
  return (
    <Pressable
      accessibilityLabel={card.title}
      accessibilityRole={card.past ? undefined : 'button'}
      disabled={card.past}
      onPress={() => {
        router.push(`/room/${card.questId}`);
      }}
      style={[styles.card, { backgroundColor: tint.ground, borderColor: tint.edge }, card.live && styles.live]}
    >
      <View style={styles.badges}>
        <Kind card={card} tint={tint} />
        <Badge icon={false} tone={card.badge.live ? 'live' : 'neutral'}>
          {card.badge.label}
        </Badge>
        {card.event === null ? null : <Badge tone="official">{card.event}</Badge>}
      </View>
      <Text style={styles.title}>{card.title}</Text>
      {card.next === null ? null : (
        <View style={[styles.next, { backgroundColor: tint.soft }]}>
          <View style={[styles.nextRound, { backgroundColor: tint.ink }]}>
            <Icon color={color.onPrimary} name="route" size={18} />
          </View>
          <View style={styles.nextWords}>
            <Text style={[styles.nextWhen, { color: tint.ink }]}>{card.next.when}</Text>
            <Text numberOfLines={1} style={styles.nextWhat}>
              {card.next.what}
            </Text>
          </View>
        </View>
      )}
      <People card={card} ground={tint.ground} />
      <Strip card={card} onDecline={onDecline} onEnter={onEnter} />
      <Waiting count={card.waiting} />
    </Pressable>
  );
}

const FACE_OVERLAP = -8;
const ROUND = 40;
const WAITING = 22;

const styles = StyleSheet.create({
  card: { gap: 10, padding: space[4], borderWidth: 1, borderRadius: radius.lg },
  live: {
    borderWidth: 2,
    borderColor: color.snuBlue,
    backgroundColor: color.surface,
    boxShadow: `0 0 0 4px ${color.blue100}, ${shadow.float}`,
  },
  badges: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  kind: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 22,
    paddingHorizontal: space[2],
    borderRadius: radius.full,
  },
  kindWords: { fontFamily: font.bold, fontSize: 11, lineHeight: 22 },
  title: { fontFamily: font.semiBold, fontSize: 18, lineHeight: 26, letterSpacing: -0.18, color: color.ink },
  next: { flexDirection: 'row', alignItems: 'center', gap: space[3], padding: space[3], borderRadius: radius.md },
  nextRound: { alignItems: 'center', justifyContent: 'center', width: ROUND, height: ROUND, borderRadius: radius.full },
  nextWords: { flex: 1, gap: 2 },
  nextWhen: { fontFamily: font.bold, fontSize: 12, lineHeight: 16 },
  nextWhat: { fontFamily: font.semiBold, fontSize: 14, lineHeight: 20, color: color.ink },
  people: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  faces: { flexDirection: 'row', paddingRight: -FACE_OVERLAP },
  face: { marginRight: FACE_OVERLAP, borderRadius: radius.full },
  peopleWords: { flex: 1, fontFamily: font.medium, fontSize: 13, lineHeight: 18, color: color.inkMuted },
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingVertical: 10,
    paddingRight: 10,
    paddingLeft: space[3],
    borderRadius: radius.md,
    backgroundColor: color.snuBlue,
  },
  stripDeclined: { backgroundColor: color.blue100 },
  stripWords: { flex: 1, fontFamily: font.semiBold, fontSize: 13, lineHeight: 18, color: color.onPrimary },
  stripWordsDeclined: { color: color.snuBlue },
  stripDecline: {
    height: 34,
    justifyContent: 'center',
    paddingHorizontal: space[3],
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 10,
  },
  stripDeclineWords: { fontFamily: font.semiBold, fontSize: 13, lineHeight: 18, color: color.onPrimary },
  stripButton: {
    height: 34,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: color.surface,
  },
  stripButtonDeclined: { backgroundColor: color.snuBlue },
  stripButtonWords: { fontFamily: font.bold, fontSize: 13, lineHeight: 18, color: color.snuBlue },
  stripButtonWordsDeclined: { color: color.onPrimary },
  waiting: {
    position: 'absolute',
    top: -6,
    right: -6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: WAITING,
    height: WAITING,
    paddingHorizontal: 6,
    borderRadius: radius.full,
    backgroundColor: color.danger,
  },
  waitingWords: { fontFamily: font.bold, fontSize: 12, lineHeight: WAITING, color: color.onPrimary },
});
