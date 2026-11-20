/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { LibrarySpace } from '@/api/assistant-types';
import { color, font, radius, space } from '@/design-system';
import { type SeatBox, seatBoxes, seatNumberSize, type SeatState } from '@/library/cards/seats';
import type { LibrarySeat } from '@/library/replies';
import { seatMapUrl } from '@/library/site';

// The site's seat map of a reading room's sector (the MainChatLibSeats frame): its `area_<sector>.png` with each seat
// a box at its POSX, POSY, scaled to the width it is drawn at. Free seats are orange and can be tapped; taken seats are
// pale; an accessible seat (STATUS 9) is grey and is not booked online. Small in the chat, large on a tap
// (`seat-picker.tsx`); the large view draws each seat's number once the whole number fits its box, so that the User can
// pick the seat they know, and the seat picked there in the key colour, with a tag naming it while its own number does
// not fit.

// The site's colours of a seat.
export const SEAT_LOOK: Record<SeatState, { fill: string; label: string }> = {
  free: { fill: '#F89200', label: '빈 자리' },
  taken: { fill: '#F3F0E6', label: '사용 중' },
  accessible: { fill: '#E0E0D2', label: '장애인석' },
};

// The seat picked in the large view (P15 ticket 57).
export const CHOSEN_LOOK = { fill: color.snuBlue, label: '고른 자리' };

interface SeatMapProps {
  space: LibrarySpace;
  seats: readonly LibrarySeat[];
  // The width the map is drawn at.
  width: number;
  // A tap on a free seat; null when no seat can be booked now.
  onSeat: ((seat: LibrarySeat) => void) | null;
  testID: string;
  // What lies over the image and under the seats.
  under?: ReactElement;
  // Each seat draws its number (VNAME).
  numbered?: boolean;
  // The VNAME of the seat picked, drawn in the key colour.
  chosen?: string | null;
}

// The seat's number, centred in its box in dark ink, or nothing while the whole number does not fit. It is no
// accessible element of its own: the seat's label names it.
function SeatNumber({ box, chosen }: { box: SeatBox; chosen: boolean }): ReactElement | null {
  const size = seatNumberSize(box, box.seat.VNAME);
  if (size === null) {
    return null;
  }
  return (
    <Text
      accessibilityElementsHidden
      accessible={false}
      adjustsFontSizeToFit
      allowFontScaling={false}
      importantForAccessibility="no-hide-descendants"
      numberOfLines={1}
      style={[styles.number, { fontSize: size, lineHeight: size }, chosen && styles.chosenNumber]}
      testID={`seat-number-${box.seat.VNAME}`}
    >
      {box.seat.VNAME}
    </Text>
  );
}

function Seat({
  box,
  onSeat,
  numbered,
  chosen,
}: {
  box: SeatBox;
  onSeat: ((seat: LibrarySeat) => void) | null;
  numbered: boolean;
  chosen: boolean;
}): ReactElement {
  const place = { left: box.left, top: box.top, width: box.width, height: box.height };
  const look = chosen ? CHOSEN_LOOK : SEAT_LOOK[box.state];
  const label = `${box.seat.VNAME}번 ${look.label}`;
  const number = numbered ? <SeatNumber box={box} chosen={chosen} /> : null;
  if (box.state !== 'free' || onSeat === null) {
    return (
      <View
        accessibilityLabel={label}
        style={[styles.seat, place, { backgroundColor: SEAT_LOOK[box.state].fill }]}
        testID={`seat-${box.seat.VNAME}`}
      >
        {number}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected: chosen }}
      onPress={() => {
        onSeat(box.seat);
      }}
      style={[styles.seat, place, { backgroundColor: look.fill }]}
      testID={`seat-${box.seat.VNAME}`}
    >
      {number}
    </Pressable>
  );
}

const TAG_HEIGHT = 20;
const TAG_GAP = 3;
const TAG_FONT = 12;
const TAG_SIDE = 6;

// The tag over the picked seat while the seat's own number does not fit its box: its whole number in the key colour,
// above the seat or, near the picture's top, below it, kept inside the picture's width. Once the number fits, the seat
// shows it itself and the tag would only cover the seat above. It takes no touch, and the seat's own label names it to
// a screen reader.
function SeatTag({ box, mapWidth }: { box: SeatBox; mapWidth: number }): ReactElement {
  const label = box.seat.VNAME;
  const width = label.length * 0.7 * TAG_FONT + 2 * TAG_SIDE;
  const above = box.top - TAG_GAP - TAG_HEIGHT;
  const top = above >= 0 ? above : box.top + box.height + TAG_GAP;
  const left = Math.min(Math.max(box.left + box.width / 2 - width / 2, 0), Math.max(mapWidth - width, 0));
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[styles.tag, { top, left, minWidth: width }]}
      testID="seat-tag"
    >
      <Text allowFontScaling={false} numberOfLines={1} style={styles.tagLabel}>
        {label}
      </Text>
    </View>
  );
}

export function SeatMap(props: SeatMapProps): ReactElement | null {
  const { space: shown, seats, width, onSeat, testID, under, numbered = false, chosen = null } = props;
  const image = shown.mapImage;
  if (image === null || width <= 0) {
    return null;
  }
  const height = (width * image.height) / image.width;
  const boxes = seatBoxes(seats, image.width, width);
  const tagged = numbered ? boxes.find((box) => box.seat.VNAME === chosen) : undefined;
  const tag = tagged !== undefined && seatNumberSize(tagged, tagged.seat.VNAME) === null ? tagged : undefined;
  return (
    <View style={{ width, height }} testID={testID}>
      <Image
        accessibilityIgnoresInvertColors
        source={{ uri: seatMapUrl(shown.sectorNo) }}
        style={{ width, height }}
        testID={`${testID}-image`}
      />
      {under}
      {boxes.map((box) => (
        <Seat box={box} chosen={box.seat.VNAME === chosen} key={box.seat.SEATNO} numbered={numbered} onSeat={onSeat} />
      ))}
      {tag === undefined ? null : <SeatTag box={tag} mapWidth={width} />}
    </View>
  );
}

// The small map in the chat: a tap on the map, not on a free seat, opens the large view. The tap area lies under the
// seats, beside them, so that each free seat stays a button of its own.
export function SmallSeatMap(props: Omit<SeatMapProps, 'testID' | 'numbered'> & { onOpen: () => void }): ReactElement {
  const { onOpen, ...map } = props;
  return (
    <View style={styles.small}>
      <SeatMap
        {...map}
        testID="seat-map-small"
        under={
          <Pressable
            accessibilityLabel="좌석 현황 크게 보기"
            accessibilityRole="button"
            onPress={onOpen}
            style={StyleSheet.absoluteFill}
          />
        }
      />
      <View pointerEvents="none" style={styles.badge}>
        <Text style={styles.badgeLabel}>크게 보기</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  seat: { position: 'absolute', alignItems: 'center', justifyContent: 'center', borderRadius: 1, overflow: 'visible' },
  // Dark ink, legible on the free orange, the taken pale and the accessible grey.
  number: { fontFamily: font.semiBold, color: color.ink, textAlign: 'center', includeFontPadding: false },
  chosenNumber: { color: color.onPrimary },
  tag: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    height: TAG_HEIGHT,
    paddingHorizontal: TAG_SIDE,
    borderRadius: radius.sm,
    backgroundColor: color.snuBlue,
  },
  tagLabel: { fontFamily: font.bold, fontSize: TAG_FONT, lineHeight: 16, color: color.onPrimary },
  small: { position: 'relative', overflow: 'hidden', borderRadius: 10, backgroundColor: color.surface },
  badge: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    height: 22,
    paddingHorizontal: space[2],
    borderRadius: radius.full,
    backgroundColor: 'rgba(14, 19, 48, 0.7)',
  },
  badgeLabel: { fontFamily: font.semiBold, fontSize: 11, lineHeight: 22, color: color.onPrimary },
});
