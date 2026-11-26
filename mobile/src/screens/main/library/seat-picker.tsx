/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { LibrarySpace } from '@/api/assistant-types';
import { Button, color, font, Icon, type IconName, radius, space, text } from '@/design-system';
import { bookingTitle } from '@/features/assistant/booking-scene';
import { SEAT_BOX, freeSeatCount } from '@/library/cards/seats';
import {
  digitsThatFit,
  LAYOUT_ZOOM,
  PICTURE_HEIGHT,
  type Point,
  pictureSize,
  type Size,
  ZOOM_MOST,
} from '@/library/cards/seat-zoom';
import type { LibrarySeat } from '@/library/replies';
import { CHOSEN_LOOK, ChosenTag, SEAT_LOOK, SeatMap } from './seat-map';
import { type SeatZoom, useSeatZoom } from './use-seat-zoom';

// The room's seat picture, large (P15 ticket 57; the look of `GestureAskSeats` and `MainChatLibSeats`): the site's
// `area_<sector>.png` with every seat drawn with its number once it fits whole, which two fingers or 확대 and 축소 zoom
// and which scrolls both ways. A press on a free seat picks it and turns that seat alone the key colour, with a tag
// naming it; a press on another moves the pick. "<n>번 선택" at the foot, shown once a seat is picked, hands the seat
// on; ✕ hands nothing on. 확대 and 축소 keep the middle of the view in the middle, or bring the picked seat there, and a
// pinch keeps the point between the fingers where it is (P01 ticket 01 of Iteration 5). The picture is one layer laid
// out at the most zoom, which the gestures move and scale on the UI thread (P01 ticket 11).

interface SeatPickerProps {
  space: LibrarySpace;
  seats: readonly LibrarySeat[];
  visible: boolean;
  onClose: () => void;
  // "<n>번 선택"; null when no seat can be booked now, and then no seat is a button.
  onSeat: ((seat: LibrarySeat) => void) | null;
  // The seat the card offers now, marked until another is picked.
  current?: string | null;
}

function ZoomButton({ icon, name, onPress, disabled }: ZoomButtonProps): ReactElement {
  return (
    <Pressable
      accessibilityLabel={name}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={4}
      onPress={onPress}
      style={[styles.zoom, disabled && styles.zoomOff]}
    >
      <Icon color={disabled ? color.inkSubtle : color.snuBlue} name={icon} size={20} />
    </Pressable>
  );
}

interface ZoomButtonProps {
  icon: IconName;
  name: string;
  onPress: () => void;
  disabled: boolean;
}

function Key({ fill, label }: { fill: string; label: string }): ReactElement {
  return (
    <View style={styles.keyItem}>
      <View style={[styles.keySwatch, { backgroundColor: fill }]} />
      <Text style={styles.keyLabel}>{label}</Text>
    </View>
  );
}

// The colours' key, and 축소 and 확대.
function Tools({ zoom, step }: Pick<SeatZoom, 'zoom' | 'step'>): ReactElement {
  return (
    <View style={styles.tools}>
      <Key fill={SEAT_LOOK.free.fill} label={SEAT_LOOK.free.label} />
      <Key fill={SEAT_LOOK.taken.fill} label={SEAT_LOOK.taken.label} />
      <Key fill={CHOSEN_LOOK.fill} label={CHOSEN_LOOK.label} />
      <View style={styles.spring} />
      <ZoomButton
        disabled={zoom <= 1}
        icon="minus"
        name="축소"
        onPress={() => {
          step(-1);
        }}
      />
      <ZoomButton
        disabled={zoom >= ZOOM_MOST}
        icon="plus"
        name="확대"
        onPress={() => {
          step(1);
        }}
      />
    </View>
  );
}

// The picked seat's middle, in the picture's points at `zoom`.
function seatMiddle(seat: LibrarySeat, image: Size, zoom: number): Point {
  const scale = pictureSize(image, zoom).width / image.width;
  return { x: (seat.POSX + SEAT_BOX.width / 2) * scale, y: (seat.POSY + SEAT_BOX.height / 2) * scale };
}

type PictureProps = SeatPickerProps & { chosen: LibrarySeat | null; pick: (seat: LibrarySeat) => void };

function Picture(props: PictureProps): ReactElement {
  const { space: shown, seats, onSeat, chosen, pick } = props;
  const image = shown.mapImage;
  const zoomed = useSeatZoom(image, (zoom) =>
    chosen === null || image === null ? null : seatMiddle(chosen, image, zoom),
  );
  const width = image === null ? 0 : pictureSize(image, LAYOUT_ZOOM).width;
  const digits = image === null ? 0 : digitsThatFit(image, zoomed.zoom);
  const marked = chosen?.VNAME ?? props.current ?? null;
  return (
    <>
      <GestureDetector gesture={zoomed.gesture}>
        <View collapsable={false} style={styles.box} testID="seat-picker-box">
          <View
            onLayout={({ nativeEvent: { layout } }) => {
              zoomed.laidOut({ width: layout.width, height: layout.height });
            }}
            style={styles.view}
            testID="seat-picker-view"
          >
            <Animated.View style={[styles.layer, zoomed.style]} testID="seat-picker-layer">
              <SeatMap
                chosen={marked}
                digits={digits}
                onSeat={onSeat === null ? null : pick}
                seats={seats}
                space={shown}
                testID="seat-map-large-map"
                width={width}
              />
              <ChosenTag
                chosen={marked}
                digits={digits}
                grow={LAYOUT_ZOOM / zoomed.zoom}
                seats={seats}
                space={shown}
                width={width}
              />
            </Animated.View>
          </View>
        </View>
      </GestureDetector>
      <Tools step={zoomed.step} zoom={zoomed.zoom} />
    </>
  );
}

function Head({ space: shown, seats, onClose }: Pick<SeatPickerProps, 'space' | 'seats' | 'onClose'>): ReactElement {
  return (
    <View style={styles.head}>
      <View style={styles.headWords}>
        <Text accessibilityRole="header" style={styles.title}>
          {`${bookingTitle(shown)} 좌석 현황`}
        </Text>
        <Text style={styles.sub}>{`빈 자리 ${String(freeSeatCount(seats))}석 / ${String(seats.length)}석`}</Text>
      </View>
      {/* A card over the map closes by ✕ at its top right, and by Android's back (P04 ticket 53). */}
      <Pressable accessibilityLabel="좌석 현황 닫기" accessibilityRole="button" onPress={onClose} style={styles.close}>
        <Icon color={color.inkMuted} name="x" size={20} />
      </Pressable>
    </View>
  );
}

export function SeatPicker(props: SeatPickerProps): ReactElement {
  const { visible, onClose, onSeat } = props;
  const { top, bottom } = useSafeAreaInsets();
  const [chosen, setChosen] = useState<LibrarySeat | null>(null);
  const close = (): void => {
    setChosen(null);
    onClose();
  };
  return (
    <Modal animationType="fade" onRequestClose={close} statusBarTranslucent transparent visible={visible}>
      <GestureHandlerRootView style={[styles.ground, { paddingTop: top + space[4], paddingBottom: bottom + space[4] }]}>
        <View style={styles.sheet} testID="seat-map-large">
          <Head {...props} onClose={close} />
          <Picture {...props} chosen={chosen} pick={setChosen} />
          <Text style={styles.hint}>밀어서 옮기고, 두 손가락으로 확대해요</Text>
          {chosen === null || onSeat === null ? null : (
            <Button
              full
              onPress={() => {
                setChosen(null);
                onSeat(chosen);
              }}
              size="lg"
            >
              {`${chosen.VNAME}번 선택`}
            </Button>
          )}
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  ground: { flex: 1, justifyContent: 'center', paddingHorizontal: space[3], backgroundColor: 'rgba(14, 19, 48, 0.55)' },
  sheet: { gap: 10, padding: 14, borderRadius: 20, backgroundColor: color.surface },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: space[2] },
  headWords: { flex: 1, minWidth: 0 },
  title: { fontFamily: font.bold, fontSize: 17, lineHeight: 24, color: color.ink },
  sub: { fontFamily: font.medium, fontSize: 13, lineHeight: 18, color: color.inkMuted },
  close: { alignItems: 'center', justifyContent: 'center', width: 44, height: 44, marginTop: -10, marginRight: -10 },
  box: {
    height: PICTURE_HEIGHT,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: 12,
    backgroundColor: color.surfaceSunken,
  },
  view: { flex: 1, overflow: 'hidden' },
  // Scaled from its top left, so that its offsets are the picture's at the zoom seen.
  layer: { position: 'absolute', top: 0, left: 0, transformOrigin: 'left top' },
  tools: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  keyItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  keySwatch: { width: 12, height: 12, borderRadius: 3, borderWidth: 1, borderColor: color.border },
  keyLabel: { fontFamily: font.semiBold, fontSize: 12, lineHeight: 16, color: color.inkMuted },
  spring: { flex: 1 },
  zoom: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderWidth: 1,
    borderColor: color.borderStrong,
    borderRadius: radius.full,
    backgroundColor: color.surface,
  },
  zoomOff: { borderColor: color.border },
  hint: { ...text.caption, color: color.inkMuted, textAlign: 'center' },
});
