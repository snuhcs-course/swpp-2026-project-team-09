/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { friendsQuery } from '@/api/queries';
import type { Place } from '@/api/types';
import { Button, color, font, radius, RoundIcon, space, text } from '@/design-system';
import { seenOfMe } from '@/features/friends/seen-of-me';
import { useMySwitches } from '@/features/friends/use-my-switches';
import { usePlaceNear } from '@/features/places/use-place-at';
import { usePosition } from '@/position';
import { CardFrame, CloseButton } from './card';

// "301동", or the name of a Place without a number.
export function placeWords(place: Place): string {
  return place.number === null ? place.name : `${place.number}동`;
}

// The head, and under it the Place the User is in or near, which a Friend at the building level sees; none without one.
function Head({ onClose }: { onClose: () => void }): ReactElement {
  const place = usePlaceNear(usePosition().position);
  return (
    <View style={styles.head}>
      <RoundIcon fill={color.blue50} icon="user" ink={color.snuBlue} />
      <View style={styles.words}>
        <Text accessibilityRole="header" style={styles.title}>
          지금 친구에게 보이는 나
        </Text>
        {place === undefined || place === null ? null : (
          <Text style={styles.place} testID="my-place">
            {placeWords(place)}
          </Text>
        )}
      </View>
      <CloseButton onClose={onClose} />
    </View>
  );
}

// One row per Friend, facts and no choices: the full name, and what the Friend sees of the User now. A long list
// scrolls inside the card.
function Rows(): ReactElement | null {
  const friends = useQuery(friendsQuery).data;
  const switches = useMySwitches();
  if (friends === undefined) {
    return null;
  }
  if (friends.length === 0) {
    return <Text style={styles.none}>아직 친구가 없어요</Text>;
  }
  if (switches === null) {
    return null;
  }
  return (
    <ScrollView contentContainerStyle={styles.rows} style={styles.box}>
      {seenOfMe(friends, switches).map(({ id, name: fullName, words }) => (
        <View accessibilityLabel={`${fullName}, ${words}`} accessible key={id} style={styles.row} testID="seen-row">
          <Text numberOfLines={1} style={styles.name}>
            {fullName}
          </Text>
          <Text style={styles.value}>{words}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

// The User's own card, which a press on their own dot opens while the switch of the answer on the map is on (board
// a11): what each Friend sees of the User now, "바꾸기" to 위치 공유, and that lowering a level is never told.
export function MyCard({
  onClose,
  onHeight,
}: {
  onClose: () => void;
  onHeight: (height: number) => void;
}): ReactElement {
  return (
    <CardFrame onHeight={onHeight}>
      <Head onClose={onClose} />
      <Rows />
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
      <Text style={styles.foot}>내리는 것은 언제든 바로 되고 친구에게 알려지지 않아요.</Text>
    </CardFrame>
  );
}

const ROW = 24;
// About six rows show; more scroll.
const ROWS_SHOWN = 6.5;

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  words: { flexGrow: 1, flexShrink: 1, minWidth: 0 },
  title: { ...text.title, color: color.ink },
  place: { ...text.caption, fontFamily: font.semiBold, color: color.inkMuted },
  box: { maxHeight: ROW * ROWS_SHOWN + space[2] * 2, borderRadius: radius.md, backgroundColor: color.surfaceSubtle },
  rows: { paddingVertical: space[2], paddingHorizontal: space[3] },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: ROW },
  name: { ...text.label, flexShrink: 1, fontFamily: font.medium, color: color.inkMuted },
  value: { ...text.label, flexGrow: 1, textAlign: 'right', color: color.ink },
  none: { ...text.body, color: color.inkMuted },
  buttons: { flexDirection: 'row' },
  foot: { ...text.caption, color: color.inkMuted },
});
