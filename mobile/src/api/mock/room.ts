import type { ApiClient } from '@/api/client';
import { ApiError } from '@/api/errors';
import type { PlaceAt, SubQuestContent } from '@/api/room-types';
import type { LatLng, SubQuest } from '@/api/types';
import { answer } from './answer';
import { ME } from './data/frame';
import { MY_PARTY, QUESTS } from './data/quests';
import { PLACES } from './data/places';
import { mockMeetups } from './meetups';

// The room's operations as the main server answers them. The mock keeps no change: the next read is the frame's again.

const INSIDE_METRES = 60;
const NEAR_METRES = 400;
const METRES_PER_DEGREE = 111_000;

function metresBetween(one: LatLng, other: LatLng): number {
  const across = (one.longitude - other.longitude) * Math.cos((one.latitude * Math.PI) / 180);
  return Math.hypot(one.latitude - other.latitude, across) * METRES_PER_DEGREE;
}

function placeAt(position: LatLng): PlaceAt {
  const [nearest] = PLACES.toSorted((one, other) => metresBetween(position, one) - metresBetween(position, other));
  if (nearest === undefined || metresBetween(position, nearest) > NEAR_METRES) {
    return { place: null, relation: 'none' };
  }
  return { place: nearest, relation: metresBetween(position, nearest) <= INSIDE_METRES ? 'inside' : 'near' };
}

function subQuestOf(content: SubQuestContent): SubQuest {
  const place = content.place;
  const named = place !== undefined && 'placeId' in place ? PLACES.find(({ id }) => id === place.placeId) : undefined;
  return {
    id: `sub-quest-${content.startsAt}`,
    attending: false,
    title: content.title,
    startsAt: content.startsAt,
    endsAt: null,
    place:
      named === undefined
        ? place === undefined || 'placeId' in place
          ? null
          : { placeId: null, ...place }
        : { placeId: named.id, label: named.name, latitude: named.latitude, longitude: named.longitude },
    completion: 'by_hand',
    cancelled: false,
    done: false,
    ended: false,
  };
}

async function nothing(operation: keyof ApiClient): Promise<void> {
  await answer(operation, () => null);
}

type MockRoom = Pick<
  ApiClient,
  | 'getQuest'
  | 'dropQuest'
  | 'addSubQuest'
  | 'editSubQuest'
  | 'cancelSubQuest'
  | 'markSubQuestDone'
  | 'handOverQuest'
  | 'removeHolder'
  | 'endQuest'
  | 'acceptJoinRequest'
  | 'declineJoinRequest'
  | 'listSentInvitations'
  | 'cancelInvitation'
  | 'openParty'
  | 'joinParty'
  | 'leaveParty'
  | 'setPartySharing'
  | 'removePartyMember'
  | 'endParty'
  | 'findPlaceAt'
>;

export const mockRoom: MockRoom = {
  getQuest: (questId) =>
    answer('getQuest', () => {
      const quest = [...QUESTS, ...mockMeetups.sharedQuests()].find(({ id }) => id === questId);
      if (quest === undefined) {
        throw new ApiError(404, 'QUEST_NOT_FOUND');
      }
      return quest;
    }),
  dropQuest: () => nothing('dropQuest'),
  addSubQuest: (_questId, content) => answer('addSubQuest', () => subQuestOf(content)),
  editSubQuest: (_questId, _subQuestId, content) => answer('editSubQuest', () => subQuestOf(content)),
  cancelSubQuest: () => nothing('cancelSubQuest'),
  markSubQuestDone: () => nothing('markSubQuestDone'),
  handOverQuest: () => nothing('handOverQuest'),
  removeHolder: () => nothing('removeHolder'),
  endQuest: () => nothing('endQuest'),
  acceptJoinRequest: () => nothing('acceptJoinRequest'),
  declineJoinRequest: () => nothing('declineJoinRequest'),
  // The mock leads no Quest, so it invited nobody.
  listSentInvitations: () => answer('listSentInvitations', () => [], []),
  cancelInvitation: () => nothing('cancelInvitation'),
  openParty: ({ title, capacity, joinPolicy, questId }) =>
    answer('openParty', () => {
      const quest = QUESTS.find(({ id }) => id === questId);
      return {
        id: `party-${questId}`,
        title,
        capacity,
        joinPolicy,
        quest: { id: questId, title: quest?.title ?? title, globalEvent: quest?.globalEvent ?? null },
        sharing: true,
        members: [{ ...ME, leader: true, visible: true }],
      };
    }),
  joinParty: () => answer('joinParty', () => MY_PARTY),
  leaveParty: () => nothing('leaveParty'),
  setPartySharing: () => nothing('setPartySharing'),
  removePartyMember: () => nothing('removePartyMember'),
  endParty: () => nothing('endParty'),
  findPlaceAt: (position) => answer('findPlaceAt', () => placeAt(position)),
};
