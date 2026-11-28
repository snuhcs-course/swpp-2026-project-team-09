/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { type ReactElement, type ReactNode, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomSheet, color, font, Icon, radius, space } from '@/design-system';
import type { PointOnMap } from '@/features/places/point-on-map';
import { CAMPUS_CAMERA, Map, type MapHandle, type MarkerLook, useMarkerImages } from '@/map';

// A place picked on the map, shown where a 파티 is (P06 ticket 27): a small map with the 파티's pin at the point, and
// its words under it.

const ZOOM = 17;
// The 파티's pin, as the main map draws a 파티's place.
const PIN_LOOK: readonly MarkerLook[] = [{ kind: 'party', form: 'pin' }];
const MAP_HEIGHT = 220;
const ROUND = 40;

function PinMap({ point }: { point: PointOnMap }): ReactElement {
  const [image] = useMarkerImages(PIN_LOOK);
  const map = useRef<MapHandle>(null);
  const opened = useRef(false);
  const markers =
    image === undefined
      ? []
      : [{ id: 'place', name: `장소 · ${point.label}`, position: point.position, image, passive: true }];
  return (
    <View style={styles.map}>
      <Map
        avatars={[]}
        {...CAMPUS_CAMERA}
        lines={[]}
        markers={markers}
        onCameraIdle={() => {
          if (!opened.current) {
            opened.current = true;
            map.current?.moveCamera({ centre: point.position, zoom: ZOOM });
          }
        }}
        ref={map}
      />
    </View>
  );
}

function PlaceOnMapSheet({ point, onClose }: { point: PointOnMap | null; onClose: () => void }): ReactElement {
  return (
    <BottomSheet label="장소" onClose={onClose} open={point !== null}>
      {point === null ? null : (
        <View style={styles.body}>
          <PinMap point={point} />
          <View style={styles.spot}>
            <View style={styles.round}>
              <Icon color={color.party} name="pin" size={20} />
            </View>
            <Text style={styles.words}>{point.label}</Text>
          </View>
        </View>
      )}
    </BottomSheet>
  );
}

// The sheet, and what opens it.
export function usePlaceOnMap(): { open: (point: PointOnMap) => void; sheet: ReactElement } {
  const [point, setPoint] = useState<PointOnMap | null>(null);
  return {
    open: setPoint,
    sheet: (
      <PlaceOnMapSheet
        onClose={() => {
          setPoint(null);
        }}
        point={point}
      />
    ),
  };
}

interface PlaceWordsProps {
  point: PointOnMap | null;
  onOpen: (point: PointOnMap) => void;
  // The place's line, in blue when it opens the map, as the 행사 line that opens its sheet is.
  children: (link: boolean) => ReactNode;
}

// The place's words where a 파티 is shown: for a place picked on the map, a blue line with › whose press opens the
// map, as the room's 행사 line opens its sheet; words typed or a Place of the list stay as they are.
export function PlaceWords({ point, onOpen, children }: PlaceWordsProps): ReactElement {
  if (point === null) {
    return <>{children(false)}</>;
  }
  return (
    <Pressable
      accessibilityHint="지도에서 보기"
      accessibilityLabel={point.label}
      accessibilityRole="button"
      hitSlop={{ top: space[2], bottom: space[2] }}
      onPress={() => {
        onOpen(point);
      }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.grow}>{children(true)}</View>
      <Icon color={color.blue600} name="chevronRight" size={16} testID="place-chevron" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: { gap: space[3], paddingHorizontal: space[5] },
  map: { height: MAP_HEIGHT, overflow: 'hidden', borderRadius: radius.lg, backgroundColor: color.surfaceSubtle },
  spot: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  round: {
    alignItems: 'center',
    justifyContent: 'center',
    width: ROUND,
    height: ROUND,
    borderRadius: radius.full,
    backgroundColor: color.partySoft,
  },
  words: { flex: 1, fontFamily: font.semiBold, fontSize: 15, lineHeight: 22, color: color.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  grow: { flex: 1 },
  pressed: { opacity: 0.6 },
});
