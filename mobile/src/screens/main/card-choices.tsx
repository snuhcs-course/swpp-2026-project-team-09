/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { type ReactElement, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Chip, color, font, Icon, KindRounds, radius, space, text } from '@/design-system';
import type { CardView, PlaceKind } from '@/features/map/adapter';
import { KIND_WORDS, PLACE_KINDS } from '@/features/map/place-groups';

interface ChoicesProps {
  card: CardView;
  // A press on one of the choices, with the id of the card it opens.
  onChoose?: (id: string) => void;
}

// The choices of a card that stands for several things at one place: a row each, with its title and a line of its
// card such as its time, which opens the thing's own card. Of several kinds, a chip for each kind above the rows
// shows that kind's things alone, the first kind's at first. A kind that leaves the place gives way to the first.
export function Choices({ card, onChoose }: ChoicesProps): ReactElement | null {
  const [chosen, setChosen] = useState<PlaceKind | null>(null);
  if (card.choices === undefined) {
    return null;
  }
  const { choices } = card;
  const kinds = PLACE_KINDS.filter((kind) => choices.some((choice) => choice.kind === kind));
  const shown = kinds.find((kind) => kind === chosen) ?? kinds[0];
  const rows = kinds.length > 1 ? choices.filter(({ kind }) => kind === shown) : choices;
  return (
    <View style={styles.choices}>
      {kinds.length > 1 ? (
        <View style={styles.chips}>
          {kinds.map((kind) => (
            <Chip
              key={kind}
              onPress={() => {
                setChosen(kind);
              }}
              selected={kind === shown}
            >
              {`${KIND_WORDS[kind].chip} ${choices.filter((choice) => choice.kind === kind).length}`}
            </Chip>
          ))}
        </View>
      ) : null}
      {rows.map(({ id, title, detail }) => (
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
            <Text numberOfLines={1} style={styles.detail}>
              {detail}
            </Text>
          </View>
          <Icon color={color.inkMuted} name="chevronRight" size={18} />
        </Pressable>
      ))}
    </View>
  );
}

// What stands at the head of a group's card: a round with a small round for each kind, in its colour and its icon.
export function GroupMark({ kinds }: { kinds: readonly PlaceKind[] }): ReactElement {
  return (
    <View style={styles.group}>
      <KindRounds kinds={kinds} />
    </View>
  );
}

// The frame's X is 44: a row is as high, so that it reaches the touch area too.
const ROW = 44;
const ROUND = 40;

const styles = StyleSheet.create({
  choices: { gap: space[1] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2], paddingVertical: space[1] },
  choice: { flexDirection: 'row', alignItems: 'center', gap: space[2], minHeight: ROW, paddingVertical: space[1] },
  words: { flexGrow: 1, flexShrink: 1, minWidth: 0 },
  choiceTitle: { ...text.body, fontFamily: font.semiBold, color: color.ink },
  detail: { ...text.body, flexShrink: 1, color: color.inkMuted },
  group: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    alignContent: 'center',
    gap: 2,
    width: ROUND,
    height: ROUND,
    borderRadius: radius.full,
    backgroundColor: color.surfaceSunken,
  },
});
