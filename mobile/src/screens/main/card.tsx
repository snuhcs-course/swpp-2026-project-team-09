/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-09  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-22  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar, Button, color, font, Icon, type IconName, radius, shadow, space, text } from '@/design-system';
import { useFriendProfile } from '@/features/friends/use-friend-profile';
import { type CardMark, type CardView, friendIdOf } from '@/features/map/adapter';
import { Choices, GroupMark } from './card-choices';
import { CARD } from './layout';
import { StudyRows } from './study-rows';

export const LOOK_CLOSER = '가까이 보기';

// What the card draws of a thing, which a Friend's card has also for a Friend whom the map does not show.
type CardContent = Pick<CardView, 'id' | 'mark' | 'subLabel' | 'title' | 'lines' | 'primary' | 'study' | 'choices'>;

interface CardProps {
  card: CardContent;
  // "가까이 보기" is offered: the camera is below the "names" level of detail.
  canLookCloser: boolean;
  onLookCloser: () => void;
  // The card's own button, where it has one: "길찾기", or one whose feature belongs to another task.
  onPrimary: () => void;
  onClose: () => void;
  // A press on one of the card's choices, such as an event at a place, with the id of the card it opens.
  onChoose?: (id: string) => void;
  // The card's height, once it is laid out and whenever it changes: a toast sits above it.
  onHeight?: (height: number) => void;
  // Its distance from the top, for a card that sits at the top of the map, as a 식당's does. Left out, at the bottom.
  top?: number;
}

// A place's kind in the design system: its colour and its icon. A campus service's round is a rounded square, as the
// frame draws it.
const PLACE: Record<Extract<CardMark, { type: 'place' }>['place'], { tint: string; icon: IconName }> = {
  official: { tint: color.snuBlue, icon: 'calendar' },
  party: { tint: color.party, icon: 'users' },
  quest: { tint: color.quest, icon: 'flag' },
  dining: { tint: color.svcDining, icon: 'meal' },
  shuttle: { tint: color.svcShuttle, icon: 'bus' },
  library: { tint: color.svcStudy, icon: 'book' },
};

// What stands at the card's head: a person's Avatar, with the status for a Friend, the place's icon on a round of its
// kind's colour, or a group's round of its kinds.
function Leading({ mark }: { mark: CardMark }): ReactElement {
  if (mark.type === 'person') {
    return (
      <Avatar
        name={mark.name}
        source={mark.photo === null ? undefined : { uri: mark.photo }}
        status={mark.presence ?? undefined}
      />
    );
  }
  if (mark.type === 'group') {
    return <GroupMark kinds={mark.kinds} />;
  }
  const { tint, icon } = PLACE[mark.place];
  return (
    <View
      style={[
        styles.round,
        (mark.place === 'dining' || mark.place === 'library') && styles.service,
        { backgroundColor: tint },
      ]}
    >
      <Icon color={color.onPrimary} name={icon} size={20} />
    </View>
  );
}

function Head({ card, onClose }: Pick<CardProps, 'card' | 'onClose'>): ReactElement {
  const { mark, subLabel, title } = card;
  return (
    <View style={styles.head}>
      <Leading mark={mark} />
      <View style={styles.words}>
        <Text
          numberOfLines={1}
          style={
            mark.type === 'person'
              ? styles.personLabel
              : [styles.placeLabel, { color: mark.type === 'group' ? color.inkMuted : PLACE[mark.place].tint }]
          }
        >
          {subLabel}
        </Text>
        <Text accessibilityRole="header" numberOfLines={2} style={styles.title}>
          {title}
        </Text>
      </View>
      <Pressable
        accessibilityLabel="닫기"
        accessibilityRole="button"
        hitSlop={CLOSE_HIT_SLOP}
        onPress={onClose}
        style={styles.close}
      >
        <Icon color={color.inkMuted} name="x" size={20} />
      </Pressable>
    </View>
  );
}

function Line({ icon, words }: { icon: IconName; words: string }): ReactElement {
  return (
    <View style={styles.line}>
      <Icon color={color.inkMuted} name={icon} size={16} />
      <Text style={styles.lineWords}>{words}</Text>
    </View>
  );
}

// What the User sees of the Friend, a row that opens 위치 공유 ("어디까지 보이나"), with a touch area of its own.
function SeenRow({ seen }: { seen: string }): ReactElement {
  return (
    <Pressable
      accessibilityLabel="어디까지 보이나"
      accessibilityRole="button"
      accessibilityValue={{ text: seen }}
      onPress={() => {
        router.push('/me/location-sharing');
      }}
      style={({ pressed }) => [styles.line, styles.seen, pressed && styles.pressed]}
    >
      <Icon color={color.inkMuted} name="lock" size={16} />
      <Text style={[styles.lineWords, styles.grow]}>{seen}</Text>
      <Icon color={color.inkMuted} name="chevronRight" size={16} />
    </Pressable>
  );
}

// The card's lines. A Friend's card is their profile: what the User sees of them before the lines, and their Friend
// ID and since when the two have been Friends after them, each where the main server sends it.
function Lines({ card }: Pick<CardProps, 'card'>): ReactElement | null {
  const facts = useFriendProfile(friendIdOf(card.id))?.facts ?? null;
  if (card.lines.length === 0 && facts === null) {
    return null;
  }
  const friendId = facts?.friendId ?? null;
  const since = facts?.since ?? null;
  return (
    <View style={styles.lines}>
      {facts === null ? null : <SeenRow seen={facts.seen} />}
      {card.lines.map(({ icon, text: words }) => (
        <Line icon={icon} key={`${icon}:${words}`} words={words} />
      ))}
      {friendId === null ? null : <Line icon="user" words={friendId} />}
      {since === null ? null : <Line icon="calendar" words={since} />}
    </View>
  );
}

// The card of what was pressed on the map, as the `MapOverviewSelect` frame draws it: above the AI input's place,
// with the leading mark, the sub-label, the title, the lines or the choices, "가까이 보기" where it is offered and the
// card's button. A Friend's card is their profile, with its rows among the lines.
export function Card({
  card,
  canLookCloser,
  onLookCloser,
  onPrimary,
  onClose,
  onChoose,
  onHeight,
  top,
}: CardProps): ReactElement {
  return (
    <View
      onLayout={({ nativeEvent: { layout } }) => {
        onHeight?.(layout.height);
      }}
      style={[styles.card, top === undefined ? styles.atBottom : { top }]}
      testID="map-card"
    >
      <Head card={card} onClose={onClose} />
      <Lines card={card} />
      {card.study === undefined ? null : <StudyRows key={`study:${card.id}`} study={card.study} />}
      <Choices card={card} key={card.id} onChoose={onChoose} />
      <View style={styles.buttons}>
        {canLookCloser ? (
          <Button icon="search" onPress={onLookCloser} variant="secondary">
            {LOOK_CLOSER}
          </Button>
        ) : null}
        {card.primary === null ? null : (
          <View style={styles.primary}>
            <Button full onPress={onPrimary}>
              {card.primary.label}
            </Button>
          </View>
        )}
      </View>
    </View>
  );
}

const ROUND = 40;
// The frame's X is 44; the room around it brings its touch area to the design system's minimum.
const CLOSE = 44;
const CLOSE_HIT_SLOP = 2;
const GAP = 10;
const SEEN_HEIGHT = 44;

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    right: CARD.side,
    left: CARD.side,
    gap: GAP,
    padding: space[4],
    borderRadius: radius.lg,
    backgroundColor: color.surface,
    boxShadow: shadow.mapCard,
  },
  atBottom: { bottom: CARD.bottom },
  head: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  round: { alignItems: 'center', justifyContent: 'center', width: ROUND, height: ROUND, borderRadius: radius.full },
  service: { borderRadius: radius.md },
  words: { flexGrow: 1, flexShrink: 1, minWidth: 0 },
  // The frame's sub-labels are the caption's size, heavier: a person's in the semi-bold weight and grey, a place's
  // in the bold weight and its kind's colour.
  personLabel: { ...text.caption, fontFamily: font.semiBold, color: color.inkMuted },
  placeLabel: { ...text.caption, fontFamily: font.bold },
  title: { ...text.title, color: color.ink },
  close: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    width: CLOSE,
    height: CLOSE,
    marginTop: -space[2],
    marginRight: -space[2],
  },
  lines: { gap: space[1] },
  line: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  seen: { minHeight: SEEN_HEIGHT },
  pressed: { opacity: 0.6 },
  grow: { flexGrow: 1 },
  lineWords: { ...text.body, flexShrink: 1, color: color.inkMuted },
  buttons: { flexDirection: 'row', gap: space[2] },
  primary: { flexGrow: 1, flexShrink: 1 },
});
