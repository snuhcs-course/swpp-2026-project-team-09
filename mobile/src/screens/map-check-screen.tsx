import { type ReactElement, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { LatLng } from '@/api/types';
import { Button, color, space, text } from '@/design-system';
import {
  CAMPUS_BOUNDS,
  centreOf,
  Map,
  type MapAvatar,
  type MapCamera,
  type MapHandle,
  type MapMarker,
  type MarkerLook,
  MAX_ZOOM,
  MIN_ZOOM,
  useMarkerImages,
} from '@/map';

const HERE: LatLng = { latitude: 37.45905, longitude: 126.9512 };
const THERE: LatLng = { latitude: 37.4635, longitude: 126.9545 };
const EVENT: LatLng = { latitude: 37.4499, longitude: 126.9525 };
const PARTY: LatLng = { latitude: 37.4563, longitude: 126.9498 };
const FRIEND: LatLng = { latitude: 37.4598, longitude: 126.9521 };
const ROUTE: LatLng[] = [HERE, { latitude: 37.4552, longitude: 126.9516 }, EVENT];
const GLIDE_MS = 5000;
const FIT_PADDING = 48;

const LOOKS: MarkerLook[] = [
  { kind: 'official', form: 'pin' },
  { kind: 'party', form: 'dot' },
  { kind: 'me' },
  { kind: 'friend', form: 'pin', name: '김민준', photo: null, status: 'free' },
];

// What the check puts on the map: a pin with a name, a dot, the User's own Avatar and a Friend's.
function useSamples(me: LatLng): { markers: MapMarker[]; avatars: MapAvatar[] } {
  const [eventPin, partyDot, myAvatar, friendAvatar] = useMarkerImages(LOOKS);
  return {
    markers: [
      { id: 'event:e1', name: 'AI 커리어 채용설명회', position: EVENT, image: eventPin, text: 'AI 커리어' },
      { id: 'party:q1', name: '보드게임 파티', position: PARTY, image: partyDot },
    ],
    avatars: [
      { id: 'me', name: '내 위치', position: me, image: myAvatar, glideMs: GLIDE_MS },
      { id: 'friend:f1', name: '김민준', position: FRIEND, image: friendAvatar, text: '민준', glideMs: GLIDE_MS },
    ],
  };
}

function describe(camera: MapCamera | null): string {
  if (camera === null) {
    return '카메라: 아직 없음';
  }
  const { latitude, longitude } = camera.centre;
  return `카메라: ${latitude.toFixed(5)}, ${longitude.toFixed(5)} · 줌 ${camera.zoom.toFixed(2)}`;
}

interface ControlsProps {
  onMoveAvatar: () => void;
  onDrawRoute: () => void;
  onClearRoute: () => void;
  onFitRoute: () => void;
  onZoomIn: () => void;
  onShowCampus: () => void;
}

function Controls(props: ControlsProps): ReactElement {
  const { onMoveAvatar, onDrawRoute, onClearRoute, onFitRoute, onZoomIn, onShowCampus } = props;
  return (
    <View style={styles.controls}>
      <Button onPress={onMoveAvatar} variant="secondary">
        아바타 옮기기
      </Button>
      <Button onPress={onDrawRoute} variant="secondary">
        경로 그리기
      </Button>
      <Button onPress={onClearRoute} variant="secondary">
        경로 지우기
      </Button>
      <Button onPress={onFitRoute} variant="secondary">
        경로에 맞추기
      </Button>
      <Button onPress={onZoomIn} variant="secondary">
        확대
      </Button>
      <Button onPress={onShowCampus} variant="secondary">
        캠퍼스 전체
      </Button>
    </View>
  );
}

// The map component as a screen uses it, to try by hand what the device check lists: markers and their names, an
// Avatar that glides, the route line, a press and the camera's stop.
export function MapCheckScreen(): ReactElement {
  const map = useRef<MapHandle>(null);
  const [me, setMe] = useState(HERE);
  const [route, setRoute] = useState<LatLng[] | null>(null);
  const [pressed, setPressed] = useState<string | null>(null);
  const [camera, setCamera] = useState<MapCamera | null>(null);
  const { markers, avatars } = useSamples(me);
  return (
    <SafeAreaView style={styles.screen}>
      <Map
        avatars={avatars}
        bounds={CAMPUS_BOUNDS}
        markers={markers}
        maxZoom={MAX_ZOOM}
        minZoom={MIN_ZOOM}
        onCameraIdle={setCamera}
        onPress={setPressed}
        ref={map}
        route={route}
      />
      <View style={styles.panel}>
        <Text style={styles.line}>{pressed === null ? '누른 것: 없음' : `누른 것: ${pressed}`}</Text>
        <Text style={styles.line}>{describe(camera)}</Text>
        <Controls
          onClearRoute={() => {
            setRoute(null);
          }}
          onDrawRoute={() => {
            setRoute(ROUTE);
          }}
          onFitRoute={() => {
            map.current?.fitTo([HERE, EVENT], { padding: FIT_PADDING, animated: true });
          }}
          onMoveAvatar={() => {
            setMe(me === HERE ? THERE : HERE);
          }}
          onShowCampus={() => {
            map.current?.moveCamera({ centre: centreOf(CAMPUS_BOUNDS), zoom: MIN_ZOOM });
          }}
          onZoomIn={() => {
            map.current?.moveCamera({ zoom: (camera?.zoom ?? MIN_ZOOM) + 1, animated: true });
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface },
  panel: { gap: space[2], padding: space[4] },
  line: { ...text.caption, color: color.inkMuted },
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
});
