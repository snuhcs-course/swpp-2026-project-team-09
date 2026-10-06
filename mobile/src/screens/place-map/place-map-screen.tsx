import { router } from 'expo-router';
import { type ReactElement, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { LatLng } from '@/api/types';
import { color, font, Icon, radius, shadow, space } from '@/design-system';
import { useInsets } from '@/design-system/insets';
import { givePlace } from '@/features/places/picked-place';
import { type PlaceAtView, usePlaceAt } from '@/features/places/use-place-at';
import { CAMPUS_BOUNDS, Map, MAX_ZOOM, MIN_ZOOM } from '@/map';

// The floating back button and the pill over the map.
function Header(): ReactElement {
  const { top } = useInsets();
  return (
    <View style={[styles.header, { top: top + space[2] }]}>
      <Pressable accessibilityLabel="뒤로" accessibilityRole="button" onPress={router.back} style={styles.back}>
        <Icon color={color.ink} name="chevronLeft" size={22} />
      </Pressable>
      <View style={styles.pill}>
        <Icon color={color.private} name="route" size={18} />
        <Text style={styles.pillWords}>지도를 움직여 핀에 맞추기</Text>
      </View>
    </View>
  );
}

// The sheet: what is under the pin, and `이 위치로 정하기`, which gives it back.
function Sheet({ at }: { at: PlaceAtView | undefined }): ReactElement {
  const { bottom } = useInsets();
  return (
    <View style={[styles.sheet, { paddingBottom: space[6] + bottom }]}>
      <View style={styles.spot}>
        <View style={styles.round}>
          <Icon color={color.private} name="pin" size={20} />
        </View>
        <View style={styles.spotWords}>
          <Text style={styles.spotName}>{at?.words ?? ''}</Text>
          <Text style={styles.spotHint}>{at?.hint ?? ''}</Text>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: at === undefined }}
        disabled={at === undefined}
        onPress={() => {
          if (at !== undefined) {
            givePlace(at.choice);
            router.back();
          }
        }}
        style={[styles.choose, at === undefined && styles.chooseOff]}
      >
        <Text style={styles.chooseWords}>이 위치로 정하기</Text>
      </Pressable>
    </View>
  );
}

// The map view of the place picker, the frame's `PlacePickerMap`: the map moves under a pin fixed at the middle, which
// lifts while it moves, and the sheet says what is under it once the camera stops. Its choice goes back to the screen
// that opened it.
export function PlaceMapScreen(): ReactElement {
  const [point, setPoint] = useState<LatLng | null>(null);
  const [moving, setMoving] = useState(false);
  const at = usePlaceAt(point);
  return (
    <View style={styles.screen}>
      <View
        onTouchStart={() => {
          setMoving(true);
        }}
        style={styles.screen}
      >
        <Map
          avatars={[]}
          bounds={CAMPUS_BOUNDS}
          markers={[]}
          maxZoom={MAX_ZOOM}
          minZoom={MIN_ZOOM}
          onCameraIdle={({ centre }) => {
            setPoint(centre);
            setMoving(false);
          }}
          lines={[]}
        />
      </View>
      <View style={styles.pinLayer}>
        <View style={[styles.pin, moving && styles.lifted]}>
          <Icon color={color.private} name="pin" size={44} />
        </View>
      </View>
      <Header />
      <Sheet at={at} />
    </View>
  );
}

const BACK = 44;
const ROUND = 40;
const LIFT = -12;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surfaceSubtle },
  pinLayer: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' },
  // The pin's tip stands on the middle of the map.
  pin: { marginBottom: 44 },
  lifted: { transform: [{ translateY: LIFT }] },
  header: {
    position: 'absolute',
    left: space[4],
    right: space[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
  back: {
    alignItems: 'center',
    justifyContent: 'center',
    width: BACK,
    height: BACK,
    borderRadius: radius.full,
    backgroundColor: color.surface,
    boxShadow: shadow.float,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    height: BACK,
    paddingHorizontal: space[4],
    borderRadius: radius.full,
    backgroundColor: color.surface,
    boxShadow: shadow.float,
  },
  pillWords: { fontFamily: font.semiBold, fontSize: 14, lineHeight: 20, color: color.ink },
  sheet: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    gap: 14,
    paddingTop: space[5],
    paddingHorizontal: space[5],
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: color.surface,
    boxShadow: shadow.sheet,
  },
  spot: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  round: {
    alignItems: 'center',
    justifyContent: 'center',
    width: ROUND,
    height: ROUND,
    borderRadius: radius.full,
    backgroundColor: color.privateSoft,
  },
  spotWords: { flex: 1, minWidth: 0 },
  spotName: { fontFamily: font.semiBold, fontSize: 17, lineHeight: 24, color: color.ink },
  spotHint: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: color.inkMuted },
  choose: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 14,
    backgroundColor: color.private,
  },
  chooseOff: { opacity: 0.5 },
  chooseWords: { fontFamily: font.bold, fontSize: 16, lineHeight: 24, color: color.onPrimary },
});
