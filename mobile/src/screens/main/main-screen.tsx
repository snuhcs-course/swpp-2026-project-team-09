import { router, useIsFocused } from 'expo-router';
import { type ReactElement, type ReactNode, useMemo, useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { now } from '@/clock';
import { color, useNotReadyToast, useToastAbove } from '@/design-system';
import { nextMeal } from '@/features/dining/adapter';
import { useDiningCards } from '@/features/dining/use-dining';
import type { CardView } from '@/features/map/adapter';
import { useMapCards } from '@/features/map/use-map-cards';
import { CAMPUS_BOUNDS, Map, MAX_ZOOM, MIN_ZOOM } from '@/map';
import { BottomControls } from './bottom-controls';
import { Card } from './card';
import { FriendList } from './friend-list';
import { LayerControls, useLayerStack } from './layers';
import { listsTop, mapInset, type Room, takenUnderToast, takenUnderToastOverCard } from './layout';
import { LocationExplanation } from './location-explanation';
import { QuestList } from './quest-list';
import { type MainMap, useMainMap } from './use-main-map';
import { type Me, useMe } from './use-me';
import { type MainRoute, ROUTE_STYLE, useRoute } from './use-route';
import { type Selection, useSelection } from './use-selection';
import { type Things, useThings } from './use-things';
import { ZoomControl } from './zoom-control';

const NO_CARDS: readonly CardView[] = [];

interface ListProps {
  map: MainMap;
  room: Room;
  selection: Selection;
}

interface OverMapProps {
  children: ReactNode;
  onStage: (stage: NonNullable<Room['stage']>) => void;
}

interface SelectedCardProps {
  card: CardView;
  map: MainMap;
  route: MainRoute;
  onClose: () => void;
  onHeight: (height: number) => void;
  // A 식당's card sits at the top of the map, without "가까이 보기".
  top: boolean;
}

// The menu panel at the meal served next, at a restaurant's section or at the top of the list.
function openMenus(restaurant?: string): void {
  const { date, meal } = nextMeal(now());
  router.push({ pathname: '/menus', params: restaurant === undefined ? { date, meal } : { date, meal, restaurant } });
}

// What floats over the map, between the phone's status bar and the navigation: each child places itself there, by
// the offsets of `layout.ts`. A press beside the children reaches the map. It tells its size, the stage's, by which
// the lists and the row of buttons fit themselves to a low or narrow screen.
function OverMap({ children, onStage }: OverMapProps): ReactElement {
  const { top } = useSafeAreaInsets();
  return (
    <View
      onLayout={({ nativeEvent }: LayoutChangeEvent) => {
        const { width, height } = nativeEvent.layout;
        onStage({ width, height });
      }}
      style={[styles.overMap, { top }]}
      testID="over-map"
    >
      {children}
    </View>
  );
}

// The card of the selected thing, with what its buttons do. "가까이 보기" is offered below the "names" level of detail
// and brings the camera to the "close" level, keeping the card. "길찾기" closes the card once the route is asked for.
// "메뉴 보기" opens the menu panel at the restaurant. Every other button belongs to another task and says that it is
// not ready.
function SelectedCard({ card, map, route, onClose, onHeight, top }: SelectedCardProps): ReactElement {
  const showNotReady = useNotReadyToast();
  const { top: inset } = useSafeAreaInsets();
  const { primary } = card;
  return (
    <Card
      canLookCloser={map.detail !== 'names' && !top}
      card={card}
      onClose={onClose}
      onHeight={onHeight}
      onLookCloser={() => {
        map.goTo(card.position, 'close');
      }}
      onPrimary={() => {
        if (primary.action === 'menu') {
          openMenus(primary.restaurant);
        } else if (primary.action !== 'route') {
          showNotReady();
        } else if (route.routeTo(card)) {
          onClose();
        }
      }}
      top={top ? listsTop(inset) : undefined}
    />
  );
}

// While the map is in front, a toast sits over the row of buttons, or above an open card.
function useToastOverMap(cardHeight: number | null): void {
  const { bottom } = useSafeAreaInsets();
  useToastAbove(
    cardHeight === null ? takenUnderToast(bottom) : takenUnderToastOverCard(bottom, cardHeight),
    useIsFocused(),
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

interface MainMapViewProps {
  map: MainMap;
  me: Me;
  things: Things;
  route: MainRoute;
  cardHeight: number | null;
  onPress: (id: string) => void;
}

// The map with the things of the cards, the User's own Avatar and the route. Its credit opens the sources of its data.
function MainMapView({ map, me, things, route, cardHeight, onPress }: MainMapViewProps): ReactElement {
  return (
    <Map
      avatars={[...things.avatars, ...me.avatars]}
      bounds={CAMPUS_BOUNDS}
      inset={mapInset(cardHeight)}
      markers={things.markers}
      maxZoom={MAX_ZOOM}
      minZoom={MIN_ZOOM}
      onCameraIdle={map.onCameraIdle}
      onCreditPress={() => {
        router.push('/map-sources');
      }}
      onFitZoom={map.onFitZoom}
      onPress={onPress}
      ref={map.ref}
      route={route.line}
      routeStyle={ROUTE_STYLE}
    />
  );
}

// The map's cards, and the 식당 layer's while it is on.
function useCards(dining: boolean): readonly CardView[] {
  const mapCards = useMapCards().data ?? NO_CARDS;
  const diningCards = useDiningCards(dining);
  return useMemo(() => [...mapCards, ...diningCards], [mapCards, diningCards]);
}

// The friend list and the Quest list, which give way to a card at the top.
function Lists({ hidden, map, room, selection }: { hidden: boolean } & ListProps): ReactElement {
  return (
    <View style={[styles.lists, hidden && styles.hidden]}>
      <FriendList map={map} room={room} selection={selection} />
      <QuestList map={map} room={room} selection={selection} />
    </View>
  );
}

// The room the parts over the map have, and the toast's place. An open card's height counts only for a card at the
// bottom; a card that opens counts from the last one's until it is laid out.
function useRoom(bottomCard: boolean): {
  room: Room;
  setStage: (stage: Room['stage']) => void;
  setCardHeight: (height: number) => void;
} {
  const [cardHeight, setCardHeight] = useState(0);
  const [stage, setStage] = useState<Room['stage']>(null);
  const room: Room = { stage, cardHeight: bottomCard ? cardHeight : null };
  useToastOverMap(room.cardHeight);
  return { room, setStage, setCardHeight };
}

// The main screen, the `Main` frame: the map with the User's own Avatar, the people and places of the map's cards
// and the route; over it the friend list, the Quest list, the zoom control or the selected thing's card, and the
// controls above the navigation. It is the first tab: the bottom navigation under it is the tabs', and it stays
// mounted while another tab is shown, so that the map, the selection, the route and the lists are kept.
//
// How it grows: `useMainMap` owns the map's handle, its camera and the moves; `useSelection` holds what is selected,
// which is the card that is open. A part of the screen takes `map`, `me` for the User's position and `selection`,
// and gives what it shows. What floats over the map is a child of `OverMap`, in the frame's order, the later above
// the earlier; a part that a card hides asks `selection.open`. A row of a list selects a thing with
// `selection.select(cardId.friend(id))` and moves the map with `map.goTo`. Any part reads the User's position with
// `usePosition()`: the signed-in place's layout holds the one watch of the phone. The map is told what the controls
// cover of its edges (`mapInset`), so that its credit and the provider's logo stay clear of them. A part that fits
// itself to the screen takes `room`: the stage's size and the open card's height.
export function MainScreen(): ReactElement {
  const inFront = useIsFocused();
  const map = useMainMap();
  const me = useMe(map);
  const stack = useLayerStack(inFront);
  const cards = useCards(stack.layers.dining);
  const selection = useSelection(cards, inFront);
  const things = useThings(cards, map.detail, selection.selected?.id ?? null);
  const route = useRoute(map, me);
  // A 식당's card sits at the top: the lists give way to it, and what is at the bottom stays.
  const topCard = selection.selected?.kind === 'dining';
  const bottomCard = selection.open && !topCard;
  const { room, setStage, setCardHeight } = useRoom(bottomCard);
  return (
    <View style={styles.screen}>
      <View style={styles.stage}>
        <MainMapView
          cardHeight={room.cardHeight}
          map={map}
          me={me}
          onPress={selection.select}
          route={route}
          things={things}
        />
        <OverMap onStage={setStage}>
          <Lists hidden={topCard} map={map} room={room} selection={selection} />
          {bottomCard || stack.open ? null : <MainZoomControl map={map} me={me} />}
          {selection.selected === null ? null : (
            <SelectedCard
              card={selection.selected}
              map={map}
              onClose={selection.close}
              onHeight={setCardHeight}
              route={route}
              top={topCard}
            />
          )}
          <BottomControls cardOpen={bottomCard} room={room} />
          {bottomCard ? null : <LayerControls onMenus={openMenus} stack={stack} />}
        </OverMap>
      </View>
      <LocationExplanation blocked={me.blocked} onAllow={me.allow} onLater={me.later} visible={me.explaining} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface },
  // The map and what floats over it. It ends at the navigation's top, so that the map's credit stays uncovered.
  stage: { flex: 1 },
  overMap: { position: 'absolute', right: 0, bottom: 0, left: 0, pointerEvents: 'box-none' },
  lists: { ...StyleSheet.absoluteFill, pointerEvents: 'box-none' },
  hidden: { display: 'none' },
});
