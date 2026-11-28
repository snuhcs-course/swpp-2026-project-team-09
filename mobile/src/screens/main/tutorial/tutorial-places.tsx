/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-28  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { useQuery } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { placesQuery } from '@/api/queries';
import type { TutorialLink, TutorialPlace, TutorialQuest } from '@/api/tutorial-types';
import type { LatLng, Place } from '@/api/types';
import type { TutorialPinTarget } from './use-tutorial-pin';
import { openSite } from './web-links';
import { Button, color, Glass, Icon, radius, size, space, text, tutorialTone } from '@/design-system';

// A quest's places, each with 지도에서 보기, and its links, opened with expo-web-browser (MainTutorialSheet), in one box.

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

// A place's row: its words, and 지도에서 보기, which focuses the main map on it and drops the tutorial place pin there.
function PlaceRow({
  entry,
  places,
  first,
  onShowOnMap,
}: {
  entry: TutorialPlace;
  places: readonly Place[];
  first: boolean;
  onShowOnMap: (target: TutorialPinTarget) => void;
}): ReactElement {
  const { words, position } = shownPlace(entry, places);
  return (
    <View style={[styles.place, !first && styles.line]}>
      <Icon color={tutorialTone.ink} name="pin" size={18} />
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
}

// A link's row, which opens its site.
function LinkRow({ link, first }: { link: TutorialLink; first: boolean }): ReactElement {
  return (
    <Pressable
      accessibilityLabel={`${link.label} 열기`}
      accessibilityRole="button"
      onPress={() => {
        openSite(link.url);
      }}
      style={({ pressed }) => [styles.link, !first && styles.line, pressed && styles.pressed]}
    >
      <Icon color={tutorialTone.link} name="globe" size={18} />
      <Text style={styles.linkWords}>{link.label}</Text>
      <Icon color={tutorialTone.link} name="chevronRight" size={18} />
    </Pressable>
  );
}

// The places and the links in one box (P06 ticket 60): the quest's one way to its sites. Nothing for a quest with
// neither.
export function Places({
  quest,
  onShowOnMap,
}: {
  quest: TutorialQuest;
  onShowOnMap: (target: TutorialPinTarget) => void;
}): ReactElement | null {
  const places = useQuery(placesQuery).data ?? [];
  if (quest.places.length === 0 && quest.links.length === 0) {
    return null;
  }
  return (
    <Glass level="inner" style={styles.box}>
      {quest.places.map((entry, at) => (
        <PlaceRow
          entry={entry}
          first={at === 0}
          key={shownPlace(entry, places).words}
          onShowOnMap={onShowOnMap}
          places={places}
        />
      ))}
      {quest.links.map((link, at) => (
        <LinkRow first={at === 0 && quest.places.length === 0} key={link.url} link={link} />
      ))}
    </Glass>
  );
}

const styles = StyleSheet.create({
  box: { overflow: 'hidden', borderWidth: 1, borderColor: color.border, borderRadius: radius.lg },
  line: { borderTopWidth: 1, borderTopColor: color.border },
  place: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    minHeight: 52,
    paddingVertical: space[2],
    paddingRight: space[2],
    paddingLeft: 14,
  },
  placeWords: { ...text.label, flex: 1, color: color.ink },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: size.touchMin,
    paddingVertical: space[2],
    paddingHorizontal: 14,
  },
  linkWords: { ...text.label, flex: 1, color: tutorialTone.link },
  pressed: { backgroundColor: color.blue50 },
});
