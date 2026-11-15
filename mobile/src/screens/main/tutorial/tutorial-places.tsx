/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { useQuery } from '@tanstack/react-query';
import { openBrowserAsync } from 'expo-web-browser';
import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { placesQuery } from '@/api/queries';
import type { TutorialPlace, TutorialQuest } from '@/api/tutorial-types';
import type { LatLng, Place } from '@/api/types';
import type { TutorialPinTarget } from './use-tutorial-pin';
import { Button, color, Icon, space, text, tutorialTone } from '@/design-system';

// A quest's places, each with 지도에서 보기, and its links, opened with expo-web-browser (MainTutorialSheet).

// A place's words and point: a Place of the list by its number, with its floor, or a point with its words. A Place
// the list does not hold has no point, and no 지도에서 보기.
function shownPlace(entry: TutorialPlace, places: readonly Place[]): { words: string; position: LatLng | null } {
  if ('point' in entry) {
    return { words: entry.label, position: entry.point };
  }
  const place = places.find(({ number }) => number === entry.place);
  const name =
    entry.label ?? `${place?.name ?? `${entry.place}동`}${entry.floor === undefined ? '' : ` ${entry.floor}층`}`;
  return { words: name, position: place ?? null };
}

// The places with 지도에서 보기, which focuses the main map on one and drops the tutorial place pin there, and the links.
export function Places({
  quest,
  onShowOnMap,
}: {
  quest: TutorialQuest;
  onShowOnMap: (target: TutorialPinTarget) => void;
}): ReactElement {
  const places = useQuery(placesQuery).data ?? [];
  return (
    <>
      {quest.places.map((entry) => {
        const { words, position } = shownPlace(entry, places);
        return (
          <View key={words} style={styles.place}>
            <Icon color={tutorialTone.ink} name="pin" size={16} />
            <Text style={styles.placeWords}>{words}</Text>
            {position === null ? null : (
              <Button
                label={`${words} 지도에서 보기`}
                onPress={() => {
                  onShowOnMap({
                    position: { latitude: position.latitude, longitude: position.longitude },
                    words,
                    atPlace: !('point' in entry),
                  });
                }}
                variant="secondary"
              >
                지도에서 보기
              </Button>
            )}
          </View>
        );
      })}
      {quest.links.map(({ label, url }) => (
        <Button
          icon="route"
          key={url}
          label={`${label} 열기`}
          onPress={() => {
            void openBrowserAsync(url).catch(() => null);
          }}
          variant="ghost"
        >
          {label}
        </Button>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  place: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  placeWords: { ...text.label, flex: 1, color: color.ink },
});
