/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { type ReactElement, useEffect, useState } from 'react';
import { Pressable, type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { placeSearchQuery } from '@/api/queries';
import type { Place } from '@/api/types';
import { BottomSheet, Button, color, font, Icon, radius, SearchField, space } from '@/design-system';
import { type PickedPlace, waitForPlace } from '@/features/places/picked-place';

const SEARCH_AFTER_MS = 300;

// "제1공학관 301동", as the map view names a Place.
export function placeWords({ name, number }: Place): string {
  return number === null ? name : `${name} ${number}동`;
}

// The words once they have not changed for a while.
function useSettled(words: string): string {
  const [settled, setSettled] = useState(words);
  useEffect(() => {
    const timer = setTimeout(setSettled, SEARCH_AFTER_MS, words);
    return (): void => {
      clearTimeout(timer);
    };
  }, [words]);
  return settled;
}

// The buildings the main server finds for the words once the User stopped typing; the previous ones stay while the
// next are asked, and none before anything is typed.
function useFound(words: string): Place[] {
  const settled = useSettled(words.trim());
  const asked = words.trim() === '' ? '' : settled;
  const found = useQuery({ ...placeSearchQuery(asked), enabled: asked !== '', placeholderData: keepPreviousData });
  return asked === '' ? [] : (found.data ?? []);
}

// The name with the typed words in bold, where it holds them.
function Named({ name, words }: { name: string; words: string }): ReactElement {
  const at = words === '' ? -1 : name.indexOf(words);
  if (at < 0) {
    return <Text style={styles.name}>{name}</Text>;
  }
  return (
    <Text numberOfLines={1} style={styles.name}>
      {name.slice(0, at)}
      <Text style={styles.matched}>{words}</Text>
      {name.slice(at + words.length)}
    </Text>
  );
}

function rowStyle({ pressed }: { pressed: boolean }): StyleProp<ViewStyle> {
  return [styles.row, pressed && styles.pressed];
}

function BuildingRow({ place, words, onPress }: { place: Place; words: string; onPress: () => void }): ReactElement {
  return (
    <Pressable accessibilityLabel={placeWords(place)} accessibilityRole="button" onPress={onPress} style={rowStyle}>
      {place.number === null ? null : (
        <View style={styles.number}>
          <Text style={styles.numberWords}>{place.number}</Text>
        </View>
      )}
      <Named name={place.name} words={words} />
    </Pressable>
  );
}

interface ResultsProps {
  // The words typed, trimmed.
  typed: string;
  found: readonly Place[];
  onPicked: (place: PickedPlace) => void;
  onTyped: (words: string) => void;
}

// The buildings found, then the words kept as they are.
function Results({ typed, found, onPicked, onTyped }: ResultsProps): ReactElement {
  return (
    <View accessibilityLabel="장소 목록" style={styles.list}>
      {found.map((place) => (
        <BuildingRow
          key={place.id}
          onPress={() => {
            onPicked({
              placeId: place.id,
              position: { latitude: place.latitude, longitude: place.longitude },
              words: placeWords(place),
            });
          }}
          place={place}
          words={typed}
        />
      ))}
      <Pressable
        accessibilityLabel={`‘${typed}’ 그대로 쓰기`}
        accessibilityRole="button"
        onPress={() => {
          onTyped(typed);
        }}
        style={({ pressed }) => [styles.row, styles.last, pressed && styles.pressed]}
      >
        <Icon color={color.inkMuted} name="pencil" size={16} />
        <View style={styles.typedWords}>
          <Text numberOfLines={1} style={styles.typed}>{`‘${typed}’ 그대로 쓰기`}</Text>
          <Text style={styles.typedLine}>건물 목록에 없는 장소</Text>
        </View>
      </Pressable>
    </View>
  );
}

// The search, which each opening starts from the place's words so far.
function useSearch(open: boolean, words: string): [string, (search: string) => void] {
  const [search, setSearch] = useState(words);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setSearch(words);
    }
  }
  return [search, setSearch];
}

interface PlaceSheetProps {
  open: boolean;
  words: string;
  onClose: () => void;
  // A building of the list, or a point of the map, with the words it shows.
  onPicked: (place: PickedPlace) => void;
  // The words as typed, which go as the Place they name or else alone.
  onTyped: (words: string) => void;
}

// 어디서, the 파티 form's place sheet: a search of the buildings, whose matches show under it as the User types, the
// words kept as they are, and 지도에서 고르기, which opens the map view. A choice closes it.
export function PlaceSheet({ open, words, onClose, onPicked, onTyped }: PlaceSheetProps): ReactElement {
  const [search, setSearch] = useSearch(open, words);
  const typed = search.trim();
  const found = useFound(search);
  return (
    <BottomSheet label="어디서" onClose={onClose} open={open}>
      <View style={styles.body}>
        <Text accessibilityRole="header" style={styles.title}>
          어디서
        </Text>
        <SearchField
          clearLabel="검색어 지우기"
          label="장소 검색"
          onChangeText={setSearch}
          placeholder="건물 이름, 동 번호"
          value={search}
        />
        {typed === '' ? null : (
          <Results
            found={found}
            onPicked={(place) => {
              onPicked(place);
              onClose();
            }}
            onTyped={(chosen) => {
              onTyped(chosen);
              onClose();
            }}
            typed={typed}
          />
        )}
        <Button
          full
          icon="map"
          onPress={() => {
            waitForPlace(onPicked);
            onClose();
            router.push('/place-map');
          }}
          size="lg"
          variant="secondary"
        >
          지도에서 고르기
        </Button>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: space[3], paddingHorizontal: space[4] },
  title: { fontFamily: font.bold, fontSize: 18, lineHeight: 26, color: color.ink },
  list: { overflow: 'hidden', borderWidth: 1, borderColor: color.border, borderRadius: radius.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    minHeight: 48,
    paddingHorizontal: space[3],
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  last: { borderBottomWidth: 0 },
  pressed: { backgroundColor: color.blue50 },
  number: {
    minWidth: 34,
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: color.blue50,
  },
  numberWords: { fontFamily: font.bold, fontSize: 12, lineHeight: 16, color: color.snuBlue },
  name: { flexShrink: 1, fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: color.ink },
  matched: { fontFamily: font.bold, color: color.snuBlue },
  typedWords: { flex: 1, minWidth: 0 },
  typed: { fontFamily: font.medium, fontSize: 15, lineHeight: 22, color: color.ink },
  typedLine: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, color: color.inkMuted },
});
