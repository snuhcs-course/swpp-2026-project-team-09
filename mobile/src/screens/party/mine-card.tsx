/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-09  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-22  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-26  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { cardStyles, color, font, Icon, radius, shadow, space, text } from '@/design-system';
import type { MineCardView } from '@/features/party/mine';
import { LiveDot } from './live-dot';
import { InfoLine, PostTag } from './post-content';

// The outline of the strip's `참여`, as the frame draws it.
const JOIN_EDGE = '#C9CDD8';
// The crown of a 파티 the User leads, in the room's 파티장 gold.
const CROWN = '#E8A400';

interface MineCardProps {
  card: MineCardView;
  onEnter: (card: MineCardView) => void;
  onDecline: (partyId: string) => void;
}

// A Party running without the User: "활성화 중 · 김민준" beside the red light, with a small grey `거절` and an outlined
// `참여` while it waits for an answer, and "활성화 중 · 참여 안 함" with `참여` alone once declined.
function Strip({ card, onEnter, onDecline }: MineCardProps): ReactElement | null {
  const { strip } = card;
  if (strip === null) {
    return null;
  }
  return (
    <View style={styles.strip}>
      <LiveDot />
      <Text numberOfLines={1} style={styles.stripWords}>
        {strip.words}
      </Text>
      {strip.declined ? null : (
        <Pressable
          accessibilityLabel={`${card.title} 활성화 거절`}
          accessibilityRole="button"
          hitSlop={HIT_SLOP}
          onPress={() => {
            onDecline(strip.partyId);
          }}
          style={styles.decline}
        >
          <Text style={styles.declineWords}>거절</Text>
        </Pressable>
      )}
      <Pressable
        accessibilityLabel={`${card.title} 활성화 참여`}
        accessibilityRole="button"
        hitSlop={HIT_SLOP}
        onPress={() => {
          onEnter(card);
        }}
        style={styles.join}
      >
        <Text style={styles.joinWords}>참여</Text>
      </Pressable>
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

// The tag and the count, "비공개" or the board at the left and the count at the right, after a crown on a Quest the
// User leads.
function Top({ card }: { card: MineCardView }): ReactElement {
  return (
    <View style={styles.top}>
      {card.tag === null ? null : <PostTag words={card.tag} />}
      <View style={styles.grow} />
      <View style={styles.count}>
        {card.leads ? <Icon color={CROWN} label="방장" name="crown" size={14} /> : null}
        <View style={styles.fill}>
          <Icon color={color.inkMuted} name="users" size={12} />
          <Text style={styles.countWords}>{card.count}</Text>
        </View>
      </View>
    </View>
  );
}

// A card of 내 파티, as 찾기's: the tag and the count, the title, then the next step's time, its place and the event,
// each on its line. Outlined in navy while the User is in its Party. A past Quest's card opens nothing: its room is
// gone. A booking party's card whose room request is out opens that answer again on the map (P10 ticket 13).
export function MineCard({ card, onEnter, onDecline }: MineCardProps): ReactElement {
  return (
    <Pressable
      accessibilityLabel={card.title}
      accessibilityRole={card.past ? undefined : 'button'}
      disabled={card.past}
      onPress={() => {
        if (card.reopens === true) {
          router.navigate(`/main?card=party:${card.questId}`);
        } else {
          router.push(`/room/${card.questId}`);
        }
      }}
      style={[cardStyles.card, styles.card, card.live && styles.live]}
    >
      <Top card={card} />
      <Text numberOfLines={2} style={styles.title}>
        {card.title}
      </Text>
      <View style={styles.lines}>
        <InfoLine icon="clock" lines={1} small>
          {card.time}
        </InfoLine>
        <InfoLine icon="pin" lines={2} small>
          {card.place}
        </InfoLine>
        {card.event === null ? null : (
          <InfoLine event icon="calendar" lines={1} small>
            {card.event}
          </InfoLine>
        )}
      </View>
      <Strip card={card} onDecline={onDecline} onEnter={onEnter} />
      <Waiting count={card.waiting} />
    </Pressable>
  );
}

// The strip's buttons, 28 high, whose touch reaches 48.
const BUTTON = 28;
const BUTTON_RADIUS = 8;
const HIT_SLOP = { top: 10, bottom: 10, left: 4, right: 4 };
const WAITING = 22;

const styles = StyleSheet.create({
  card: { gap: space[2], paddingTop: space[3] },
  live: {
    borderWidth: 2,
    borderColor: color.snuBlue,
    boxShadow: `0 0 0 4px ${color.blue100}, ${shadow.float}`,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  grow: { flex: 1 },
  count: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
  fill: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  countWords: { fontFamily: font.semiBold, fontSize: 12, lineHeight: 16, color: color.inkMuted },
  title: { ...text.title, color: color.ink },
  lines: { gap: space[1] },
  strip: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stripWords: { flex: 1, minWidth: 0, fontFamily: font.semiBold, fontSize: 12, lineHeight: 16, color: color.ink },
  decline: { justifyContent: 'center', height: BUTTON, paddingHorizontal: space[2] },
  declineWords: { fontFamily: font.semiBold, fontSize: 12, lineHeight: 16, color: color.inkMuted },
  join: {
    justifyContent: 'center',
    height: BUTTON,
    paddingHorizontal: space[3],
    borderWidth: 1,
    borderColor: JOIN_EDGE,
    borderRadius: BUTTON_RADIUS,
    backgroundColor: color.surface,
  },
  joinWords: { fontFamily: font.bold, fontSize: 12, lineHeight: 16, color: color.ink },
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
