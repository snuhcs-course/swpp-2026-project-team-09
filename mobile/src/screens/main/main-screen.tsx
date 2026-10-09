/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-06  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-09  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { router, useIsFocused } from 'expo-router';
import { type ReactElement, type ReactNode, useMemo, useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { LatLng } from '@/api/types';
import { color, useNotReadyToast, useToastAbove } from '@/design-system';
import { useDiningCards } from '@/features/dining/use-dining';
import type { CardView } from '@/features/map/adapter';
import { useMapCards } from '@/features/map/use-map-cards';
import { type ShuttleLayer, useShuttle } from '@/features/shuttle/use-shuttle';
import { CAMPUS_CAMERA, Map, type MapLine } from '@/map';
import { useOpenPartyCreate } from '@/screens/events/use-party-create';
import { Card } from './card';
import { FriendList } from './friend-list';
import { useLayerStack } from './layers';
import { listsTop, mapInset, ROUTE_PADDING, type Room, takenUnderToast, takenUnderToastOverCard } from './layout';
import { LocationExplanation } from './location-explanation';
import { MapBottom, openMenus, takenBy } from './map-bottom';
import { QuestList } from './quest-list';
import { type MainMap, useMainMap } from './use-main-map';
import { type Me, useMe } from './use-me';
import { useActivePartyRoom } from './use-active-party-room';
import { useAskedPerson } from './use-asked-person';
import { type MainRoute, useRoute } from './use-route';
import { type Selection, useSelection } from './use-selection';
import { type Things, useThings } from './use-things';
import { ZoomControl } from './zoom-control';
import { openMeetupForm } from '../meetup/open-meetup-form';

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
  selection: Selection;
  map: MainMap;
  route: MainRoute;
  // The shuttle's line, which "노선 보기" brings into view.
  shuttleLine: readonly LatLng[];
  onActiveParty: () => void;
  onHeight: (height: number) => void;
  // A 식당's card sits at the top of the map, without "가까이 보기".
  top: boolean;
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

// The card of the selected thing, if any, with what its buttons do. "가까이 보기" is offered below the "names" level of detail
// and brings the camera to the "close" level, keeping the card. "길찾기" closes the card once the route is asked for.
// "메뉴 보기" opens the menu panel at the restaurant. "노선 보기" brings the shuttle's whole line into view and closes
// the card. "파티 열기" and "참여하기" open a Quest's room, "같이 갈 사람 찾기" 파티 만들기 for the Global Event, and a
// Friend's "파티 만들기" the Meetup form. Every other button belongs to another task and says that it is not ready. A
// choice, such as an event at a place, opens its own card.
function SelectedCard(props: SelectedCardProps): ReactElement | null {
  const { selection, map, route, shuttleLine, onActiveParty, onHeight, top } = props;
  const showNotReady = useNotReadyToast();
  const openPartyCreate = useOpenPartyCreate();
  const { top: inset } = useSafeAreaInsets();
  const { selected: card, close: onClose } = selection;
  if (card === null) {
    return null;
  }
  const { primary } = card;
  return (
    <Card
      canLookCloser={map.detail !== 'names' && !top}
      card={card}
      onChoose={selection.select}
      onClose={onClose}
      onHeight={onHeight}
      onLookCloser={() => {
        map.goTo(card.position, 'close');
      }}
      onPrimary={() => {
        if (primary === null) {
          return;
        }
        if (primary.action === 'menu') {
          openMenus(primary.restaurant);
        } else if (primary.action === 'shuttle-line') {
          map.fitTo(shuttleLine, ROUTE_PADDING);
          onClose();
        } else if (primary.action === 'room') {
          router.push(`/room/${primary.questId}`);
        } else if (primary.action === 'active-party') {
          onActiveParty();
        } else if (primary.action === 'recruit') {
          openPartyCreate(primary.eventId);
        } else if (primary.action === 'meetup') {
          openMeetupForm(primary.userId, primary.name);
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
  lines: readonly MapLine[];
  cardHeight: number | null;
  onPress: (id: string) => void;
}

// The map with the things of the cards, the User's own Avatar and the lines. Its credit opens the sources of its data.
function MainMapView({ map, me, things, lines, cardHeight, onPress }: MainMapViewProps): ReactElement {
  return (
    <Map
      avatars={[...things.avatars, ...me.avatars]}
      {...CAMPUS_CAMERA}
      inset={mapInset(cardHeight)}
      markers={things.markers}
      onCameraIdle={map.onCameraIdle}
      onCreditPress={() => {
        router.push('/map-sources');
      }}
      onFitZoom={map.onFitZoom}
      onPress={onPress}
      lines={lines}
      ref={map.ref}
    />
  );
}

// The map's cards, and the 식당 layer's and the shuttle layer's while they are on.
// `ready` once the map's own cards are known.
function useCards(dining: boolean, shuttle: ShuttleLayer): { cards: readonly CardView[]; ready: boolean } {
  const { data } = useMapCards();
  const mapCards = data ?? NO_CARDS;
  const diningCards = useDiningCards(dining);
  const cards = useMemo(() => [...mapCards, ...diningCards, ...shuttle.cards], [mapCards, diningCards, shuttle.cards]);
  return { cards, ready: data !== undefined };
}

// The shuttle's line under the walking route.
function useLines(shuttle: ShuttleLayer, route: MainRoute): readonly MapLine[] {
  return useMemo(() => [...shuttle.lines, ...(route.line === null ? [] : [route.line])], [shuttle.lines, route.line]);
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

// The room the parts over the map have, and the toast's place. What is at the bottom card's place counts: a card at
// the bottom, or the shuttle's notice; one that appears counts from the last one's height until it is laid out.
function useRoom(atBottom: boolean): {
  room: Room;
  setStage: (stage: Room['stage']) => void;
  setCardHeight: (height: number) => void;
} {
  const [cardHeight, setCardHeight] = useState(0);
  const [stage, setStage] = useState<Room['stage']>(null);
  const room: Room = { stage, cardHeight: atBottom ? cardHeight : null };
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
  const shuttle = useShuttle(stack.layers.shuttle);
  const { cards, ready } = useCards(stack.layers.dining, shuttle);
  const selection = useSelection(cards, inFront);
  const things = useThings(cards, map.detail, selection.selected?.id ?? null);
  const route = useRoute(map, me);
  const lines = useLines(shuttle, route);
  const party = useActivePartyRoom();
  useAskedPerson(ready ? cards : null, map, selection);
  const taken = takenBy(selection.selected, shuttle.serviceHours);
  const { room, setStage, setCardHeight } = useRoom(taken.bottomCard || taken.notice !== null);
  return (
    <View style={styles.screen}>
      <View style={styles.stage}>
        <MainMapView
          cardHeight={room.cardHeight}
          lines={lines}
          map={map}
          me={me}
          onPress={selection.select}
          things={things}
        />
        <OverMap onStage={setStage}>
          <Lists hidden={taken.topCard} map={map} room={room} selection={selection} />
          {taken.bottomCard || taken.notice !== null || stack.open ? null : <MainZoomControl map={map} me={me} />}
          <SelectedCard
            map={map}
            onActiveParty={party.open}
            onHeight={setCardHeight}
            route={route}
            selection={selection}
            shuttleLine={shuttle.line}
            top={taken.topCard}
          />
          <MapBottom onNoticeHeight={setCardHeight} onParty={party.open} room={room} stack={stack} taken={taken} />
        </OverMap>
      </View>
      {party.sheet}
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
