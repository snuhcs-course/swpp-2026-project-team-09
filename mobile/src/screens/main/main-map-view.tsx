/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-17  Opus 5.5   prompted by fyoon46
 * 2026-11-18  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { CAMPUS_CAMERA, Map } from '@/map';
import { useNavCoverOnMain } from '../shell/main-tab-bar';
import { mapInset, type Room } from './layout';
import type { MapContents } from './use-answer-map';
import type { MainMap } from './use-main-map';
import type { MapTouches } from './use-pressed-place';

export interface MainMapViewProps {
  map: MainMap;
  contents: MapContents;
  room: Room;
  // What watches the map's touches and its size: the tutorial place pin's tap and a press on a building.
  around: MapTouches;
  // What a press on a marker does: the tutorial pin's press for its own marker, else the things'.
  onPress: (id: string) => void;
  nativeMinLevel: number;
  outerZoom?: number;
}

// The main screen's map with what it draws, as high as the screen, under the navigation too (`useNavCoverOnMain`),
// so that its view keeps one size when the navigation gives way to the answer frame. Its credit opens the sources of
// its data, clear of the navigation while it is shown. The View around it watches its touches for a tap, which
// removes the pin or presses a building.
export function MainMapView({ map, contents, room, around, onPress, ...limits }: MainMapViewProps): ReactElement {
  const { height } = useWindowDimensions();
  const covered = useNavCoverOnMain();
  const inset = mapInset(room);
  return (
    <View style={[styles.map, { height }]} testID="main-map-touches" {...around}>
      <Map
        avatars={contents.avatars}
        {...CAMPUS_CAMERA}
        inset={{ ...inset, bottom: inset.bottom + covered }}
        markers={contents.markers}
        {...limits}
        onCameraIdle={map.onCameraIdle}
        onCreditPress={() => {
          router.push('/map-sources');
        }}
        onFitZoom={map.onFitZoom}
        onPress={onPress}
        lines={contents.lines}
        ref={map.ref}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  map: { position: 'absolute', top: 0, right: 0, left: 0 },
});
