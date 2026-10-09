/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-09  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { router } from 'expo-router';
import { type ReactElement, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { LatLng } from '@/api/types';
import { color, font, Icon, radius, shadow, space } from '@/design-system';
import { useInsets } from '@/design-system/insets';
import { givePlace } from '@/features/places/picked-place';
import { type PlaceAtView, usePlaceAt } from '@/features/places/use-place-at';
import { CAMPUS_BOUNDS, CAMPUS_CAMERA, isInside, Map, type MapHandle } from '@/map';
import { usePosition } from '@/position';

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
// lifts while it moves, and the sheet says what is under it once the camera stops. It opens on the User's position when
// known, else on the campus. The camera may move past the on-campus rectangle, but a point outside it is not a pick:
// the sheet is empty and `이 위치로 정하기` is off. Its choice goes back to the screen that opened it.
export function PlaceMapScreen(): ReactElement {
  const [point, setPoint] = useState<LatLng | null>(null);
  const [moving, setMoving] = useState(false);
  const at = usePlaceAt(point);
  const { position } = usePosition();
  const map = useRef<MapHandle>(null);
  const opened = useRef(false);
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
          {...CAMPUS_CAMERA}
          markers={[]}
          onCameraIdle={({ centre }) => {
            if (!opened.current) {
              opened.current = true;
              if (position !== null && isInside(position, CAMPUS_BOUNDS)) {
                map.current?.moveCamera({ centre: position, zoom: OPENING_ZOOM });
                return;
              }
            }
            setPoint(isInside(centre, CAMPUS_BOUNDS) ? centre : null);
            setMoving(false);
          }}
          lines={[]}
          ref={map}
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

const OPENING_ZOOM = 17;
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
