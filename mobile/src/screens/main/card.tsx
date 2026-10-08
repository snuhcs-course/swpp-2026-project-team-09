import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar, Button, color, font, Icon, type IconName, radius, shadow, space, text } from '@/design-system';
import type { CardMark, CardView } from '@/features/map/adapter';
import { CARD } from './layout';

export const LOOK_CLOSER = '가까이 보기';

interface CardProps {
  card: CardView;
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
};

// What stands at the card's head: a person's Avatar, with the status for a Friend, or the place's icon on a round
// of its kind's colour.
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
  const { tint, icon } = PLACE[mark.place];
  return (
    <View style={[styles.round, mark.place === 'dining' && styles.service, { backgroundColor: tint }]}>
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
          style={mark.type === 'person' ? styles.personLabel : [styles.placeLabel, { color: PLACE[mark.place].tint }]}
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

// The choices of a card that stands for several things, such as the Global Events at one place: a row each, with its
// title and its time, which opens the thing's own card.
function Choices({ card, onChoose }: Pick<CardProps, 'card' | 'onChoose'>): ReactElement | null {
  if (card.choices === undefined) {
    return null;
  }
  return (
    <View style={styles.choices}>
      {card.choices.map(({ id, title, detail }) => (
        <Pressable
          accessibilityLabel={title}
          accessibilityRole="button"
          key={id}
          onPress={() => {
            onChoose?.(id);
          }}
          style={styles.choice}
        >
          <View style={styles.words}>
            <Text numberOfLines={1} style={styles.choiceTitle}>
              {title}
            </Text>
            <Text numberOfLines={1} style={styles.lineWords}>
              {detail}
            </Text>
          </View>
          <Icon color={color.inkMuted} name="chevronRight" size={18} />
        </Pressable>
      ))}
    </View>
  );
}

// The card of what was pressed on the map, as the `MapOverviewSelect` frame draws it: above the AI input's place,
// with the leading mark, the sub-label, the title, the lines or the choices, "가까이 보기" where it is offered and the
// card's button.
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
      {card.lines.length === 0 ? null : (
        <View style={styles.lines}>
          {card.lines.map(({ icon, text: words }) => (
            <View key={`${icon}:${words}`} style={styles.line}>
              <Icon color={color.inkMuted} name={icon} size={16} />
              <Text style={styles.lineWords}>{words}</Text>
            </View>
          ))}
        </View>
      )}
      <Choices card={card} onChoose={onChoose} />
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
  lineWords: { ...text.body, flexShrink: 1, color: color.inkMuted },
  choices: { gap: space[1] },
  choice: { flexDirection: 'row', alignItems: 'center', gap: space[2], minHeight: CLOSE, paddingVertical: space[1] },
  choiceTitle: { ...text.body, fontFamily: font.semiBold, color: color.ink },
  buttons: { flexDirection: 'row', gap: space[2] },
  primary: { flexGrow: 1, flexShrink: 1 },
});
