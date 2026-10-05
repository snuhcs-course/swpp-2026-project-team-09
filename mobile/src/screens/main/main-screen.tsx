import type { ReactElement, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color } from '@/design-system';
import { CAMPUS_BOUNDS, Map, type MapMarker, MAX_ZOOM, MIN_ZOOM } from '@/map';
import { LocationExplanation } from './location-explanation';
import { MainNav } from './main-nav';
import { useMainMap } from './use-main-map';
import { useMe } from './use-me';
import { ZoomControl } from './zoom-control';

const NO_MARKERS: readonly MapMarker[] = [];

// What floats over the map, between the phone's status bar and the navigation: each child places itself there, by
// the offsets of `layout.ts`. A press beside the children reaches the map.
function OverMap({ children }: { children: ReactNode }): ReactElement {
  const { top } = useSafeAreaInsets();
  return <View style={[styles.overMap, { top }]}>{children}</View>;
}

// The main screen, the `Main` frame: the map with the User's own Avatar, the zoom control over it and the bottom
// navigation under it.
//
// How it grows: `useMainMap` owns the map's handle, its camera and the moves; a part of the screen takes `map`, and
// `me` for the User's position, and gives what it shows. Markers, other Avatars and the route go into `<Map>`
// (ticket 09); cards, lists and controls are children of `OverMap` (tickets 09 and 10).
export function MainScreen(): ReactElement {
  const map = useMainMap();
  const me = useMe(map);
  return (
    <View style={styles.screen}>
      <View style={styles.stage}>
        <Map
          avatars={me.avatars}
          bounds={CAMPUS_BOUNDS}
          markers={NO_MARKERS}
          maxZoom={MAX_ZOOM}
          minZoom={MIN_ZOOM}
          onCameraIdle={map.onCameraIdle}
          onFitZoom={map.onFitZoom}
          ref={map.ref}
          route={null}
        />
        <OverMap>
          <ZoomControl
            onMyPosition={me.goToMe}
            onZoomIn={() => {
              map.zoomBy(1);
            }}
            onZoomOut={() => {
              map.zoomBy(-1);
            }}
          />
        </OverMap>
      </View>
      <MainNav />
      <LocationExplanation onAllow={me.allow} onLater={me.later} visible={me.explaining} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface },
  // The map and what floats over it. It ends at the navigation's top, so that the map's credit stays uncovered.
  stage: { flex: 1 },
  overMap: { position: 'absolute', right: 0, bottom: 0, left: 0, pointerEvents: 'box-none' },
});
