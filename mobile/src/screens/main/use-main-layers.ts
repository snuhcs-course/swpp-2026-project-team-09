/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-17  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { questInvitationsQuery } from '@/api/queries';
import { type MadeQuestView, useMadeQuests } from '@/features/assistant/use-made-quests';
import { useDiningCards } from '@/features/dining/use-dining';
import type { CardView } from '@/features/map/adapter';
import { clusteredEvents, eventMerges } from '@/features/map/event-merges';
import { invitationCards } from '@/features/map/invitation-cards';
import { besideFlags, madeQuestCards } from '@/features/map/made-quest-cards';
import { groupedByPlace } from '@/features/map/place-groups';
import { useMapCards } from '@/features/map/use-map-cards';
import { type ShuttleLayer, useShuttle } from '@/features/shuttle/use-shuttle';
import { clusteredStudy, studyMerges } from '@/features/study/adapter';
import { useStudyCards } from '@/features/study/use-study';
import { type ChatSheetControl, useChatSheet } from './chat-sheet';
import { type CameraBack, useCameraBack } from './use-camera-back';
import { type LayerStack, useLayerStack } from './layers';
import { ROUTE_PADDING } from './layout';
import type { MainMap } from './use-main-map';
import type { Me } from './use-me';
import { type MainRoute, useRoute } from './use-route';
import type { Selection } from './use-selection';

const NO_CARDS: readonly CardView[] = [];

// The zoom at which overlapping study pins and events' pins merge: the camera's while the whole campus is in view, else
// none.
function overviewZoom(map: MainMap): number | null {
  return map.detail === 'overview' ? (map.camera?.zoom ?? map.fitZoom) : null;
}

// The cards of the invitations the User received, and whether they are known.
export function useInvitationCards(): { cards: readonly CardView[]; known: boolean } {
  const { data, isPending } = useQuery(questInvitationsQuery);
  const cards = useMemo(() => (data === undefined ? NO_CARDS : invitationCards(data)), [data]);
  return { cards, known: !isPending };
}

// The map's cards, and the 식당, shuttle and 공부공간 layers' while they are on, with the things at one place
// grouped: a layer turned off takes its things out of the groups. While the whole campus is in view, study pins that
// would overlap merge, and so do events' pins. The received invitations' cards, the flags of the Quests made from a Plan, and those Quests' own
// cards within their flags stand apart from the groups. `ready` once the map's own cards and the invitations are known.
function useCards(
  layers: { dining: boolean; study: boolean },
  shuttle: ShuttleLayer,
  zoom: number | null,
  made: readonly MadeQuestView[],
): { cards: readonly CardView[]; ready: boolean } {
  const { data } = useMapCards();
  const flags = useMemo(() => madeQuestCards(made), [made]);
  const { rest, flagged } = useMemo(() => besideFlags(data ?? NO_CARDS, made), [data, made]);
  const diningCards = useDiningCards(layers.dining);
  const studyCards = useStudyCards(layers.study);
  const grouped = useMemo(
    () => groupedByPlace([...rest, ...diningCards, ...studyCards, ...shuttle.cards]),
    [rest, diningCards, studyCards, shuttle.cards],
  );
  // Keyed by what merges, not by the zoom: a camera that moves, as a press on a list's row makes it, keeps the same
  // cards unless the merged pins change. A selection waiting for the cards (`selectOrWait`) waits for new cards.
  const merges = studyMerges(grouped, zoom);
  const eventSets = eventMerges(grouped, zoom);
  const mergesKey = JSON.stringify([merges, eventSets]);
  // `mergesKey` stands for `merges` and `eventSets`, which are new each render.
  const clustered = useMemo(() => clusteredEvents(clusteredStudy(grouped, merges), eventSets), [grouped, mergesKey]);
  const invitations = useInvitationCards();
  const cards = useMemo(
    () => [...clustered, ...flags, ...flagged, ...invitations.cards],
    [clustered, flags, flagged, invitations.cards],
  );
  return { cards, ready: data !== undefined && invitations.known };
}

// A press on the map: merged study or events' pins come into view, a booking party's flag opens its answer again by the
// party's address (P10 ticket 13), and anything else is selected.
export function pressOnMap(cards: readonly CardView[], map: MainMap, selection: Selection): (id: string) => void {
  return (id) => {
    const pressed = cards.find((card) => card.id === id);
    const cluster = pressed?.cluster;
    if (pressed?.request !== undefined) {
      router.setParams({ card: id });
    } else if (cluster === undefined) {
      selection.select(id);
    } else {
      map.fitTo(cluster, ROUTE_PADDING);
    }
  };
}

// Sends the words, as the User would.
export function askAssistant(chat: ChatSheetControl): (words: string) => void {
  return (words) => {
    chat.chat.send(words);
  };
}

export interface MainLayers {
  stack: LayerStack;
  shuttle: ShuttleLayer;
  cards: readonly CardView[];
  ready: boolean;
  chat: ChatSheetControl;
  // The Quests made from a Plan.
  made: readonly MadeQuestView[];
  // The main screen's one route, whose guidance a Lookup's "길 안내" starts too.
  route: MainRoute;
  // The everyday camera the answer frame's own way out goes back to (`useReturnedCamera`).
  back: CameraBack;
}

// The 편의기능 stack and what its layers put on the map, with the map's own cards, and the conversation, which turns a
// layer on from a map button and which a card's button may ask, and the main screen's route. The Assistant is told
// where the User is (`me`), and a Lookup's "길 안내" starts the route's guidance. The frame's own way out brings the
// camera back (`useCameraBack`).
export function useMainLayers(inFront: boolean, map: MainMap, me: Me): MainLayers {
  const stack = useLayerStack(inFront);
  const shuttle = useShuttle(stack.layers.shuttle);
  const made = useMadeQuests();
  const { cards, ready } = useCards(stack.layers, shuttle, overviewZoom(map), made);
  const route = useRoute(map, me);
  const { chat, back } = useCameraBack(useChatSheet(stack.turnOn, me, route.routeTo), map.camera);
  return { stack, shuttle, cards, ready, chat, made, route, back };
}
