/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, color, font, radius, space, text } from '@/design-system';
import { useAnswerSwitch } from '@/features/assistant/answer-switch';
import type { FriendView } from '@/features/friends/adapter';
import { seenCardOf } from '@/features/friends/profile';
import { useFriendProfile } from '@/features/friends/use-friend-profile';
import { useMySwitches } from '@/features/friends/use-my-switches';
import { type CardMark, friendIdOf } from '@/features/map/adapter';
import { usePlaceNear } from '@/features/places/use-place-at';
import { Card, CardFrame, type CardProps, Head, Line } from './card';
import { placeWords } from './my-card';
import type { Selection } from './use-selection';

// The selection whose card is shown: its close, and its "어디까지 보이나".
export type SeenSelection = Pick<Selection, 'close' | 'seen' | 'showSeen' | 'hideSeen'>;

interface SeenCardProps {
  friend: FriendView;
  // The Friend's mark, as their card draws it.
  mark: CardMark;
  onClose: () => void;
  onHeight?: (height: number) => void;
}

// "어디까지 보이나" of a Friend (row 9 board 2): the Friend with the Place the map shows them at, as `GET /places/at`
// finds it for their position, the User's own end as the Friend sees it and what the two see once the User's switches
// are known, and "바꾸기" to 위치 공유.
function SeenCard({ friend, mark, onClose, onHeight }: SeenCardProps): ReactElement {
  const place = usePlaceNear(friend.position);
  const where = place === undefined || place === null ? null : placeWords(place);
  const { title, levels } = seenCardOf(friend, where, useMySwitches());
  return (
    <CardFrame onHeight={onHeight}>
      <Head card={{ mark, subLabel: '어디까지 보이나', title }} onClose={onClose} />
      {levels === null ? null : (
        <>
          <Line icon="user" words={levels.mine} />
          <View style={styles.note}>
            <Text style={styles.noteWords}>{levels.both}</Text>
          </View>
        </>
      )}
      <View style={styles.buttons}>
        <Button
          onPress={() => {
            router.push('/me/location-sharing');
          }}
          variant="secondary"
        >
          바꾸기
        </Button>
      </View>
    </CardFrame>
  );
}

// The selected card of the everyday map, which its selection closes. While the switch of the answer on the map is on,
// a Friend's "어디까지 보이나" opens its own card in this card's place (`selection.seen`), whose ✕ and Android's back
// bring the Friend's card back; while it is off, it opens 위치 공유.
export function CardOrSeen({
  selection,
  ...props
}: Omit<CardProps, 'onClose' | 'onSeen'> & { selection: SeenSelection }): ReactElement {
  const onMap = useAnswerSwitch();
  const { card, onHeight } = props;
  const friend = useFriendProfile(onMap && selection.seen ? friendIdOf(card.id) : null)?.friend ?? null;
  if (friend !== null) {
    return <SeenCard friend={friend} mark={card.mark} onClose={selection.hideSeen} onHeight={onHeight} />;
  }
  return <Card {...props} onClose={selection.close} onSeen={onMap ? selection.showSeen : undefined} />;
}

// The board's note: its blue ground and its words.
const NOTE_SIDE = 10;

const styles = StyleSheet.create({
  note: {
    paddingVertical: space[2],
    paddingHorizontal: NOTE_SIDE,
    borderRadius: radius.md,
    backgroundColor: color.blue50,
  },
  noteWords: { ...text.caption, fontFamily: font.semiBold, color: color.blue600 },
  buttons: { flexDirection: 'row' },
});
