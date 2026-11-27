/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { type ReactElement, type ReactNode, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomSheet, color, font, Icon, radius, space } from '@/design-system';
import type { PointOnMap } from '@/features/places/point-on-map';
import { CAMPUS_CAMERA, Map, type MapHandle, useMarkerImages } from '@/map';

// A place picked on the map, shown where a 파티 is (P06 ticket 27): a small map with the 파티's pin at the point, and
// its words under it.

const ZOOM = 17;
const MAP_HEIGHT = 220;
const ROUND = 40;

function PinMap({ point }: { point: PointOnMap }): ReactElement {
  const [image] = useMarkerImages([{ kind: 'party', form: 'pin' }]);
  const map = useRef<MapHandle>(null);
  const opened = useRef(false);
  const markers =
    image === undefined ? [] : [{ id: 'place', name: `장소 · ${point.label}`, position: point.position, image }];
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
  children: ReactNode;
}

// The place's words where a 파티 is shown: a press opens the map for a place picked on the map, and words typed or a
// Place of the list stay as they are.
export function PlaceWords({ point, onOpen, children }: PlaceWordsProps): ReactElement {
  if (point === null) {
    return <>{children}</>;
  }
  return (
    <Pressable
      accessibilityHint="지도에서 보기"
      accessibilityLabel={point.label}
      accessibilityRole="button"
      hitSlop={space[1]}
      onPress={() => {
        onOpen(point);
      }}
      style={({ pressed }) => pressed && styles.pressed}
    >
      {children}
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
  pressed: { opacity: 0.6 },
});
