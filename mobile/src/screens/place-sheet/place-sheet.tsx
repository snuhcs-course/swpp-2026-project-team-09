/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 * 2026-11-28  Opus 5.5   prompted by TaeHyun79
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement, ReactNode } from 'react';
import { Pressable, type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import type { Place } from '@/api/types';
import {
  BottomSheet,
  Button,
  color,
  font,
  Icon,
  type IconName,
  radius,
  SearchField,
  SheetScroll,
  SheetTitle,
  space,
} from '@/design-system';
import { usePlaceSearch } from '@/features/places/use-place-search';
import { type Help, HelpButton } from '../help-bubble';
import { KindTag, PLACE_KIND_WORDS, usePlaceKind } from './place-kind';
import { type PlaceChoice, placeOfChoice, type PlaceSheetState } from './use-place-sheet';

const TYPED_LINE = '지도에 없거나 더 구체적인 곳(카페, 301동 203호 등)';

// The ? beside 장소: the three kinds of a place, in the tags the form shows (reviewed on 2026-11-28).
const PLACE_HELP: Help = {
  title: '장소 종류',
  lines: [
    { tag: PLACE_KIND_WORDS.building, words: '학교 건물에서 만날 때. 지도에서 찍어도 돼요' },
    { tag: PLACE_KIND_WORDS.point, words: '건물이 아닌 곳에서 만날 때 (정문, 잔디밭 등)' },
    // Broken before the examples, as the wireframe does, so that '등)' never stands alone.
    { tag: PLACE_KIND_WORDS.words, words: '지도에 없거나 더 구체적인 곳\n(카페, 301동 203호 등)' },
  ],
  note: '이름만은 지도·도보 시간·도착 알림에 쓰이지 않아요',
};

// "제1공학관 301동", as the map view names a Place.
export function placeWords({ name, number }: Place): string {
  return number === null ? name : `${name} ${number}동`;
}

// The buildings found for the words, none before anything is typed.
function useFound(words: string): Place[] {
  const { asked, found } = usePlaceSearch(words);
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

interface RowProps {
  label: string;
  chosen: boolean;
  onPress: () => void;
  // Before the words: the building's number, or an icon.
  lead: ReactNode;
  children: ReactNode;
  // At the right of a row not chosen, as 지도에서 직접 고르기's ›.
  end?: ReactNode;
}

// A row of the sheet. The one chosen is light blue with a ✓, and only 이 장소로 정하기 sets it.
function Row({ label, chosen, onPress, lead, children, end }: RowProps): ReactElement {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected: chosen }}
      onPress={onPress}
      style={({ pressed }): StyleProp<ViewStyle> => [styles.row, (chosen || pressed) && styles.chosen]}
    >
      {lead}
      <View style={styles.rowWords}>{children}</View>
      {chosen ? <Icon color={color.snuBlue} name="check" size={18} /> : end}
    </Pressable>
  );
}

function RowIcon({ name, color: tint }: { name: IconName; color: string }): ReactElement {
  return (
    <View style={styles.lead}>
      <Icon color={tint} name={name} size={name === 'pencil' ? 16 : 18} />
    </View>
  );
}

function chosenFromList(choice: PlaceChoice | null, place: Place): boolean {
  return choice?.kind === 'picked' && choice.from === 'list' && choice.place.placeId === place.id;
}

interface RowsProps {
  sheet: PlaceSheetState;
  // The search's words, trimmed.
  typed: string;
}

// The buildings found, each with its number.
function BuildingRows({ sheet, typed, found }: RowsProps & { found: readonly Place[] }): ReactElement {
  return (
    <View accessibilityLabel="장소 목록" style={styles.list}>
      {found.map((place) => (
        <Row
          chosen={chosenFromList(sheet.choice, place)}
          key={place.id}
          label={placeWords(place)}
          lead={
            place.number === null ? null : (
              <View style={styles.number}>
                <Text style={styles.numberWords}>{place.number}</Text>
              </View>
            )
          }
          onPress={() => {
            const position = { latitude: place.latitude, longitude: place.longitude };
            sheet.onChoose({
              kind: 'picked',
              place: { placeId: place.id, position, words: placeWords(place) },
              from: 'list',
            });
          }}
        >
          <Named name={place.name} words={typed} />
        </Row>
      ))}
    </View>
  );
}

// 지도에서 직접 고르기, which shows the place picked there once chosen, and 이름만 쓰기 once words are typed.
function OtherRows({ sheet, typed }: RowsProps): ReactElement {
  const { choice } = sheet;
  const fromMap = choice?.kind === 'picked' && choice.from === 'map' ? choice.place : null;
  return (
    <View style={styles.list}>
      <Row
        chosen={fromMap !== null}
        end={<Icon color={color.inkSubtle} name="chevronRight" size={16} />}
        label={fromMap === null ? '지도에서 직접 고르기' : `${fromMap.words} · 지도에서 고른 위치 · 다시 고르기`}
        lead={<RowIcon color={color.snuBlue} name="map" />}
        onPress={sheet.onMap}
      >
        <Text numberOfLines={1} style={styles.mapWords}>
          {fromMap?.words ?? '지도에서 직접 고르기'}
        </Text>
        {fromMap === null ? null : <Text style={styles.sub}>지도에서 고른 위치 · 다시 고르기</Text>}
      </Row>
      {typed === '' ? null : (
        <Row
          chosen={choice?.kind === 'typed' && choice.words === typed}
          label={`‘${typed}’ 이름만 쓰기`}
          lead={<RowIcon color={color.inkMuted} name="pencil" />}
          onPress={() => {
            sheet.onChoose({ kind: 'typed', words: typed });
          }}
        >
          <Text numberOfLines={1} style={styles.typed}>{`‘${typed}’ 이름만 쓰기`}</Text>
          <Text style={styles.sub}>{TYPED_LINE}</Text>
        </Row>
      )}
    </View>
  );
}

// "선택 · 302동 제2공학관 · [학교 건물]", right above the button.
function ChoiceLine({ choice }: { choice: PlaceChoice }): ReactElement {
  const { words, picked } = placeOfChoice(choice);
  const kind = usePlaceKind(words, picked);
  return (
    <View style={styles.choice} testID="place-choice">
      <Text style={styles.choiceLabel}>선택</Text>
      <Text numberOfLines={1} style={styles.choiceWords}>
        {words}
      </Text>
      {kind === null ? null : <KindTag kind={kind} />}
    </View>
  );
}

// 장소, the place sheet of the 파티 form and of the room's 일정 form (reviewed on 2026-11-28): the ? of the kinds, the
// search, the buildings found and the two other ways, the row chosen named above 이 장소로 정하기, which alone sets it.
export function PlaceSheet({ sheet }: { sheet: PlaceSheetState }): ReactElement {
  const typed = sheet.search.trim();
  const found = useFound(sheet.search);
  return (
    <BottomSheet
      head={
        <View style={styles.headBlock}>
          <View style={styles.head}>
            <SheetTitle>장소</SheetTitle>
            <HelpButton help={PLACE_HELP} size={18} />
          </View>
          <SearchField
            clearLabel="검색어 지우기"
            label="장소 검색"
            onChangeText={sheet.onSearch}
            placeholder="건물 이름, 동 번호"
            value={sheet.search}
          />
        </View>
      }
      label="장소"
      onClose={sheet.onClose}
      open={sheet.open}
    >
      <View style={styles.body}>
        <SheetScroll keyboardShouldPersistTaps="handled" style={styles.scroll}>
          <View style={styles.lists}>
            {found.length === 0 ? null : <BuildingRows found={found} sheet={sheet} typed={typed} />}
            <OtherRows sheet={sheet} typed={typed} />
          </View>
        </SheetScroll>
        {sheet.choice === null ? null : <ChoiceLine choice={sheet.choice} />}
        <Button disabled={sheet.choice === null} full onPress={sheet.onConfirm} size="lg">
          이 장소로 정하기
        </Button>
      </View>
    </BottomSheet>
  );
}

const LEAD = 34;

const styles = StyleSheet.create({
  body: { flexShrink: 1, gap: space[3], paddingHorizontal: space[5] },
  headBlock: { gap: space[3] },
  head: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  scroll: { flexShrink: 1 },
  lists: { gap: space[3] },
  list: { overflow: 'hidden', borderWidth: 1, borderColor: color.border, borderRadius: radius.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    minHeight: 48,
    paddingVertical: space[2],
    paddingHorizontal: space[3],
    borderBottomWidth: 1,
    borderBottomColor: color.border,
    marginBottom: -1,
  },
  chosen: { backgroundColor: color.blue50 },
  lead: { width: LEAD, alignItems: 'center' },
  number: {
    minWidth: LEAD,
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: color.blue50,
  },
  numberWords: { fontFamily: font.bold, fontSize: 12, lineHeight: 16, color: color.snuBlue },
  rowWords: { flex: 1, minWidth: 0 },
  name: { flexShrink: 1, fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: color.ink },
  matched: { fontFamily: font.bold, color: color.snuBlue },
  mapWords: { fontFamily: font.semiBold, fontSize: 15, lineHeight: 22, color: color.snuBlue },
  typed: { fontFamily: font.medium, fontSize: 15, lineHeight: 22, color: color.ink },
  sub: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, color: color.inkMuted },
  choice: { flexDirection: 'row', alignItems: 'center', gap: space[2], minHeight: 24 },
  choiceLabel: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, color: color.inkSubtle },
  choiceWords: { flex: 1, minWidth: 0, fontFamily: font.bold, fontSize: 15, lineHeight: 22, color: color.ink },
});
