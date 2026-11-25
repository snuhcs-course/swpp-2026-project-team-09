/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-09  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-22  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-26  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { color, font, Icon, radius, shadow, space } from '@/design-system';
import type { MineCardView } from '@/features/party/mine';
import { LiveDot } from './live-dot';

// The kind's greys, as the frame draws them: the front person and the lock's body dark, the back person light.
const KIND_DARK = '#6B7286';
const KIND_LIGHT = '#B4BAC7';
const KIND_SIZE = 26;
// The outline of the strip's `참여`, as the frame draws it.
const JOIN_EDGE = '#C9CDD8';

interface MineCardProps {
  card: MineCardView;
  onEnter: (card: MineCardView) => void;
  onDecline: (partyId: string) => void;
}

// 공개: two people, the front one dark and the back one light. 비공개: a lock without a keyhole.
function KindIcon({ closed }: { closed: boolean }): ReactElement {
  return (
    <Svg height={KIND_SIZE} viewBox="0 0 26 26" width={KIND_SIZE}>
      {closed ? (
        <>
          <Path
            d="M8.5 12V8.5a4.5 4.5 0 0 1 9 0V12"
            fill="none"
            stroke={color.inkSubtle}
            strokeLinecap="round"
            strokeWidth={2.6}
          />
          <Rect fill={KIND_DARK} height={12} rx={3.5} width={16} x={5} y={11.5} />
        </>
      ) : (
        <>
          <Circle cx={17.6} cy={8.6} fill={KIND_LIGHT} r={3.4} />
          <Path d="M13.2 21.5c.3-4.3 2.4-7 5-7s4.9 2.7 5.2 7z" fill={KIND_LIGHT} />
          <Circle cx={10} cy={9.2} fill={KIND_DARK} r={4} />
          <Path d="M2.8 22.5c.3-5 3.3-8 7.2-8s6.9 3 7.2 8z" fill={KIND_DARK} />
        </>
      )}
    </Svg>
  );
}

// The kind, its icon over "공개" or "비공개", centred on the card's height.
function Kind({ closed }: { closed: boolean }): ReactElement {
  return (
    <View style={styles.kind}>
      <KindIcon closed={closed} />
      <Text style={styles.kindWords}>{closed ? '비공개' : '공개'}</Text>
    </View>
  );
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

// A card of 내 파티, one line high: the kind, the title with its count, and "when · where" from the next step. Outlined
// in navy while the User is in its Party. A past Quest's card opens nothing: its room is gone.
export function MineCard({ card, onEnter, onDecline }: MineCardProps): ReactElement {
  return (
    <Pressable
      accessibilityLabel={card.title}
      accessibilityRole={card.past ? undefined : 'button'}
      disabled={card.past}
      onPress={() => {
        router.push(`/room/${card.questId}`);
      }}
      style={[styles.card, card.live && styles.live]}
    >
      <Kind closed={card.private} />
      <View style={styles.words}>
        <View style={styles.top}>
          <Text numberOfLines={1} style={styles.title}>
            {card.title}
          </Text>
          <View style={styles.count}>
            <Icon color={color.inkMuted} name="users" size={12} />
            <Text style={styles.countWords}>{card.count}</Text>
          </View>
        </View>
        <Text numberOfLines={1} style={styles.line}>
          {card.line}
        </Text>
        <Strip card={card} onDecline={onDecline} onEnter={onEnter} />
      </View>
      <Waiting count={card.waiting} />
    </Pressable>
  );
}

// The frame's measures off the design system's 4-point steps: the card's padding and radius, the kind's column, and
// the strip's buttons, 28 high, whose touch reaches 48.
const PADDING_V = 12;
const PADDING_H = 14;
const CARD_RADIUS = 14;
const KIND_WIDTH = 38;
const BUTTON = 28;
const BUTTON_RADIUS = 8;
const HIT_SLOP = { top: 10, bottom: 10, left: 4, right: 4 };
const WAITING = 22;

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingVertical: PADDING_V,
    paddingHorizontal: PADDING_H,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: CARD_RADIUS,
    backgroundColor: color.surface,
  },
  live: {
    borderWidth: 2,
    borderColor: color.snuBlue,
    boxShadow: `0 0 0 4px ${color.blue100}, ${shadow.float}`,
  },
  kind: { alignItems: 'center', gap: 2, width: KIND_WIDTH },
  kindWords: { fontFamily: font.semiBold, fontSize: 10, lineHeight: 12, color: color.inkMuted },
  words: { flex: 1, minWidth: 0, gap: 2 },
  top: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  title: {
    flex: 1,
    minWidth: 0,
    fontFamily: font.semiBold,
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: -0.15,
    color: color.ink,
  },
  count: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  countWords: { fontFamily: font.semiBold, fontSize: 12, lineHeight: 16, color: color.inkMuted },
  line: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: color.inkMuted },
  strip: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: space[1] },
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
