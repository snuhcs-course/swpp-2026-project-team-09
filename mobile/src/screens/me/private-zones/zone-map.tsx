/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-17  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { PrivateZone } from '@/api/private-zone-types';
import { zoneLines } from '@/features/private-zones/zone-lines';
import { color, Icon, radius, shadow, size as sizes, space } from '@/design-system';
import { CAMPUS_BOUNDS, CAMPUS_CAMERA, isInside, Map, type MapCamera, type MapHandle, type Size } from '@/map';
import { usePosition } from '@/position';
import type { ZoneDrawing, ZoneView } from './use-zone-drawing';
import { DrawingOverlay, StrokeLayer } from './zone-layer';

// Close enough to draw round a building.
const OPENING_ZOOM = 17;

function Pencil({ on, disabled, onPress }: { on: boolean; disabled: boolean; onPress: () => void }): ReactElement {
  const ink = on ? color.onPrimary : color.ink;
  return (
    <Pressable
      accessibilityLabel="그리기"
      accessibilityRole="switch"
      accessibilityState={{ checked: on, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.pencil, on && styles.pencilOn, disabled && styles.pencilOff]}
    >
      <Icon color={disabled ? color.inkMuted : ink} name="pencil" size={22} />
    </Pressable>
  );
}

interface ZoneMapProps {
  zones: readonly PrivateZone[];
  drawing: ZoneDrawing;
  view: ZoneView | null;
  // Five zones: no more is drawn.
  full: boolean;
  onCamera: (camera: MapCamera) => void;
  onSize: (size: Size) => void;
}

// The campus map with no inset, so that the camera's centre is the view's middle. It opens on the User where they are
// on campus, close, and on the whole campus otherwise.
export function ZoneMap({ zones, drawing, view, full, onCamera, onSize }: ZoneMapProps): ReactElement {
  const { position } = usePosition();
  const map = useRef<MapHandle>(null);
  const opened = useRef(false);
  const zoom = view?.camera.zoom ?? OPENING_ZOOM;
  const unsaved = drawing.stroke.path === null ? drawing.unsaved : null;
  const lines = useMemo(() => zoneLines(zones, unsaved, zoom), [zones, unsaved, zoom]);
  return (
    <View style={styles.area}>
      <View
        onLayout={({ nativeEvent: { layout } }) => {
          onSize({ width: layout.width, height: layout.height });
        }}
        style={styles.area}
        testID="zone-map"
      >
        <Map
          avatars={[]}
          {...CAMPUS_CAMERA}
          lines={lines}
          markers={[]}
          onCameraIdle={(camera) => {
            onCamera(camera);
            if (!opened.current) {
              opened.current = true;
              if (position !== null && isInside(position, CAMPUS_BOUNDS)) {
                map.current?.moveCamera({ centre: position, zoom: OPENING_ZOOM });
              }
            }
          }}
          ref={map}
        />
      </View>
      {view === null || drawing.stroke.path === null ? null : (
        <StrokeLayer size={view.size} stroke={drawing.stroke.path} />
      )}
      {drawing.pencil ? <DrawingOverlay stroke={drawing.stroke} /> : null}
      <Pencil disabled={full && !drawing.pencil} on={drawing.pencil} onPress={drawing.togglePencil} />
    </View>
  );
}

const PENCIL = sizes.touchMin;

const styles = StyleSheet.create({
  area: { flex: 1 },
  pencil: {
    position: 'absolute',
    top: space[3],
    right: space[3],
    alignItems: 'center',
    justifyContent: 'center',
    width: PENCIL,
    height: PENCIL,
    borderRadius: radius.full,
    backgroundColor: color.surface,
    boxShadow: shadow.float,
  },
  pencilOn: { backgroundColor: color.private },
  pencilOff: { backgroundColor: color.surfaceSunken },
});
