/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { LibrarySpace } from '@/api/assistant-types';
import { color, font, Icon, radius, space } from '@/design-system';
import { spaceWords } from '@/library/cards/bookings';
import { type SeatBox, seatBoxes, type SeatState } from '@/library/cards/seats';
import type { LibrarySeat } from '@/library/replies';
import { seatMapUrl } from '@/library/site';

// The site's seat map of a reading room's sector (the MainChatLibSeats frame): its `area_<sector>.png` with each seat
// a box at its POSX, POSY, scaled to the width it is drawn at. Free seats are orange and can be tapped; taken seats are
// pale; an accessible seat (STATUS 9) is grey and is not booked online. Small in the chat, large on a tap.

// The site's colours of a seat.
const SEAT_LOOK: Record<SeatState, { fill: string; label: string }> = {
  free: { fill: '#F89200', label: '빈 자리' },
  taken: { fill: '#F3F0E6', label: '사용 중' },
  accessible: { fill: '#E0E0D2', label: '장애인석' },
};

// The large view's height, as the frame draws it.
const LARGE_HEIGHT = 300;

interface SeatMapProps {
  space: LibrarySpace;
  seats: readonly LibrarySeat[];
  // The width the map is drawn at.
  width: number;
  onSeat: (seat: LibrarySeat) => void;
  testID: string;
  // What lies over the image and under the seats.
  under?: ReactElement;
}

function Seat({ box, onSeat }: { box: SeatBox; onSeat: (seat: LibrarySeat) => void }): ReactElement {
  const place = { left: box.left, top: box.top, width: box.width, height: box.height };
  const label = `${box.seat.VNAME}번 ${SEAT_LOOK[box.state].label}`;
  if (box.state !== 'free') {
    return (
      <View
        accessibilityLabel={label}
        style={[styles.seat, place, { backgroundColor: SEAT_LOOK[box.state].fill }]}
        testID={`seat-${box.seat.VNAME}`}
      />
    );
  }
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={() => {
        onSeat(box.seat);
      }}
      style={[styles.seat, place, { backgroundColor: SEAT_LOOK.free.fill }]}
      testID={`seat-${box.seat.VNAME}`}
    />
  );
}

export function SeatMap({ space: shown, seats, width, onSeat, testID, under }: SeatMapProps): ReactElement | null {
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
        <Seat box={box} key={box.seat.SEATNO} onSeat={onSeat} />
      ))}
    </View>
  );
}

interface LargeSeatMapProps {
  space: LibrarySpace;
  seats: readonly LibrarySeat[];
  visible: boolean;
  onClose: () => void;
  onSeat: (seat: LibrarySeat) => void;
}

// The large view: the map 300 high, scrolled sideways, with its title and "옆으로 밀어서 보기".
export function LargeSeatMap({ space: shown, seats, visible, onClose, onSeat }: LargeSeatMapProps): ReactElement {
  const { top, bottom } = useSafeAreaInsets();
  const image = shown.mapImage;
  const width = image === null ? 0 : (LARGE_HEIGHT * image.width) / image.height;
  return (
    <Modal animationType="fade" onRequestClose={onClose} statusBarTranslucent transparent visible={visible}>
      <View style={[styles.large, { paddingTop: top, paddingBottom: bottom }]} testID="seat-map-large">
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>
            {`${spaceWords(shown)} 좌석 현황`}
          </Text>
          <Pressable accessibilityLabel="닫기" accessibilityRole="button" onPress={onClose} style={styles.close}>
            <Icon color={color.onPrimary} name="x" size={22} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.scroll} horizontal testID="seat-map-scroll">
          <View style={styles.mapGround}>
            <SeatMap onSeat={onSeat} seats={seats} space={shown} testID="seat-map-large-map" width={width} />
          </View>
        </ScrollView>
        <Text style={styles.hint}>옆으로 밀어서 보기</Text>
      </View>
    </Modal>
  );
}

// The small map in the chat: a tap on the map, not on a free seat, opens the large view. The tap area lies under the
// seats, beside them, so that each free seat stays a button of its own.
export function SmallSeatMap(props: Omit<SeatMapProps, 'testID'> & { onOpen: () => void }): ReactElement {
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
  seat: { position: 'absolute', borderRadius: 1 },
  large: { flex: 1, backgroundColor: 'rgba(14, 19, 48, 0.92)' },
  header: { flexDirection: 'row', alignItems: 'center', height: 56, paddingRight: space[2], paddingLeft: space[5] },
  title: { flex: 1, fontFamily: font.semiBold, fontSize: 16, lineHeight: 22, color: color.onPrimary },
  close: { alignItems: 'center', justifyContent: 'center', width: 48, height: 48 },
  scroll: { alignItems: 'center', paddingHorizontal: space[4] },
  mapGround: { overflow: 'hidden', borderRadius: 8, backgroundColor: color.surface },
  hint: {
    paddingHorizontal: space[5],
    paddingBottom: space[10],
    textAlign: 'center',
    fontFamily: font.medium,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255, 255, 255, 0.75)',
  },
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
