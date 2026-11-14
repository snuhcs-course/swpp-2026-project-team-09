/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-06  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-09  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-17  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-22  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-05  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-14  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { type ReactElement, type ReactNode, useEffect, useMemo } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { LatLng } from '@/api/types';
import { color, useNotReadyToast } from '@/design-system';
import type { CardView } from '@/features/map/adapter';
import type { ShuttleLayer } from '@/features/shuttle/use-shuttle';
import { LIVE_SEATS_WORDS } from '@/features/study/adapter';
import { showsStartButton } from '@/features/tutorial/rules';
import { CAMPUS_CAMERA, Map, type MapLine } from '@/map';
import { useOpenPartyCreate } from '@/screens/events/use-party-create';
import { Card } from './card';
import { FriendList } from './friend-list';
import { listsTop, mapInset, ROUTE_PADDING, type Room } from './layout';
import { LocationExplanation } from './location-explanation';
import { MapBottom, openMenus, type Taken, takenBy } from './map-bottom';
import { QuestList } from './quest-list';
import { RoomRequestInbox } from './room-consent';
import type { ChatSheetControl } from './chat-sheet';
import { askAssistant, pressOnMap, useMainLayers } from './use-main-layers';
import { type MainMap, useMainMap } from './use-main-map';
import { type Me, useMe } from './use-me';
import { useActivePartyRoom } from './use-active-party-room';
import { useAskedByAddress } from './use-asked-card';
import { type MainRoute, useRoute } from './use-route';
import { useRoom } from './use-room';
import { type Selection, useSelection } from './use-selection';
import { type Things, useThings } from './use-things';
import { type TutorialFlow, useTutorialFlow } from './tutorial/use-tutorial-flow';
import { TUTORIAL_PIN_ID, type TutorialPin, useTutorialPin } from './tutorial/use-tutorial-pin';
import { ZoomControl } from './zoom-control';

interface ListProps {
  map: MainMap;
  room: Room;
  selection: Selection;
  tutorial: TutorialFlow;
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
  // 좌석 현황 of 관정관's card asks the Assistant in the chat. No card is shown while the answer frame is.
  chat: ChatSheetControl;
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
// "메뉴 보기" opens the menu panel at the restaurant. 관정관's "좌석 현황" closes the card and asks the Assistant for
// its seats in the chat. "노선 보기" brings the shuttle's whole line into view and closes
// the card. "파티 열기" and "참여하기" open a Quest's room, "같이 갈 사람 찾기" 파티 만들기 for the Global Event, and a
// Friend's "파티 만들기" 파티 만들기 as 비공개 with the Friend invited. Every other button belongs to another task and says that it is not ready. A
// choice, such as an event at a place, opens its own card.
function SelectedCard(props: SelectedCardProps): ReactElement | null {
  const { selection, map, route, shuttleLine, onActiveParty, chat, onHeight, top } = props;
  const showNotReady = useNotReadyToast();
  const openPartyCreate = useOpenPartyCreate();
  const { top: inset } = useSafeAreaInsets();
  const { selected: card, close: onClose } = selection;
  if (card === null || chat.framed) {
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
        } else if (primary.action === 'library-seats') {
          onClose();
          askAssistant(chat)(LIVE_SEATS_WORDS);
        } else if (primary.action === 'shuttle-line') {
          map.fitTo(shuttleLine, ROUTE_PADDING);
          onClose();
        } else if (primary.action === 'room') {
          router.push(`/room/${primary.questId}`);
        } else if (primary.action === 'active-party') {
          onActiveParty();
        } else if (primary.action === 'recruit') {
          openPartyCreate(primary.eventId);
        } else if (primary.action === 'private-party') {
          router.push({ pathname: '/party-form', params: { friendId: primary.userId } });
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

// The zoom control gives way to a card at the bottom, the shuttle's notice, the open 편의기능 stack and the answer frame.
function zoomShown({ bottomCard, notice }: Taken, stackOpen: boolean, framed: boolean): boolean {
  return !bottomCard && notice === null && !stackOpen && !framed;
}

// The lists give way to a 식당's card at the top and to the answer frame.
function listsHidden({ topCard }: Taken, { framed }: ChatSheetControl): boolean {
  return topCard || framed;
}

function ignorePress(): void {
  // While the answer frame is shown, a marker opens no card.
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

// A press on the map: the tutorial place pin takes its own first; any other goes to the map's things, where merged
// study pins zoom in.
function pressWithPin(pin: TutorialPin, onThing: (id: string) => void): (id: string) => void {
  return (id) => {
    if (id === TUTORIAL_PIN_ID) {
      pin.press(id);
    } else {
      onThing(id);
    }
  };
}

interface MainMapViewProps {
  map: MainMap;
  me: Me;
  things: Things;
  lines: readonly MapLine[];
  room: Room;
  // The tutorial place pin, whose marker the map draws over the things'.
  pin: TutorialPin;
  // What a press on a marker does: the tutorial pin's press for its own marker, else the things'.
  onPress: (id: string) => void;
}

// The map with the things of the cards, the tutorial place pin, the User's own Avatar and the lines. Its credit opens
// the sources of its data. The View around it watches its touches for a tap, which removes the pin.
function MainMapView({ map, me, things, lines, room, pin, onPress }: MainMapViewProps): ReactElement {
  return (
    <View style={styles.map} testID="main-map-touches" {...pin.touches}>
      <Map
        avatars={[...things.avatars, ...me.avatars]}
        {...CAMPUS_CAMERA}
        inset={mapInset(room.cardHeight, room.tutorialStart, room.answerHeight)}
        markers={[...things.markers, ...pin.markers]}
        onCameraIdle={map.onCameraIdle}
        onCreditPress={() => {
          router.push('/map-sources');
        }}
        onFitZoom={map.onFitZoom}
        onPress={onPress}
        lines={lines}
        ref={map.ref}
      />
    </View>
  );
}

// The shuttle's line under the walking route.
function useLines(shuttle: ShuttleLayer, route: MainRoute): readonly MapLine[] {
  return useMemo(() => [...shuttle.lines, ...(route.line === null ? [] : [route.line])], [shuttle.lines, route.line]);
}

// The friend list and the Quest list, which give way to a card at the top.
function Lists({ hidden, map, room, selection, tutorial }: { hidden: boolean } & ListProps): ReactElement {
  return (
    <View style={[styles.lists, hidden && styles.hidden]}>
      <FriendList map={map} room={room} selection={selection} />
      <QuestList
        map={map}
        onTutorial={tutorial.openSheet}
        room={room}
        selection={selection}
        tutorial={tutorial.tutorial}
      />
    </View>
  );
}

// A tutorial quest pressed on the Quest list on the whole screen comes back by the main screen's address,
// `/main?tutorial=…`, and opens its sheet here.
function useAskedTutorialQuest(openSheet: (key: string) => void): void {
  const { tutorial } = useLocalSearchParams<{ tutorial?: string }>();
  useEffect(() => {
    if (tutorial !== undefined) {
      router.setParams({ tutorial: undefined });
      openSheet(tutorial);
    }
  }, [tutorial, openSheet]);
}

// The 새내기 튜토리얼 over the main screen, whether its start button shows (not while a card is open), and the pin
// of its 지도에서 보기.
function useMainTutorial(
  selection: Selection,
  cards: readonly CardView[],
  map: MainMap,
): { tutorial: TutorialFlow; start: boolean; pin: TutorialPin } {
  const tutorial = useTutorialFlow();
  useAskedTutorialQuest(tutorial.openSheet);
  const pin = useTutorialPin({ cards, selection, goTo: map.goTo, tutorialState: tutorial.tutorial?.state });
  return { tutorial, start: showsStartButton(tutorial.tutorial) && selection.selected === null, pin };
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
// itself to the screen takes `room`: the stage's size and the open card's height. While the answer frame is shown,
// the lists, the zoom control and the selected thing's card give way, and a press on a marker does nothing.
export function MainScreen(): ReactElement {
  const inFront = useIsFocused();
  const map = useMainMap();
  const me = useMe(map);
  const { stack, shuttle, cards, ready, chat } = useMainLayers(inFront, map, me.position);
  const selection = useSelection(cards, inFront);
  const things = useThings(cards, map.detail, selection.selected?.id ?? null);
  const route = useRoute(map, me);
  const lines = useLines(shuttle, route);
  const party = useActivePartyRoom();
  useAskedByAddress(ready ? cards : null, map, selection);
  const taken = takenBy(selection.selected, shuttle.serviceHours);
  const { tutorial, start, pin } = useMainTutorial(selection, cards, map);
  const { room, setStage, setCardHeight, heights } = useRoom(taken, start, chat.framed);
  const onPress = chat.framed ? ignorePress : pressWithPin(pin, pressOnMap(cards, map, selection));
  return (
    <View style={styles.screen}>
      <View style={styles.stage}>
        <MainMapView lines={lines} map={map} me={me} onPress={onPress} pin={pin} room={room} things={things} />
        <OverMap onStage={setStage}>
          <Lists hidden={listsHidden(taken, chat)} map={map} room={room} selection={selection} tutorial={tutorial} />
          {zoomShown(taken, stack.open, chat.framed) ? <MainZoomControl map={map} me={me} /> : null}
          <SelectedCard
            chat={chat}
            map={map}
            onActiveParty={party.open}
            onHeight={setCardHeight}
            route={route}
            selection={selection}
            shuttleLine={shuttle.line}
            top={taken.topCard}
          />
          <MapBottom
            {...heights}
            chat={chat}
            onParty={party.open}
            onShowOnMap={pin.showOnMap}
            room={room}
            stack={stack}
            taken={taken}
            tutorial={tutorial}
          />
        </OverMap>
      </View>
      {party.sheet}
      <LocationExplanation blocked={me.blocked} onAllow={me.allow} onLater={me.later} visible={me.explaining} />
      <RoomRequestInbox />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface },
  // The map and what floats over it. It ends at the navigation's top, so that the map's credit stays uncovered.
  stage: { flex: 1 },
  map: { flex: 1 },
  overMap: { position: 'absolute', right: 0, bottom: 0, left: 0, pointerEvents: 'box-none' },
  lists: { ...StyleSheet.absoluteFill, pointerEvents: 'box-none' },
  hidden: { display: 'none' },
});
