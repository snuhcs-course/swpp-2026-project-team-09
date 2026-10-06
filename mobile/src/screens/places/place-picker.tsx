import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { type ReactElement, useEffect, useState } from 'react';
import { Pressable, type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { placeSearchQuery, placesQuery } from '@/api/queries';
import type { Place } from '@/api/types';
import {
  color,
  ErrorState,
  font,
  FullScreenPanel,
  Icon,
  LoadingState,
  radius,
  SearchField,
  space,
  text,
} from '@/design-system';
import { useBackToClose } from '@/hooks/use-back-to-close';

// What the picker is for. `class` is the timetable's: the list only. `event`, a Meetup's or a Sub Quest's, also offers
// `지도에서 직접 찍기`, which opens the map view of the `PlacePickerMap` frame.
export type PlacePickerMode = 'class' | 'event';

const SEARCH_AFTER_MS = 300;

interface PlacePickerProps {
  mode: PlacePickerMode;
  // The id of the Place chosen before, which the list checks.
  picked: string | null;
  // A press on a row: the caller closes the picker.
  onPick: (place: Place) => void;
  onClose: () => void;
  // `지도에서 직접 찍기`, in the `event` mode.
  onMap?: () => void;
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

const NO_MATCH_HINT: Record<PlacePickerMode, string> = {
  class: '건물 이름이나 동 번호로 다시 찾아 보세요',
  event: '건물 이름이나 동 번호로 다시 찾거나, 지도에서 직접 찍어 보세요',
};

// The list of Places, or the search's once the User stopped typing. The previous list stays while the next is asked.
function usePlaces(words: string): { places: Place[] | undefined; asked: string; isError: boolean; retry: () => void } {
  const settled = useSettled(words.trim());
  const asked = words.trim() === '' ? '' : settled;
  const all = useQuery(placesQuery);
  const found = useQuery({ ...placeSearchQuery(asked), enabled: asked !== '', placeholderData: keepPreviousData });
  const shown = asked === '' ? all : found;
  return {
    places: shown.data,
    asked,
    isError: shown.isError,
    retry: (): void => {
      void shown.refetch();
    },
  };
}

function PlaceRow({ place, chosen, onPress }: { place: Place; chosen: boolean; onPress: () => void }): ReactElement {
  return (
    <Pressable
      accessibilityLabel={place.number === null ? place.name : `${place.name} ${place.number}동`}
      accessibilityRole="button"
      accessibilityState={{ selected: chosen }}
      onPress={onPress}
      style={({ pressed }): StyleProp<ViewStyle> => [styles.row, pressed && styles.pressed]}
    >
      <Icon color={color.inkFaint} name="pin" size={20} />
      <View style={styles.words}>
        <Text numberOfLines={1} style={styles.name}>
          {place.name}
        </Text>
        {place.number === null ? null : <Text style={styles.number}>{`${place.number}동`}</Text>}
      </View>
      {chosen ? <Icon color={color.snuBlue} name="check" size={18} /> : null}
    </Pressable>
  );
}

// The first row of the `event` mode's list, while nothing is searched.
function MapRow({ onPress }: { onPress: () => void }): ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }): StyleProp<ViewStyle> => [styles.mapRow, pressed && styles.pressed]}
    >
      <View style={styles.mapRound}>
        <Icon color={color.private} name="map" size={20} />
      </View>
      <Text style={styles.mapWords}>지도에서 직접 찍기</Text>
      <Icon color={color.private} name="chevronRight" size={16} />
    </Pressable>
  );
}

function NoMatch({ words, hint, onMap }: { words: string; hint: string; onMap?: () => void }): ReactElement {
  return (
    <View style={styles.none}>
      <View style={styles.noneIcon}>
        <Icon color={color.inkFaint} name="search" size={26} />
      </View>
      <Text style={styles.noneTitle}>{`‘${words}’에 맞는 장소가 없어요`}</Text>
      <Text style={styles.noneHint}>{hint}</Text>
      {onMap === undefined ? null : (
        <Pressable accessibilityRole="button" onPress={onMap} style={styles.mapButton}>
          <Icon color={color.private} name="map" size={18} />
          <Text style={styles.mapButtonWords}>지도에서 직접 찍기</Text>
        </Pressable>
      )}
    </View>
  );
}

// 장소 선택, the `PlacePicker` and `PlacePickerClass` frames: a screen over the one that opened it, with the Places of
// the campus and a search. Android's back closes it.
export function PlacePicker({ mode, picked, onPick, onClose, onMap }: PlacePickerProps): ReactElement {
  const [words, setWords] = useState('');
  const { places, asked, isError, retry } = usePlaces(words);
  const toMap = mode === 'event' ? onMap : undefined;
  useBackToClose(true, onClose);
  let body: ReactElement;
  if (places === undefined) {
    body = isError ? <ErrorState onRetry={retry} /> : <LoadingState />;
  } else if (places.length === 0 && asked !== '') {
    body = <NoMatch hint={NO_MATCH_HINT[mode]} onMap={toMap} words={asked} />;
  } else {
    body = (
      <View accessibilityLabel="장소 목록" style={styles.list}>
        {places.map((place) => (
          <PlaceRow
            chosen={place.id === picked}
            key={place.id}
            onPress={() => {
              onPick(place);
            }}
            place={place}
          />
        ))}
      </View>
    );
  }
  return (
    <View style={StyleSheet.absoluteFill}>
      <FullScreenPanel
        leave={{ kind: 'back', onPress: onClose }}
        title="장소 선택"
        under={
          <View style={styles.search}>
            <SearchField
              clearLabel="검색어 지우기"
              label="장소 검색"
              onChangeText={setWords}
              placeholder="건물 이름, 동 번호"
              value={words}
            />
          </View>
        }
      >
        {toMap === undefined || words.trim() !== '' ? null : <MapRow onPress={toMap} />}
        {body}
      </FullScreenPanel>
    </View>
  );
}

const styles = StyleSheet.create({
  search: {
    paddingTop: space[1],
    paddingBottom: space[3],
    paddingHorizontal: space[4],
    borderBottomWidth: 1,
    borderBottomColor: color.border,
    backgroundColor: color.surface,
  },
  list: { paddingHorizontal: space[4] },
  mapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    minHeight: 64,
    paddingHorizontal: space[4],
    borderBottomWidth: space[2],
    borderBottomColor: color.surfaceSubtle,
  },
  mapRound: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: color.privateSoft,
  },
  mapWords: { flex: 1, fontFamily: font.semiBold, fontSize: 16, lineHeight: 22, color: color.private },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 44,
    marginTop: space[2],
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: color.private,
    borderRadius: radius.md,
    backgroundColor: color.surface,
  },
  mapButtonWords: { fontFamily: font.semiBold, fontSize: 15, lineHeight: 22, color: color.private },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    minHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  pressed: { backgroundColor: color.blue50 },
  words: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'baseline', gap: space[2] },
  name: { flexShrink: 1, fontFamily: font.semiBold, fontSize: 16, lineHeight: 22, color: color.ink },
  number: { fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: color.inkMuted },
  none: { alignItems: 'center', gap: space[3], paddingTop: 72, paddingHorizontal: space[8] },
  noneIcon: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: color.surfaceSubtle,
  },
  noneTitle: { fontFamily: font.semiBold, fontSize: 17, lineHeight: 24, textAlign: 'center', color: color.ink },
  noneHint: { ...text.label, fontFamily: font.regular, textAlign: 'center', color: color.inkMuted },
});
