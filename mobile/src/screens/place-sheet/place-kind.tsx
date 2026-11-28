/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { useQuery } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { placesQuery } from '@/api/queries';
import { color, font, radius } from '@/design-system';
import type { PickedPlace } from '@/features/places/picked-place';
import { type PlaceKind, placeKindOf, placeToSend } from '@/features/places/typed-place';

// The kind of a place, in one grey tag wherever a place is set (reviewed on 2026-11-28).
export const PLACE_KIND_WORDS: Record<PlaceKind, string> = {
  building: '학교 건물',
  point: '지도 위치',
  words: '이름만',
};

export function KindTag({ kind }: { kind: PlaceKind }): ReactElement {
  return (
    <View style={styles.tag}>
      <Text numberOfLines={1} style={styles.words}>
        {PLACE_KIND_WORDS[kind]}
      </Text>
    </View>
  );
}

// What the place will be sent as. Typed words are named against the list of Places, asked only for them.
export function usePlaceKind(words: string, picked: PickedPlace | null): PlaceKind | null {
  const typedAlone = picked === null && words.trim() !== '';
  const places = useQuery({ ...placesQuery, enabled: typedAlone }).data ?? [];
  const sent = placeToSend(words, picked, places);
  return sent === undefined ? null : placeKindOf(sent);
}

const styles = StyleSheet.create({
  // Centred on its row, whatever the row's height.
  tag: {
    alignSelf: 'center',
    height: 22,
    justifyContent: 'center',
    paddingHorizontal: 7,
    borderRadius: radius.sm,
    backgroundColor: color.surfaceSunken,
  },
  words: { fontFamily: font.medium, fontSize: 11, lineHeight: 16, color: color.inkMuted },
});
