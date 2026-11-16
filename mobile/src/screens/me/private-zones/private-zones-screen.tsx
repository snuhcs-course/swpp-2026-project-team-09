/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { type ReactElement, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { PRIVATE_ZONES_MAX } from '@/api/private-zone-outline';
import { privateZonesQuery } from '@/api/queries';
import { AppBar, color } from '@/design-system';
import type { MapCamera, Size } from '@/map';
import { useZoneDrawing, type ZoneView } from './use-zone-drawing';
import { ZoneMap } from './zone-map';
import { ZonePanel } from './zone-panel';

// 비공개 구역 (`/me/private-zones`, P02 ticket 29), from 위치 공유: the User's Private Zones filled over the campus
// map, and a pencil that draws one more round an area, up to five.
export function PrivateZonesScreen(): ReactElement {
  const zones = useQuery(privateZonesQuery);
  const [camera, setCamera] = useState<MapCamera | null>(null);
  const [size, setSize] = useState<Size | null>(null);
  const view = useMemo(
    (): ZoneView | null => (camera === null || size === null ? null : { camera, size }),
    [camera, size],
  );
  const drawing = useZoneDrawing(view);
  const saved = zones.data ?? [];
  return (
    <View style={styles.screen}>
      <AppBar leave={{ kind: 'back', onPress: router.back }} title="비공개 구역" />
      <ZoneMap
        drawing={drawing}
        full={saved.length >= PRIVATE_ZONES_MAX}
        onCamera={setCamera}
        onSize={setSize}
        view={view}
        zones={saved}
      />
      <ZonePanel drawing={drawing} zones={zones} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface },
});
