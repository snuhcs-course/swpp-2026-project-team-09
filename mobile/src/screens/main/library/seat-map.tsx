/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { LibrarySpace } from '@/api/assistant-types';
import { color, font, radius, space } from '@/design-system';
import { type SeatBox, seatBoxes, type SeatState } from '@/library/cards/seats';
import type { LibrarySeat } from '@/library/replies';
import { seatMapUrl } from '@/library/site';

// The site's seat map of a reading room's sector (the MainChatLibSeats frame): its `area_<sector>.png` with each seat
// a box at its POSX, POSY, scaled to the width it is drawn at. Free seats are orange and can be tapped; taken seats are
// pale; an accessible seat (STATUS 9) is grey and is not booked online. Small in the chat, large on a tap
// (`seat-picker.tsx`); the large view draws each seat's number, so that the User can pick the seat they know, and the
// seat picked there in the key colour.

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

// The smallest number the map draws, in points.
export const SEAT_NUMBER_MIN = 8;

// A seat number's font size: no taller than its box and no smaller than SEAT_NUMBER_MIN, and narrow enough for the
// number to fit the box's width while that stays above the floor (a digit is about 0.6 of the font size wide).
export function seatNumberSize(box: Pick<SeatBox, 'width' | 'height'>, label: string): number {
  const fits = Math.min(box.height, box.width / (0.6 * Math.max(label.length, 1)));
  return Math.max(SEAT_NUMBER_MIN, fits);
}

// The seat's number, centred in its box in dark ink. It is no accessible element of its own: the seat's label names it.
function SeatNumber({ box, chosen }: { box: SeatBox; chosen: boolean }): ReactElement {
  const size = seatNumberSize(box, box.seat.VNAME);
  return (
    <Text
      accessibilityElementsHidden
      accessible={false}
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

export function SeatMap(props: SeatMapProps): ReactElement | null {
  const { space: shown, seats, width, onSeat, testID, under, numbered = false, chosen = null } = props;
  const image = shown.mapImage;
  if (image === null || width <= 0) {
    return null;
  }
  const height = (width * image.height) / image.width;
  return (
    <View style={{ width, height }} testID={testID}>
      <Image
        accessibilityIgnoresInvertColors
        source={{ uri: seatMapUrl(shown.sectorNo) }}
        style={{ width, height }}
        testID={`${testID}-image`}
      />
      {under}
      {seatBoxes(seats, image.width, width).map((box) => (
        <Seat box={box} chosen={box.seat.VNAME === chosen} key={box.seat.SEATNO} numbered={numbered} onSeat={onSeat} />
      ))}
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
