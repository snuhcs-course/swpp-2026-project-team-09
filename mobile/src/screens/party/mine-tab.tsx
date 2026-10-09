// AI-generated with Claude Opus 5.5, 2026-10-08 to 2026-10-09, prompted by fyoon46 and Jaehyun0320, reviewed by fyoon46 in #74
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { type ReactElement, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { myPartyQuery } from '@/api/queries';
import {
  Avatar,
  Badge,
  ChipRow,
  color,
  EmptyState,
  ErrorState,
  font,
  Icon,
  LoadingState,
  radius,
  SectionHeader,
  shadow,
  space,
} from '@/design-system';
import { filterMine, groupMine, type MineCardView, type MineFilter } from '@/features/party/mine';
import { useMineCards } from '@/features/party/use-party';
import { joinAsk } from '../room/activation-box';
import { type Ask, ConfirmSheet } from '../room/confirm-sheet';
import { useRoomActions } from '../room/use-room-actions';

const EMPTY: Record<MineFilter, string> = {
  all: '참여 중인 파티가 없어요',
  private: '비공개 파티가 없어요',
  public: '참여 중인 공개 파티가 없어요',
};

const TINT = {
  private: { ground: '#ECEEF3', edge: '#D8DCE5', soft: color.surface, ink: '#4A5166' },
  public: { ground: '#EFF6FE', edge: '#C3DBF5', soft: '#DCEBFB', ink: '#1D5FAE' },
} as const;

interface MineCardProps {
  card: MineCardView;
  onEnter: (card: MineCardView) => void;
}

function Strip({ card, onEnter }: MineCardProps): ReactElement | null {
  if (card.strip === null) {
    return null;
  }
  return (
    <View style={styles.strip}>
      <Text numberOfLines={1} style={styles.stripWords}>
        {card.strip.words}
      </Text>
      <Pressable
        accessibilityLabel={`${card.title} 활성화 참여`}
        accessibilityRole="button"
        onPress={() => {
          onEnter(card);
        }}
        style={styles.stripButton}
      >
        <Text style={styles.stripButtonWords}>참여</Text>
      </Pressable>
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

// A card of 내 파티: tinted by its kind, outlined in navy while the User is in its Party.
function MineCard({ card, onEnter }: MineCardProps): ReactElement {
  const tint = TINT[card.private ? 'private' : 'public'];
  return (
    <Pressable
      accessibilityLabel={card.title}
      accessibilityRole="button"
      onPress={() => {
        router.push(`/room/${card.questId}`);
      }}
      style={[styles.card, { backgroundColor: tint.ground, borderColor: tint.edge }, card.live && styles.live]}
    >
      <View style={styles.badges}>
        <View style={[styles.kind, { backgroundColor: tint.soft }]}>
          <Text style={[styles.kindWords, { color: tint.ink }]}>
            {card.private ? '🔒 비공개 파티' : '👥 공개 파티'}
          </Text>
        </View>
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
      <Strip card={card} onEnter={onEnter} />
      <Waiting count={card.waiting} />
    </Pressable>
  );
}

// The strip's `참여` enters as the room's does: at once, or after asking when the User must leave another Party.
function useEnter(onAsk: (ask: Ask) => void): (card: MineCardView) => void {
  const myParty = useQuery(myPartyQuery).data ?? null;
  const actions = useRoomActions();
  return ({ strip }) => {
    if (strip === null) {
      return;
    }
    if (myParty === null) {
      void actions.joinParty(strip.partyId, false);
    } else {
      onAsk(joinAsk(strip.title, myParty.title, () => void actions.joinParty(strip.partyId, true)));
    }
  };
}

// 내 파티, the frame's `PartyMine`.
export function MineTab(): ReactElement {
  const { data: cards, isPending, refetch } = useMineCards();
  const [filter, setFilter] = useState<MineFilter>('all');
  const [ask, setAsk] = useState<Ask | null>(null);
  const enter = useEnter(setAsk);
  const all = cards ?? [];
  const shown = filterMine(all, filter);
  return (
    <>
      <ChipRow
        chips={[
          { key: 'all', label: '전체', count: all.length },
          { key: 'private', label: '비공개', count: filterMine(all, 'private').length },
          { key: 'public', label: '공개', count: filterMine(all, 'public').length },
        ]}
        onSelect={setFilter}
        selected={filter}
      />
      <ScrollView contentContainerStyle={styles.body}>
        {cards === undefined && isPending ? <LoadingState /> : null}
        {cards === undefined && !isPending ? <ErrorState onRetry={refetch} /> : null}
        {cards !== undefined && shown.length === 0 ? <EmptyState icon="users" words={EMPTY[filter]} /> : null}
        {groupMine(shown).map((group) => (
          <View key={group.title} style={styles.group}>
            <SectionHeader>{group.title}</SectionHeader>
            {group.cards.map((card) => (
              <MineCard card={card} key={card.questId} onEnter={enter} />
            ))}
          </View>
        ))}
      </ScrollView>
      <ConfirmSheet
        ask={ask}
        label="확인"
        onClose={() => {
          setAsk(null);
        }}
      />
    </>
  );
}

const FACE_OVERLAP = -8;
const ROUND = 40;
const WAITING = 22;

const styles = StyleSheet.create({
  body: { gap: space[5], paddingHorizontal: space[4], paddingBottom: space[6] },
  group: { gap: space[3] },
  card: { gap: 10, padding: space[4], borderWidth: 1, borderRadius: radius.lg },
  live: {
    borderWidth: 2,
    borderColor: color.snuBlue,
    backgroundColor: color.surface,
    boxShadow: `0 0 0 4px ${color.blue100}, ${shadow.float}`,
  },
  badges: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  kind: { height: 22, paddingHorizontal: space[2], borderRadius: radius.full, justifyContent: 'center' },
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
  stripWords: { flex: 1, fontFamily: font.semiBold, fontSize: 13, lineHeight: 18, color: color.onPrimary },
  stripButton: {
    height: 34,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: color.surface,
  },
  stripButtonWords: { fontFamily: font.bold, fontSize: 13, lineHeight: 18, color: color.snuBlue },
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
