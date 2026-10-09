/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-09  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { ApiError } from '@/api/errors';
import type { Person, Quest, SubQuest } from '@/api/types';
import type { Meetup, MeetupProposal, Meetups } from '@/api/waiting-types';
import { now } from '@/clock';
import { ME } from './data/frame';
import { PLACES } from './data/places';
import { MEETUPS } from './data/waiting';
import { mockFriendships } from './friendships';

// The Meetups of the mock, kept in memory while the app runs and refused as the main server refuses
// (`main-server/README.md`, "Meetup"). Accepting one makes the Shared Quest that both Friends hold.

interface State {
  meetups: Meetup[];
  quests: Quest[];
  byKey: Map<string, Meetup>;
  made: number;
}

let state: State;

export function resetMockMeetups(): void {
  state = { meetups: [...MEETUPS.received, ...MEETUPS.sent], quests: [], byKey: new Map(), made: 0 };
}

resetMockMeetups();

// A proposed Meetup whose start has passed reads as expired, and nothing is written.
function asRead(meetup: Meetup): Meetup {
  return meetup.state === 'proposed' && Date.parse(meetup.startsAt) <= now().getTime()
    ? { ...meetup, state: 'expired' }
    : meetup;
}

function placeOf({ place }: MeetupProposal): Meetup['place'] {
  if ('placeId' in place) {
    const found = PLACES.find(({ id }) => id === place.placeId);
    if (found === undefined) {
      throw new ApiError(404, 'PLACE_NOT_FOUND');
    }
    return { placeId: found.id, label: found.name, latitude: found.latitude, longitude: found.longitude };
  }
  return { placeId: null, ...place };
}

function propose(proposal: MeetupProposal, key: string): Meetup {
  const kept = state.byKey.get(key);
  if (kept !== undefined) {
    return kept;
  }
  const friend = mockFriendships.listFriends().find(({ id }) => id === proposal.receiverId);
  if (friend === undefined) {
    throw new ApiError(404, 'FRIEND_NOT_FOUND');
  }
  if (Date.parse(proposal.startsAt) <= now().getTime()) {
    throw new ApiError(400, 'MEETUP_START_PASSED');
  }
  state.made += 1;
  const meetup: Meetup = {
    id: `meetup-${state.made}`,
    title: proposal.title,
    startsAt: proposal.startsAt,
    endsAt: proposal.endsAt ?? null,
    place: placeOf(proposal),
    state: 'proposed',
    proposer: { ...ME },
    receiver: { id: friend.id, name: friend.name, department: friend.department },
  };
  state.meetups = [meetup, ...state.meetups];
  state.byKey.set(key, meetup);
  return meetup;
}

function sharedQuestOf(meetup: Meetup): Quest {
  const questId = `quest-${meetup.id}`;
  const step: SubQuest = {
    id: `${questId}-1`,
    attending: false,
    title: meetup.title,
    startsAt: meetup.startsAt,
    endsAt: meetup.endsAt,
    place: meetup.place,
    completion: meetup.endsAt === null ? 'by_hand' : 'by_time',
    cancelled: false,
    done: false,
    ended: false,
  };
  const holders: Person[] = [meetup.proposer, meetup.receiver];
  return {
    id: questId,
    title: meetup.title,
    globalEvent: null,
    leader: meetup.proposer,
    capacity: 4,
    joinPolicy: 'closed',
    holders,
    subQuests: [step],
    classQuest: false,
    waitingJoinRequests: 0,
    board: null,
    description: '',
    createdAt: now().toISOString(),
  };
}

// Answers a Meetup proposed to the User (`accept`, `decline`) or one the User proposed (`withdraw`), while proposed.
function settle(meetupId: string, answer: 'accepted' | 'declined' | 'withdrawn'): void {
  const mine = answer === 'withdrawn' ? 'proposer' : 'receiver';
  const meetup = state.meetups.find(({ id, [mine]: person }) => id === meetupId && person.id === ME.id);
  if (meetup === undefined) {
    throw new ApiError(404, 'MEETUP_NOT_FOUND');
  }
  if (asRead(meetup).state !== 'proposed') {
    throw new ApiError(409, 'MEETUP_NOT_PROPOSED');
  }
  const settled = { ...meetup, state: answer };
  state.meetups = state.meetups.map((held) => (held.id === meetupId ? settled : held));
  if (answer === 'accepted') {
    state.quests = [...state.quests, sharedQuestOf(settled)];
  }
}

export const mockMeetups = {
  listMeetups: (): Meetups => {
    const read = state.meetups.map(asRead);
    return {
      received: read.filter(({ receiver }) => receiver.id === ME.id),
      sent: read.filter(({ proposer }) => proposer.id === ME.id),
    };
  },
  propose,
  accept: (meetupId: string): void => {
    settle(meetupId, 'accepted');
  },
  decline: (meetupId: string): void => {
    settle(meetupId, 'declined');
  },
  withdraw: (meetupId: string): void => {
    settle(meetupId, 'withdrawn');
  },
  // The Shared Quests of the accepted Meetups.
  sharedQuests: (): Quest[] => state.quests,
};
