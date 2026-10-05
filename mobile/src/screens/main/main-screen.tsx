import { type ReactElement, type ReactNode, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, useNotReadyToast } from '@/design-system';
import type { CardView } from '@/features/map/adapter';
import { useMapCards } from '@/features/map/use-map-cards';
import { CAMPUS_BOUNDS, Map, MAX_ZOOM, MIN_ZOOM } from '@/map';
import { PositionProvider } from '@/position';
import { Card } from './card';
import { LocationExplanation } from './location-explanation';
import { MainNav } from './main-nav';
import { type MainMap, useMainMap } from './use-main-map';
import { type Me, useMe } from './use-me';
import { type MainRoute, ROUTE_STYLE, useRoute } from './use-route';
import { useSelection } from './use-selection';
import { useThings } from './use-things';
import { ZoomControl } from './zoom-control';

const NO_CARDS: readonly CardView[] = [];

interface SelectedCardProps {
  card: CardView;
  map: MainMap;
  route: MainRoute;
  onClose: () => void;
  onHeight: (height: number) => void;
}

// What floats over the map, between the phone's status bar and the navigation: each child places itself there, by
// the offsets of `layout.ts`. A press beside the children reaches the map.
function OverMap({ children }: { children: ReactNode }): ReactElement {
  const { top } = useSafeAreaInsets();
  return <View style={[styles.overMap, { top }]}>{children}</View>;
}

// The card of the selected thing, with what its buttons do. "가까이 보기" is offered below the "names" level of detail
// and brings the camera to the "close" level, keeping the card. "길찾기" closes the card once the route is asked for.
// Every other button belongs to another task and says that it is not ready.
function SelectedCard({ card, map, route, onClose, onHeight }: SelectedCardProps): ReactElement {
  const showNotReady = useNotReadyToast();
  return (
    <Card
      canLookCloser={map.detail !== 'names'}
      card={card}
      onClose={onClose}
      onHeight={onHeight}
      onLookCloser={() => {
        map.goTo(card.position, 'close');
      }}
      onPrimary={() => {
        if (card.primary.action !== 'route') {
          showNotReady();
        } else if (route.routeTo(card)) {
          onClose();
        }
      }}
    />
  );
}

function MainZoomControl({ map, me }: { map: MainMap; me: Me }): ReactElement {
  return (
    <ZoomControl
      onMyPosition={me.goToMe}
      onZoomIn={() => {
        map.zoomBy(1);
      }}
      onZoomOut={() => {
        map.zoomBy(-1);
      }}
    />
  );
}

// The main screen, the `Main` frame: the map with the User's own Avatar, the people and places of the map's cards
// and the route, the zoom control or the selected thing's card over it, and the bottom navigation under it.
//
// How it grows: `useMainMap` owns the map's handle, its camera and the moves; `useSelection` holds what is selected,
// which is the card that is open. A part of the screen takes `map`, `me` for the User's position and `selection`,
// and gives what it shows: lists and controls are children of `OverMap` (ticket 10), and those that a card hides
// ask `selection.open`. A row of a list selects a thing with `selection.select(cardId.friend(id))` and moves the map
// with `map.goTo`. Any part reads the User's position with `usePosition()`: the provider below holds the one watch
// of the phone.
export function MainScreen(): ReactElement {
  return (
    <PositionProvider>
      <MainParts />
    </PositionProvider>
  );
}

function MainParts(): ReactElement {
  const map = useMainMap();
  const me = useMe(map);
  const cards = useMapCards().data ?? NO_CARDS;
  const selection = useSelection(cards);
  const things = useThings(cards, map.detail, selection.selected?.id ?? null);
  const route = useRoute(map, me);
  // An open card's height, for the toast above it. A card that opens counts from the last one's until it is laid out.
  const [cardHeight, setCardHeight] = useState(0);
  return (
    <View style={styles.screen}>
      <View style={styles.stage}>
        <Map
          avatars={[...things.avatars, ...me.avatars]}
          bounds={CAMPUS_BOUNDS}
          markers={things.markers}
          maxZoom={MAX_ZOOM}
          minZoom={MIN_ZOOM}
          onCameraIdle={map.onCameraIdle}
          onFitZoom={map.onFitZoom}
          onPress={selection.select}
          ref={map.ref}
          route={route.line}
          routeStyle={ROUTE_STYLE}
        />
        <OverMap>
          {selection.selected === null ? (
            <MainZoomControl map={map} me={me} />
          ) : (
            <SelectedCard
              card={selection.selected}
              map={map}
              onClose={selection.close}
              onHeight={setCardHeight}
              route={route}
            />
          )}
        </OverMap>
      </View>
      <MainNav cardHeight={selection.open ? cardHeight : null} />
      <LocationExplanation blocked={me.blocked} onAllow={me.allow} onLater={me.later} visible={me.explaining} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface },
  // The map and what floats over it. It ends at the navigation's top, so that the map's credit stays uncovered.
  stage: { flex: 1 },
  overMap: { position: 'absolute', right: 0, bottom: 0, left: 0, pointerEvents: 'box-none' },
});
