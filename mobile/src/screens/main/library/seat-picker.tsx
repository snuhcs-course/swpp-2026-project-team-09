/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { type ReactElement, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { LibrarySpace } from '@/api/assistant-types';
import { Button, color, font, Icon, type IconName, radius, space, text } from '@/design-system';
import { spaceWords } from '@/library/cards/bookings';
import { freeSeats } from '@/library/cards/seats';
import type { LibrarySeat } from '@/library/replies';
import { CHOSEN_LOOK, SEAT_LOOK, SeatMap } from './seat-map';

// The room's seat picture, large (P15 ticket 57; the look of `GestureAskSeats` and `MainChatLibSeats`): the site's
// `area_<sector>.png` with every seat drawn with its number, which two fingers or 확대 and 축소 zoom and which scrolls
// both ways. A press on a free seat picks it and turns that seat alone the key colour; a press on another moves the
// pick. "<n>번 선택" at the foot, shown once a seat is picked, hands the seat on; ✕ hands nothing on.

// The picture's height at zoom 1, as the frame draws it, and how far it zooms.
export const PICTURE_HEIGHT = 300;
export const ZOOM_MOST = 4;
// The zooms 확대 and 축소 step through.
const ZOOMS = [1, 1.5, 2, 3, ZOOM_MOST] as const;

export function zoomStepped(zoom: number, by: 1 | -1): number {
  const next = by === 1 ? ZOOMS.find((each) => each > zoom) : ZOOMS.findLast((each) => each < zoom);
  return next ?? zoom;
}

export function zoomWithin(zoom: number): number {
  return Math.min(Math.max(zoom, 1), ZOOM_MOST);
}

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

// The zoom, which a pinch changes from where it began and the buttons step.
function useZoom(): { zoom: number; setZoom: (zoom: number) => void; pinch: ReturnType<typeof Gesture.Pinch> } {
  const [zoom, setZoom] = useState(1);
  const began = useRef(1);
  const pinch = useMemo(
    () =>
      Gesture.Pinch()
        .withTestId('seat-picker-pinch')
        .runOnJS(true)
        .onStart(() => {
          began.current = zoom;
        })
        .onUpdate(({ scale }) => {
          setZoom(zoomWithin(began.current * scale));
        }),
    [zoom],
  );
  return {
    zoom,
    setZoom: (next) => {
      setZoom(zoomWithin(next));
    },
    pinch,
  };
}

// The colours' key, and 축소 and 확대.
function Tools({ zoom, setZoom }: { zoom: number; setZoom: (zoom: number) => void }): ReactElement {
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
          setZoom(zoomStepped(zoom, -1));
        }}
      />
      <ZoomButton
        disabled={zoom >= ZOOM_MOST}
        icon="plus"
        name="확대"
        onPress={() => {
          setZoom(zoomStepped(zoom, 1));
        }}
      />
    </View>
  );
}

function Picture(
  props: SeatPickerProps & { chosen: LibrarySeat | null; pick: (seat: LibrarySeat) => void },
): ReactElement {
  const { space: shown, seats, onSeat, chosen, pick } = props;
  const { zoom, setZoom, pinch } = useZoom();
  const image = shown.mapImage;
  const height = PICTURE_HEIGHT * zoom;
  const width = image === null ? 0 : (height * image.width) / image.height;
  return (
    <>
      <GestureDetector gesture={pinch}>
        <View collapsable={false} style={styles.box} testID="seat-picker-box">
          <ScrollView nestedScrollEnabled testID="seat-picker-scroll-down">
            <ScrollView horizontal nestedScrollEnabled testID="seat-map-scroll">
              <SeatMap
                chosen={chosen?.VNAME ?? props.current ?? null}
                numbered
                onSeat={onSeat === null ? null : pick}
                seats={seats}
                space={shown}
                testID="seat-map-large-map"
                width={width}
              />
            </ScrollView>
          </ScrollView>
        </View>
      </GestureDetector>
      <Tools setZoom={setZoom} zoom={zoom} />
    </>
  );
}

function Head({ space: shown, seats, onClose }: Pick<SeatPickerProps, 'space' | 'seats' | 'onClose'>): ReactElement {
  return (
    <View style={styles.head}>
      <View style={styles.headWords}>
        <Text accessibilityRole="header" style={styles.title}>
          {`${spaceWords(shown)} 좌석 현황`}
        </Text>
        <Text style={styles.sub}>{`빈 자리 ${String(freeSeats(seats).length)}석 / ${String(seats.length)}석`}</Text>
      </View>
      <Pressable accessibilityLabel="닫기" accessibilityRole="button" onPress={onClose} style={styles.close}>
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
