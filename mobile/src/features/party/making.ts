import type { QuestChange, QuestMaking } from '@/api/party-types';
import type { SubQuestPlace } from '@/api/room-types';
import type { Board, Quest } from '@/api/types';

// What 파티 만들기 sends: a new Quest, or the change to one, from what the form holds.

export type Visibility = 'public' | 'private';

export interface PartyForm {
  title: string;
  description: string;
  // 2 to 8: the main server's limit.
  capacity: number;
  visibility: Visibility;
  // Under 공개: `바로 참여` or `승인 후 참여`.
  policy: 'open' | 'approval';
  board: Board | null;
  startsAt: string | null;
  place: SubQuestPlace | undefined;
}

export const MIN_CAPACITY = 2;
export const MAX_CAPACITY = 8;
// A private Quest takes the most, so that its Leader can invite more Friends later.
export const PRIVATE_CAPACITY = 8;

export function emptyForm(): PartyForm {
  return {
    title: '',
    description: '',
    capacity: 4,
    visibility: 'public',
    policy: 'open',
    board: null,
    startsAt: null,
    place: undefined,
  };
}

// The form of a Quest the Leader edits.
export function formOf(quest: Quest): PartyForm {
  const closed = quest.joinPolicy === 'closed';
  return {
    ...emptyForm(),
    title: quest.title,
    description: quest.description,
    capacity: Math.min(Math.max(quest.capacity, MIN_CAPACITY), MAX_CAPACITY),
    visibility: closed ? 'private' : 'public',
    policy: quest.joinPolicy === 'approval' ? 'approval' : 'open',
    board: quest.board,
  };
}

// 파티 올리기 waits for a title, a description and a board; 파티 만들기 for a title and a Friend; 수정 완료 as the
// first for a public Quest and for a title for a private one.
export function isReady(form: PartyForm, friends: number, editing: boolean): boolean {
  if (form.title.trim() === '') {
    return false;
  }
  if (form.visibility === 'private') {
    return editing || friends > 0;
  }
  return form.description.trim() !== '' && form.board !== null;
}

export function makingOf(form: PartyForm): QuestMaking {
  const title = form.title.trim();
  const subQuest = {
    title,
    ...(form.startsAt === null ? {} : { startsAt: form.startsAt }),
    ...(form.place === undefined ? {} : { place: form.place }),
  };
  const description = form.description.trim();
  if (form.visibility === 'private') {
    return { title, description, capacity: PRIVATE_CAPACITY, joinPolicy: 'closed', subQuest };
  }
  return {
    title,
    description,
    capacity: form.capacity,
    joinPolicy: form.policy,
    ...(form.board === null ? {} : { board: form.board }),
    subQuest,
  };
}

// What changed against the Quest: PATCH sends only that.
export function changeOf(quest: Quest, form: PartyForm): QuestChange {
  const wanted = makingOf(form);
  const change: QuestChange = {};
  if (wanted.title !== quest.title) {
    change.title = wanted.title;
  }
  if (wanted.description !== quest.description) {
    change.description = wanted.description;
  }
  if (wanted.joinPolicy !== quest.joinPolicy) {
    change.joinPolicy = wanted.joinPolicy;
  }
  if (form.visibility === 'public') {
    if (wanted.capacity !== quest.capacity) {
      change.capacity = wanted.capacity;
    }
    if (wanted.board !== undefined && wanted.board !== quest.board) {
      change.board = wanted.board;
    }
  }
  return change;
}

// How many Friends may be invited: the free places, all of a private Quest's.
export function invitable(form: PartyForm, holders: number): number {
  return Math.max((form.visibility === 'private' ? PRIVATE_CAPACITY : form.capacity) - holders, 0);
}
